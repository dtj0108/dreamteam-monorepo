/**
 * Messaging MCP Tool
 *
 * Manages workspace messaging: channels, messages, and DMs
 */

import { z } from "zod"
import type { MCPToolContext, MCPToolResponse } from "../types"
import { formatActionableError, truncateText } from "../types"

// ============================================================================
// SCHEMA
// ============================================================================

export const messagingSchema = z.object({
  entity: z.enum(["channels", "messages", "dms"]).describe("The entity to operate on"),
  action: z.enum(["query", "create", "send", "update", "markRead"]).describe("The action to perform"),
  responseFormat: z.enum(["concise", "detailed"]).default("concise"),

  // Channel params
  channelId: z.string().optional().describe("Channel ID for operations"),
  channelName: z.string().optional().describe("Name for new channel"),
  isPrivate: z.boolean().optional().default(false).describe("Whether channel is private"),
  description: z.string().optional().describe("Channel description"),

  // Message params
  content: z.string().optional().describe("Message content to send"),
  parentId: z.string().optional().describe("Parent message ID for thread replies"),
  limit: z.number().optional().default(50).describe("Max messages to fetch"),
  before: z.string().optional().describe("Cursor for pagination (created_at timestamp)"),

  // DM params
  participantId: z.string().optional().describe("Profile ID of DM participant"),
  dmConversationId: z.string().optional().describe("DM conversation ID"),
})

type MessagingInput = z.infer<typeof messagingSchema>

// ============================================================================
// EXECUTE
// ============================================================================

export async function executeMessaging(
  input: MessagingInput,
  context: MCPToolContext
): Promise<MCPToolResponse> {
  const { supabase, userId, workspaceId } = context
  const { entity, action, responseFormat } = input

  if (!workspaceId) {
    return { success: false, error: "Workspace context is required for messaging operations." }
  }

  try {
    // ========================================================================
    // CHANNELS
    // ========================================================================
    if (entity === "channels") {
      // QUERY channels
      if (action === "query") {
        const { data: channels, error } = await supabase
          .from("channels")
          .select(`
            id, name, description, is_private, created_at,
            channel_members!inner(last_read_at, profile_id)
          `)
          .eq("workspace_id", workspaceId)
          .eq("is_archived", false)
          .eq("channel_members.profile_id", userId)
          .order("created_at", { ascending: true })

        if (error) throw new Error(error.message)

        // Calculate unread counts
        const channelsWithUnread = await Promise.all(
          (channels || []).map(async (channel: any) => {
            const lastReadAt = channel.channel_members?.[0]?.last_read_at

            let unreadCount = 0
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("channel_id", channel.id)
              .eq("is_deleted", false)
              .gt("created_at", lastReadAt || "1970-01-01")
              .neq("sender_id", userId)

            unreadCount = count || 0

            return {
              id: channel.id,
              name: channel.name,
              description: channel.description,
              isPrivate: channel.is_private,
              unreadCount,
            }
          })
        )

        if (responseFormat === "concise") {
          const lines = channelsWithUnread.map(
            (c) => `#${c.name}${c.unreadCount > 0 ? ` (${c.unreadCount} unread)` : ""}`
          )
          return {
            success: true,
            data: {
              summary: `${channelsWithUnread.length} channels`,
              channels: lines.join("\n"),
            },
          }
        }

        return { success: true, data: { channels: channelsWithUnread } }
      }

      // CREATE channel
      if (action === "create") {
        const { channelName, description, isPrivate } = input
        if (!channelName) {
          return { success: false, error: "channelName is required to create a channel." }
        }

        const { data: channel, error } = await supabase
          .from("channels")
          .insert({
            workspace_id: workspaceId,
            name: channelName.toLowerCase().replace(/\s+/g, "-"),
            description: description || null,
            is_private: isPrivate || false,
            created_by: userId,
          })
          .select()
          .single()

        if (error) {
          if (error.code === "23505") {
            return { success: false, error: "A channel with this name already exists." }
          }
          throw new Error(error.message)
        }

        // Add creator as member
        await supabase.from("channel_members").insert({
          channel_id: channel.id,
          profile_id: userId,
        })

        return {
          success: true,
          data: { message: `Channel #${channel.name} created.`, id: channel.id },
        }
      }

      // MARK READ
      if (action === "markRead") {
        const { channelId } = input
        if (!channelId) {
          return { success: false, error: "channelId is required to mark as read." }
        }

        await supabase
          .from("channel_members")
          .update({ last_read_at: new Date().toISOString() })
          .eq("channel_id", channelId)
          .eq("profile_id", userId)

        return { success: true, data: { message: "Channel marked as read." } }
      }
    }

    // ========================================================================
    // MESSAGES
    // ========================================================================
    if (entity === "messages") {
      // QUERY messages
      if (action === "query") {
        const { channelId, dmConversationId, parentId, limit = 50, before } = input

        if (!channelId && !dmConversationId) {
          return { success: false, error: "channelId or dmConversationId is required." }
        }

        let query = supabase
          .from("messages")
          .select(`
            id, content, created_at, is_edited,
            sender:sender_id(id, name, avatar_url)
          `)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(limit)

        if (channelId) {
          query = query.eq("channel_id", channelId)
        } else if (dmConversationId) {
          query = query.eq("dm_conversation_id", dmConversationId)
        }

        if (parentId) {
          query = query.eq("parent_id", parentId)
        } else {
          query = query.is("parent_id", null)
        }

        if (before) {
          query = query.lt("created_at", before)
        }

        const { data: messages, error } = await query

        if (error) throw new Error(error.message)

        const formatted = (messages || []).reverse().map((m: any) => ({
          id: m.id,
          content: m.content,
          sender: m.sender?.name || "Unknown",
          time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          edited: m.is_edited,
        }))

        if (responseFormat === "concise") {
          const lines = formatted.map((m) => `[${m.time}] ${m.sender}: ${truncateText(m.content, 80)}`)
          return {
            success: true,
            data: {
              summary: `${formatted.length} messages`,
              messages: lines.join("\n"),
              hasMore: messages?.length === limit,
            },
          }
        }

        return {
          success: true,
          data: { messages: formatted, hasMore: messages?.length === limit },
        }
      }

      // SEND message
      if (action === "send") {
        const { channelId, dmConversationId, parentId, content } = input

        if (!content) {
          return { success: false, error: "content is required to send a message." }
        }

        if (!channelId && !dmConversationId) {
          return { success: false, error: "channelId or dmConversationId is required." }
        }

        const { data: message, error } = await supabase
          .from("messages")
          .insert({
            workspace_id: workspaceId,
            channel_id: channelId || null,
            dm_conversation_id: dmConversationId || null,
            parent_id: parentId || null,
            sender_id: userId,
            content: content.trim(),
          })
          .select()
          .single()

        if (error) throw new Error(error.message)

        return {
          success: true,
          data: { message: "Message sent.", id: message.id },
        }
      }

      // UPDATE message
      if (action === "update") {
        const { content } = input
        const messageId = input.parentId // Reuse parentId field for message ID

        if (!messageId || !content) {
          return { success: false, error: "Message ID (parentId) and content are required." }
        }

        const { error } = await supabase
          .from("messages")
          .update({ content: content.trim(), is_edited: true, edited_at: new Date().toISOString() })
          .eq("id", messageId)
          .eq("sender_id", userId) // Can only edit own messages

        if (error) throw new Error(error.message)

        return { success: true, data: { message: "Message updated." } }
      }
    }

    // ========================================================================
    // DMs
    // ========================================================================
    if (entity === "dms") {
      // QUERY DM conversations
      if (action === "query") {
        const { data: conversations, error } = await supabase
          .from("dm_conversations")
          .select(`
            id,
            dm_participants!inner(
              profile_id,
              last_read_at,
              profile:profile_id(id, name, avatar_url)
            )
          `)
          .eq("workspace_id", workspaceId)

        if (error) throw new Error(error.message)

        // Filter to conversations where user is a participant
        const userConversations = (conversations || []).filter((c: any) =>
          c.dm_participants.some((p: any) => p.profile_id === userId)
        )

        const formatted = userConversations.map((c: any) => {
          const otherParticipant = c.dm_participants.find((p: any) => p.profile_id !== userId)
          return {
            id: c.id,
            participantName: otherParticipant?.profile?.name || "Unknown",
            participantId: otherParticipant?.profile_id,
          }
        })

        if (responseFormat === "concise") {
          const lines = formatted.map((c) => `DM with ${c.participantName}`)
          return {
            success: true,
            data: {
              summary: `${formatted.length} DM conversations`,
              conversations: lines.join("\n"),
            },
          }
        }

        return { success: true, data: { conversations: formatted } }
      }

      // CREATE DM conversation
      if (action === "create") {
        const { participantId } = input
        if (!participantId) {
          return { success: false, error: "participantId is required to start a DM." }
        }

        // Check if DM already exists
        const { data: existing } = await supabase
          .from("dm_conversations")
          .select(`
            id,
            dm_participants!inner(profile_id)
          `)
          .eq("workspace_id", workspaceId)

        const existingDm = (existing || []).find((c: any) => {
          const participantIds = c.dm_participants.map((p: any) => p.profile_id)
          return participantIds.includes(userId) && participantIds.includes(participantId)
        })

        if (existingDm) {
          return {
            success: true,
            data: { message: "DM conversation already exists.", id: existingDm.id },
          }
        }

        // Create new DM conversation
        const { data: conversation, error: convError } = await supabase
          .from("dm_conversations")
          .insert({ workspace_id: workspaceId })
          .select()
          .single()

        if (convError) throw new Error(convError.message)

        // Add both participants
        await supabase.from("dm_participants").insert([
          { conversation_id: conversation.id, profile_id: userId },
          { conversation_id: conversation.id, profile_id: participantId },
        ])

        return {
          success: true,
          data: { message: "DM conversation started.", id: conversation.id },
        }
      }
    }

    return { success: false, error: `Unknown entity/action: ${entity}.${action}` }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const messagingToolDefinition = {
  name: "manageMessaging",
  description:
    "Manage workspace messaging. Query channels and unread counts, send messages, read message history, and manage DM conversations.",
  schema: messagingSchema,
  execute: executeMessaging,
}

export type MessagingToolName = "manageMessaging"

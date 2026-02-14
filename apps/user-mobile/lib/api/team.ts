import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

import { supabase } from "../supabase";
import { del, get, post, put } from "../api";
import {
  Channel,
  ChannelWithMembership,
  ChannelsResponse,
  ChannelResponse,
  ChannelsQueryParams,
  CreateChannelInput,
  UpdateChannelInput,
  Message,
  MessagesResponse,
  MessagesQueryParams,
  SendMessageInput,
  ThreadResponse,
  DirectMessageConversation,
  DMConversationsResponse,
  CreateDMInput,
  UserPresence,
  UpdatePresenceInput,
  Mention,
  MentionsResponse,
  SearchResponse,
  SearchFilters,
  Agent,
  AgentsResponse,
  AgentConversation,
  WorkspaceMember,
  WorkspaceMembersResponse,
  UploadResponse,
} from "../types/team";

const WORKSPACE_ID_KEY = "currentWorkspaceId";

function isMissingColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "42703" &&
    typeof maybeError.message === "string" &&
    maybeError.message.includes(columnName)
  );
}

function getApiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (parsed.hostname === "dreamteam.ai") {
      parsed.hostname = "www.dreamteam.ai";
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

// Helper to get current workspace ID
async function getWorkspaceId(): Promise<string> {
  const workspaceId = await AsyncStorage.getItem(WORKSPACE_ID_KEY);
  if (!workspaceId) {
    throw new Error("No workspace selected");
  }
  return workspaceId;
}

// Helper to get current user ID
async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

// Helper to determine attachment type from mime type
function getAttachmentTypeFromMime(mimeType: string | null): "image" | "document" | "video" | "audio" | "file" {
  if (!mimeType) return "file";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "document";
  return "file";
}

// Helper to transform message_attachments from DB to Attachment interface
function transformMessageAttachments(message: any): Message {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  const attachments = (message.message_attachments || []).map((att: any) => {
    // Construct public URL from storage_path (bucket is now public)
    let url = att.file_url || "";
    if (att.storage_path && supabaseUrl) {
      url = `${supabaseUrl}/storage/v1/object/public/workspace-files/${att.storage_path}`;
    }

    return {
      id: att.id,
      type: getAttachmentTypeFromMime(att.file_type),
      url,
      name: att.file_name,
      size: att.file_size || 0,
      mime_type: att.file_type || "",
    };
  });

  // Remove message_attachments and add attachments
  const { message_attachments, ...rest } = message;
  return { ...rest, attachments };
}

// ============================================================================
// Channels
// ============================================================================

export async function getChannels(
  params?: ChannelsQueryParams
): Promise<ChannelsResponse> {
  console.log("[Team API] getChannels via Supabase", params);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    // Build query based on params
    if (params?.joined) {
      // Get channels the user is a member of
      const { data, error } = await supabase
        .from("channel_members")
        .select(`
          notifications,
          last_read_at,
          joined_at,
          channel:channels(
            id,
            workspace_id,
            name,
            description,
            is_private,
            is_archived,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq("profile_id", userId);

      if (error) throw error;

      // Transform to ChannelWithMembership format
      const channels = (data || [])
        .filter((item: any) => item.channel && item.channel.workspace_id === workspaceId)
        .map((item: any) => ({
          ...item.channel,
          membership: {
            notifications: item.notifications,
            last_read_at: item.last_read_at,
            joined_at: item.joined_at,
          },
        })) as ChannelWithMembership[];

      console.log("[Team API] getChannels response:", channels.length, "channels");
      return { channels };
    } else {
      // Get all channels in workspace
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_archived", false);

      if (error) throw error;

      console.log("[Team API] getChannels response:", (data || []).length, "channels");
      return { channels: (data || []) as ChannelWithMembership[] };
    }
  } catch (error) {
    console.error("[Team API] getChannels ERROR:", error);
    throw error;
  }
}

export async function getChannel(id: string): Promise<ChannelResponse> {
  console.log("[Team API] getChannel via Supabase", id);
  try {
    const userId = await getCurrentUserId();

    // Get channel with membership info
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("*")
      .eq("id", id)
      .single();

    if (channelError) throw channelError;

    // Get user's membership for this channel
    const { data: membership } = await supabase
      .from("channel_members")
      .select("notifications, last_read_at, joined_at")
      .eq("channel_id", id)
      .eq("profile_id", userId)
      .single();

    // Get channel members
    const { data: membersData } = await supabase
      .from("channel_members")
      .select(`
        joined_at,
        profile:profiles(*)
      `)
      .eq("channel_id", id);

    // Transform members to WorkspaceMember format
    const members = (membersData || [])
      .filter((item: any) => item.profile)
      .map((item: any) => ({
        id: item.profile.id,
        workspace_id: channel.workspace_id,
        user_id: item.profile.id,
        role: "member" as const,
        display_name: item.profile.display_name,
        title: null,
        timezone: null,
        joined_at: item.joined_at,
        invited_by: null,
        user: {
          id: item.profile.id,
          name: item.profile.display_name || item.profile.email || "",
          email: item.profile.email || "",
          phone: null,
          avatar_url: item.profile.avatar_url,
        },
      })) as WorkspaceMember[];

    const result: ChannelResponse = {
      channel: {
        ...channel,
        membership: membership || undefined,
      } as ChannelWithMembership,
      members,
    };

    console.log("[Team API] getChannel response:", result);
    return result;
  } catch (error) {
    console.error("[Team API] getChannel ERROR:", error);
    throw error;
  }
}

export async function createChannel(
  data: CreateChannelInput
): Promise<Channel> {
  console.log("[Team API] createChannel via Supabase", data);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    // Insert the channel
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .insert({
        workspace_id: workspaceId,
        name: data.name,
        description: data.description || null,
        type: data.type,
        created_by: userId,
      })
      .select()
      .single();

    if (channelError) throw channelError;

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from("channel_members")
      .insert({
        channel_id: channel.id,
        profile_id: userId,
        role: "admin",
      });

    if (memberError) {
      console.error("[Team API] Failed to add creator as member:", memberError);
      // Don't throw - channel was created successfully
    }

    console.log("[Team API] createChannel response:", channel);
    return channel as Channel;
  } catch (error) {
    console.error("[Team API] createChannel ERROR:", error);
    throw error;
  }
}

export async function updateChannel(
  id: string,
  data: UpdateChannelInput
): Promise<Channel> {
  console.log("[Team API] updateChannel via Supabase", id, data);
  try {
    const { data: channel, error } = await supabase
      .from("channels")
      .update({
        name: data.name,
        description: data.description,
        topic: data.topic,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log("[Team API] updateChannel response:", channel);
    return channel as Channel;
  } catch (error) {
    console.error("[Team API] updateChannel ERROR:", error);
    throw error;
  }
}

export async function deleteChannel(id: string): Promise<void> {
  console.log("[Team API] deleteChannel via Supabase", id);
  try {
    // Soft delete by archiving
    const { error } = await supabase
      .from("channels")
      .update({ is_archived: true })
      .eq("id", id);

    if (error) throw error;

    console.log("[Team API] deleteChannel success");
  } catch (error) {
    console.error("[Team API] deleteChannel ERROR:", error);
    throw error;
  }
}

export async function joinChannel(id: string): Promise<void> {
  console.log("[Team API] joinChannel via Supabase", id);
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("channel_members")
      .insert({
        channel_id: id,
        profile_id: userId,
        role: "member",
      });

    if (error) throw error;

    console.log("[Team API] joinChannel success");
  } catch (error) {
    console.error("[Team API] joinChannel ERROR:", error);
    throw error;
  }
}

export async function leaveChannel(id: string): Promise<void> {
  console.log("[Team API] leaveChannel via Supabase", id);
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("channel_members")
      .delete()
      .eq("channel_id", id)
      .eq("profile_id", userId);

    if (error) throw error;

    console.log("[Team API] leaveChannel success");
  } catch (error) {
    console.error("[Team API] leaveChannel ERROR:", error);
    throw error;
  }
}

export async function starChannel(id: string): Promise<void> {
  console.log("[Team API] starChannel via Supabase", id);
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("channel_members")
      .update({ is_starred: true })
      .eq("channel_id", id)
      .eq("profile_id", userId);

    if (error) throw error;

    console.log("[Team API] starChannel success");
  } catch (error) {
    console.error("[Team API] starChannel ERROR:", error);
    throw error;
  }
}

export async function unstarChannel(id: string): Promise<void> {
  console.log("[Team API] unstarChannel via Supabase", id);
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("channel_members")
      .update({ is_starred: false })
      .eq("channel_id", id)
      .eq("profile_id", userId);

    if (error) throw error;

    console.log("[Team API] unstarChannel success");
  } catch (error) {
    console.error("[Team API] unstarChannel ERROR:", error);
    throw error;
  }
}

export async function muteChannel(id: string): Promise<void> {
  console.log("[Team API] muteChannel via Supabase", id);
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("channel_members")
      .update({ notifications: "none" })
      .eq("channel_id", id)
      .eq("profile_id", userId);

    if (error) throw error;

    console.log("[Team API] muteChannel success");
  } catch (error) {
    console.error("[Team API] muteChannel ERROR:", error);
    throw error;
  }
}

export async function unmuteChannel(id: string): Promise<void> {
  console.log("[Team API] unmuteChannel via Supabase", id);
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("channel_members")
      .update({ notifications: "all" })
      .eq("channel_id", id)
      .eq("profile_id", userId);

    if (error) throw error;

    console.log("[Team API] unmuteChannel success");
  } catch (error) {
    console.error("[Team API] unmuteChannel ERROR:", error);
    throw error;
  }
}

export async function getChannelMembers(
  id: string
): Promise<WorkspaceMembersResponse> {
  console.log("[Team API] getChannelMembers via Supabase", id);
  try {
    const { data, error } = await supabase
      .from("channel_members")
      .select(`
        joined_at,
        profile:profiles(*)
      `)
      .eq("channel_id", id);

    if (error) throw error;

    // Transform to WorkspaceMember format
    const members = (data || [])
      .filter((item: any) => item.profile)
      .map((item: any) => ({
        id: item.profile.id,
        name: item.profile.display_name || item.profile.email || item.profile.id,
        avatar_url: item.profile.avatar_url,
        email: item.profile.email,
        joined_at: item.joined_at,
      })) as unknown as WorkspaceMember[];

    console.log("[Team API] getChannelMembers response:", members.length, "members");
    return { members };
  } catch (error) {
    console.error("[Team API] getChannelMembers ERROR:", error);
    throw error;
  }
}

export async function addChannelMember(
  channelId: string,
  userId: string
): Promise<void> {
  console.log("[Team API] addChannelMember via Supabase", channelId, userId);
  try {
    const { error } = await supabase
      .from("channel_members")
      .insert({
        channel_id: channelId,
        profile_id: userId,
        role: "member",
      });

    if (error) throw error;

    console.log("[Team API] addChannelMember success");
  } catch (error) {
    console.error("[Team API] addChannelMember ERROR:", error);
    throw error;
  }
}

export async function removeChannelMember(
  channelId: string,
  userId: string
): Promise<void> {
  console.log("[Team API] removeChannelMember via Supabase", channelId, userId);
  try {
    const { error } = await supabase
      .from("channel_members")
      .delete()
      .eq("channel_id", channelId)
      .eq("profile_id", userId);

    if (error) throw error;

    console.log("[Team API] removeChannelMember success");
  } catch (error) {
    console.error("[Team API] removeChannelMember ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Messages
// ============================================================================

export async function getChannelMessages(
  channelId: string,
  params?: MessagesQueryParams
): Promise<MessagesResponse> {
  console.log("[Team API] getChannelMessages via Web API", channelId, params);
  
  // Use the web API endpoint which returns messages with fresh signed URLs
  const API_URL = getApiBaseUrl();
  
  if (API_URL) {
    try {
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = await getWorkspaceId();
      
      // Build query params
      const queryParams = new URLSearchParams();
      if (workspaceId) queryParams.append("workspaceId", workspaceId);
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.before) queryParams.append("before", params.before);
      if (params?.after) queryParams.append("after", params.after);
      
      const url = `${API_URL}/api/team/channels/${channelId}/messages?${queryParams.toString()}`;
      console.log("[Team API] Fetching channel messages from web API:", url);
      
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: session ? `Bearer ${session.access_token}` : "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("[Team API] getChannelMessages via Web API response:", data.messages?.length, "messages");
        
        // Transform the response to match our expected format
        const messages = (data.messages || []).map((msg: any) => ({
          ...msg,
          attachments: (msg.attachments || []).map((att: any) => ({
            id: att.id,
            type: getAttachmentTypeFromMime(att.mimeType || att.mime_type || ""),
            url: att.url || att.fileUrl,
            name: att.name || att.fileName,
            size: att.size || att.fileSize || 0,
            mime_type: att.mimeType || att.mime_type || "",
            thumbnail: att.thumbnail,
          })),
        }));
        
        return {
          messages,
          has_more: data.hasMore || data.has_more || false,
          next_cursor: data.nextCursor || data.next_cursor,
        };
      } else {
        console.log("[Team API] Web API failed for channel messages, status:", response.status);
      }
    } catch (apiError) {
      console.log("[Team API] Web API error for channel messages:", apiError);
    }
  }
  
  // Fallback to direct Supabase query (URLs may be expired)
  console.log("[Team API] getChannelMessages via Supabase (fallback)", channelId, params);
  try {
    const limit = params?.limit || 50;

    let query = supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!sender_id(*),
        message_attachments(*)
      `)
      .eq("channel_id", channelId)
      .is("parent_id", null) // Only get top-level messages, not thread replies
      .order("created_at", { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there's more

    if (params?.before) {
      query = query.lt("created_at", params.before);
    }
    if (params?.after) {
      query = query.gt("created_at", params.after);
    }

    const { data, error } = await query;

    if (error) throw error;

    const messages = data || [];
    const has_more = messages.length > limit;
    const resultMessages = has_more ? messages.slice(0, limit) : messages;

    // Transform to map message_attachments to attachments
    const transformedMessages = resultMessages.map(transformMessageAttachments);

    // Reverse to get chronological order (oldest first for display)
    transformedMessages.reverse();

    // After reverse, first message is oldest - use its timestamp as cursor for next page
    const next_cursor = has_more && transformedMessages.length > 0
      ? transformedMessages[0].created_at
      : undefined;

    console.log("[Team API] getChannelMessages response:", transformedMessages.length, "messages, has_more:", has_more);
    return { messages: transformedMessages, has_more, next_cursor };
  } catch (error) {
    console.error("[Team API] getChannelMessages ERROR:", error);
    throw error;
  }
}

export async function sendChannelMessage(
  channelId: string,
  data: SendMessageInput
): Promise<Message> {
  console.log("[Team API] sendChannelMessage via Supabase", channelId, data);
  try {
    const userId = await getCurrentUserId();
    const workspaceId = await getWorkspaceId();

    // Insert message (without attachments column - that's a separate table)
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        channel_id: channelId,
        sender_id: userId,
        workspace_id: workspaceId,
        content: data.content,
      })
      .select(`*, sender:profiles(*)`)
      .single();

    if (error) throw error;

    // Insert attachments into message_attachments table
    if (data.attachments && data.attachments.length > 0) {
      const attachmentRows = data.attachments.map((att) => ({
        message_id: message.id,
        file_url: att.url,
        file_name: att.name,
        file_type: att.type === "image" ? "image/jpeg" : "application/octet-stream",
        file_size: att.size,
        storage_path: att.url.split("/workspace-files/")[1] || null,
      }));

      const { error: attachError } = await supabase
        .from("message_attachments")
        .insert(attachmentRows);

      if (attachError) {
        console.error("[Team API] Failed to insert attachments:", attachError);
      }
    }

    console.log("[Team API] sendChannelMessage response:", message);
    return message as Message;
  } catch (error) {
    console.error("[Team API] sendChannelMessage ERROR:", error);
    throw error;
  }
}

export async function getMessage(id: string): Promise<Message> {
  console.log("[Team API] getMessage via Supabase", id);
  try {
    const { data: message, error } = await supabase
      .from("messages")
      .select(`*, sender:profiles(*), message_attachments(*)`)
      .eq("id", id)
      .single();

    if (error) throw error;

    const transformedMessage = transformMessageAttachments(message);
    console.log("[Team API] getMessage response:", transformedMessage);
    return transformedMessage;
  } catch (error) {
    console.error("[Team API] getMessage ERROR:", error);
    throw error;
  }
}

export async function updateMessage(
  id: string,
  content: string
): Promise<Message> {
  console.log("[Team API] updateMessage via Supabase", id, content);
  try {
    const { data: message, error } = await supabase
      .from("messages")
      .update({ content, is_edited: true })
      .eq("id", id)
      .select(`*, sender:profiles(*)`)
      .single();

    if (error) throw error;

    console.log("[Team API] updateMessage response:", message);
    return message as Message;
  } catch (error) {
    console.error("[Team API] updateMessage ERROR:", error);
    throw error;
  }
}

export async function deleteMessage(id: string): Promise<void> {
  console.log("[Team API] deleteMessage via Supabase", id);
  try {
    // Soft delete
    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    console.log("[Team API] deleteMessage success");
  } catch (error) {
    console.error("[Team API] deleteMessage ERROR:", error);
    throw error;
  }
}

export async function pinMessage(id: string): Promise<void> {
  console.log("[Team API] pinMessage via Supabase", id);
  try {
    const { error } = await supabase
      .from("messages")
      .update({ is_pinned: true })
      .eq("id", id);

    if (error) throw error;

    console.log("[Team API] pinMessage success");
  } catch (error) {
    console.error("[Team API] pinMessage ERROR:", error);
    throw error;
  }
}

export async function unpinMessage(id: string): Promise<void> {
  console.log("[Team API] unpinMessage via Supabase", id);
  try {
    const { error } = await supabase
      .from("messages")
      .update({ is_pinned: false })
      .eq("id", id);

    if (error) throw error;

    console.log("[Team API] unpinMessage success");
  } catch (error) {
    console.error("[Team API] unpinMessage ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Threads
// ============================================================================

export async function getThread(
  messageId: string,
  params?: MessagesQueryParams
): Promise<ThreadResponse> {
  console.log("[Team API] getThread via Supabase", messageId, params);
  try {
    const limit = params?.limit || 50;

    // Get the parent message
    const { data: parentMessage, error: parentError } = await supabase
      .from("messages")
      .select(`*, sender:profiles(*), message_attachments(*)`)
      .eq("id", messageId)
      .single();

    if (parentError) throw parentError;

    // Get replies (messages with this parent_id)
    const { data: replies, error: repliesError } = await supabase
      .from("messages")
      .select(`*, sender:profiles(*), message_attachments(*)`)
      .eq("parent_id", messageId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (repliesError) throw repliesError;

    // Transform message attachments
    const transformedParent = transformMessageAttachments(parentMessage);
    const transformedReplies = (replies || []).map(transformMessageAttachments);

    const result: ThreadResponse = {
      parent_message: transformedParent,
      replies: transformedReplies,
      has_more: (replies || []).length >= limit,
    };

    console.log("[Team API] getThread response:", (replies || []).length, "replies");
    return result;
  } catch (error) {
    console.error("[Team API] getThread ERROR:", error);
    throw error;
  }
}

export async function replyToThread(
  messageId: string,
  content: string
): Promise<Message> {
  console.log("[Team API] replyToThread via Supabase", messageId, content);
  try {
    const userId = await getCurrentUserId();

    // Get the parent message to find channel_id or dm_conversation_id
    const { data: parentMessage, error: parentError } = await supabase
      .from("messages")
      .select("channel_id, dm_conversation_id")
      .eq("id", messageId)
      .single();

    if (parentError) throw parentError;

    // Insert reply with same channel/dm context
    const { data: reply, error: replyError } = await supabase
      .from("messages")
      .insert({
        channel_id: parentMessage.channel_id,
        dm_conversation_id: parentMessage.dm_conversation_id,
        sender_id: userId,
        content,
        parent_id: messageId,
      })
      .select(`*, sender:profiles(*)`)
      .single();

    if (replyError) throw replyError;

    // Update reply_count on parent message (if RPC exists)
    try {
      await supabase.rpc("increment_reply_count", { message_id: messageId });
    } catch {
      console.log("[Team API] replyToThread - RPC not available, skipping reply_count update");
    }

    console.log("[Team API] replyToThread response:", reply);
    return reply as Message;
  } catch (error) {
    console.error("[Team API] replyToThread ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Reactions
// ============================================================================

export async function addReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  console.log("[Team API] addReaction via Supabase", messageId, emoji);
  try {
    const userId = await getCurrentUserId();

    // Check if reaction already exists
    const { data: existing } = await supabase
      .from("message_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("profile_id", userId)
      .eq("emoji", emoji)
      .single();

    if (existing) {
      console.log("[Team API] addReaction - reaction already exists");
      return;
    }

    const { error } = await supabase
      .from("message_reactions")
      .insert({
        message_id: messageId,
        profile_id: userId,
        emoji,
      });

    if (error) throw error;

    console.log("[Team API] addReaction success");
  } catch (error) {
    console.error("[Team API] addReaction ERROR:", error);
    throw error;
  }
}

export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  console.log("[Team API] removeReaction via Supabase", messageId, emoji);
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("profile_id", userId)
      .eq("emoji", emoji);

    if (error) throw error;

    console.log("[Team API] removeReaction success");
  } catch (error) {
    console.error("[Team API] removeReaction ERROR:", error);
    throw error;
  }
}

export async function getReactions(messageId: string): Promise<{
  reactions: Array<{
    emoji: string;
    count: number;
    users: Array<{ id: string; name: string }>;
  }>;
}> {
  console.log("[Team API] getReactions via Supabase", messageId);
  try {
    const { data, error } = await supabase
      .from("message_reactions")
      .select(`
        emoji,
        profile:profiles(id, display_name, email)
      `)
      .eq("message_id", messageId);

    if (error) throw error;

    // Group by emoji
    const reactionMap = new Map<string, Array<{ id: string; name: string }>>();
    (data || []).forEach((r: any) => {
      if (!reactionMap.has(r.emoji)) {
        reactionMap.set(r.emoji, []);
      }
      if (r.profile) {
        reactionMap.get(r.emoji)!.push({
          id: r.profile.id,
          name: r.profile.display_name || r.profile.email || r.profile.id,
        });
      }
    });

    const reactions = Array.from(reactionMap.entries()).map(([emoji, users]) => ({
      emoji,
      count: users.length,
      users,
    }));

    console.log("[Team API] getReactions response:", reactions.length, "unique reactions");
    return { reactions };
  } catch (error) {
    console.error("[Team API] getReactions ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Direct Messages
// ============================================================================

export async function getDMConversations(): Promise<DMConversationsResponse> {
  console.log("[Team API] getDMConversations via Supabase");
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    console.log("[Team API] getDMConversations - userId:", userId, "workspaceId:", workspaceId);

    // Step 1: Get all DM conversation IDs where current user is a participant
    // Include last_read_at/is_muted so we can compute unread counts.
    let myParticipations: Array<{
      conversation_id: string;
      last_read_at: string | null;
      is_muted?: boolean;
    }> = [];

    const withMutedResult = await supabase
      .from("dm_participants")
      .select("conversation_id, last_read_at, is_muted")
      .eq("profile_id", userId);

    if (withMutedResult.error) {
      if (isMissingColumnError(withMutedResult.error, "is_muted")) {
        // Older schemas do not have dm_participants.is_muted
        const fallbackResult = await supabase
          .from("dm_participants")
          .select("conversation_id, last_read_at")
          .eq("profile_id", userId);

        if (fallbackResult.error) throw fallbackResult.error;
        myParticipations = (fallbackResult.data || []).map((row: any) => ({
          conversation_id: row.conversation_id,
          last_read_at: row.last_read_at || null,
          is_muted: false,
        }));
      } else {
        throw withMutedResult.error;
      }
    } else {
      myParticipations = (withMutedResult.data || []).map((row: any) => ({
        conversation_id: row.conversation_id,
        last_read_at: row.last_read_at || null,
        is_muted: typeof row.is_muted === "boolean" ? row.is_muted : false,
      }));
    }

    console.log("[Team API] getDMConversations - my participations:", myParticipations?.length);

    if (!myParticipations || myParticipations.length === 0) {
      console.log("[Team API] getDMConversations response: 0 conversations (no participations)");
      return { conversations: [] };
    }

    const myConvIds = myParticipations.map((p) => p.conversation_id);
    const myParticipationByConv = new Map<
      string,
      { last_read_at: string | null; is_muted: boolean }
    >(
      myParticipations.map((p: any) => [
        p.conversation_id,
        {
          last_read_at: p.last_read_at || null,
          is_muted: typeof p.is_muted === "boolean" ? p.is_muted : false,
        },
      ])
    );

    // Step 2: Get all conversations with their details, filtered to current workspace
    const { data: allConversations, error: convError } = await supabase
      .from("dm_conversations")
      .select("*")
      .in("id", myConvIds)
      .eq("workspace_id", workspaceId);

    if (convError) throw convError;

    console.log("[Team API] getDMConversations - conversations in workspace:", allConversations?.length);

    if (!allConversations || allConversations.length === 0) {
      console.log("[Team API] getDMConversations response: 0 conversations (none in workspace)");
      return { conversations: [] };
    }

    const conversationIds = allConversations.map((c) => c.id);

    // Step 2.5: Get all DM messages for unread + preview data
    const { data: allMessages, error: msgError } = await supabase
      .from("messages")
      .select("id, dm_conversation_id, sender_id, content, created_at, is_deleted")
      .in("dm_conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (msgError) throw msgError;

    // Step 3: Get all participants for these conversations (to find the other user)
    const { data: allParticipants, error: partError } = await supabase
      .from("dm_participants")
      .select(`
        conversation_id,
        profile_id,
        last_read_at,
        profile:profiles(
          id,
          name,
          email,
          avatar_url
        )
      `)
      .in("conversation_id", conversationIds);

    if (partError) throw partError;

    console.log("[Team API] getDMConversations - all participants:", allParticipants?.length);

    // Group participants by conversation
    const participantsByConv = new Map<string, any[]>();
    (allParticipants || []).forEach((p: any) => {
      const convId = p.conversation_id;
      if (!participantsByConv.has(convId)) {
        participantsByConv.set(convId, []);
      }
      participantsByConv.get(convId)!.push(p);
    });

    // Group messages by conversation (already ordered newest first)
    const messagesByConv = new Map<string, any[]>();
    (allMessages || []).forEach((m: any) => {
      const convId = m.dm_conversation_id;
      if (!convId || m.is_deleted) return;
      if (!messagesByConv.has(convId)) {
        messagesByConv.set(convId, []);
      }
      messagesByConv.get(convId)!.push(m);
    });

    // Build the response
    const conversations: DirectMessageConversation[] = [];

    for (const conv of allConversations) {
      const participants = participantsByConv.get(conv.id) || [];
      const myParticipation = myParticipationByConv.get(conv.id);
      const lastReadAt = myParticipation?.last_read_at
        ? new Date(myParticipation.last_read_at)
        : new Date(0);
      const convMessages = messagesByConv.get(conv.id) || [];
      const latestMessage = convMessages[0];
      const unreadCount = convMessages.filter(
        (m: any) =>
          m.sender_id !== userId && new Date(m.created_at) > lastReadAt
      ).length;

      // Find the other participant (not current user)
      const otherParticipant = participants.find((p: any) => p.profile_id !== userId);
      const otherProfile = otherParticipant?.profile;

      console.log("[Team API] getDMConversations - conv", conv.id, "otherProfile:", otherProfile?.name || otherProfile?.email);

      conversations.push({
        id: conv.id,
        workspace_id: conv.workspace_id,
        participant_ids: participants.map((p: any) => p.profile_id) as [string, string],
        last_message_at: latestMessage?.created_at || conv.last_message_at || null,
        created_at: conv.created_at,
        unread_count: unreadCount,
        is_muted: myParticipation?.is_muted ?? false,
        last_message: latestMessage
          ? {
              id: latestMessage.id,
              content: latestMessage.content,
              created_at: latestMessage.created_at,
            }
          : undefined,
        participant: otherProfile
          ? {
              id: otherProfile.id,
              workspace_id: conv.workspace_id,
              user_id: otherProfile.id,
              role: "member" as const,
              display_name: otherProfile.name,
              title: null,
              timezone: null,
              joined_at: conv.created_at,
              invited_by: null,
              user: {
                id: otherProfile.id,
                name: otherProfile.name || otherProfile.email || "",
                email: otherProfile.email || "",
                phone: null,
                avatar_url: otherProfile.avatar_url,
              },
            }
          : undefined,
      });
    }

    console.log("[Team API] getDMConversations response:", conversations.length, "conversations");
    return { conversations };
  } catch (error) {
    console.error("[Team API] getDMConversations ERROR:", error);
    throw error;
  }
}

export async function getDMConversation(
  id: string
): Promise<DirectMessageConversation> {
  console.log("[Team API] getDMConversation via Supabase", id);
  try {
    const userId = await getCurrentUserId();

    // Get the conversation
    const { data: conversation, error: convError } = await supabase
      .from("dm_conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (convError) throw convError;

    // Get participants
    const { data: participants, error: partError } = await supabase
      .from("dm_participants")
      .select(`
        profile_id,
        last_read_at,
        profile:profiles(*)
      `)
      .eq("conversation_id", id);

    console.log("[Team API] getDMConversation - participants:", participants);

    if (partError) throw partError;

    // Find the other participant (not the current user)
    const otherParticipant = (participants || []).find(
      (p: any) => p.profile_id !== userId
    ) as any;

    // Get current user's muted status
    const currentUserParticipant = (participants || []).find(
      (p: any) => p.profile_id === userId
    ) as any;

    const result: DirectMessageConversation = {
      id: conversation.id,
      workspace_id: conversation.workspace_id,
      participant_ids: (participants || []).map((p: any) => p.profile_id) as [string, string],
      last_message_at: conversation.last_message_at,
      created_at: conversation.created_at,
      participant: otherParticipant?.profile
        ? {
            id: otherParticipant.profile.id,
            workspace_id: conversation.workspace_id,
            user_id: otherParticipant.profile.id,
            role: "member",
            display_name: otherParticipant.profile.display_name,
            title: null,
            timezone: null,
            joined_at: conversation.created_at,
            invited_by: null,
            user: {
              id: otherParticipant.profile.id,
              name: otherParticipant.profile.display_name || otherParticipant.profile.email || "",
              email: otherParticipant.profile.email || "",
              phone: null,
              avatar_url: otherParticipant.profile.avatar_url,
            },
          }
        : undefined,
      is_muted: currentUserParticipant?.is_muted || false,
    };

    console.log("[Team API] getDMConversation response:", result);
    return result;
  } catch (error) {
    console.error("[Team API] getDMConversation ERROR:", error);
    throw error;
  }
}

export async function startDMConversation(
  data: CreateDMInput
): Promise<DirectMessageConversation & { isNew: boolean }> {
  console.log("[Team API] startDMConversation via Supabase", data);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();
    const targetUserId = data.user_id;

    // Check if a conversation already exists between these two users
    // Get all DM conversations where current user is a participant
    const { data: myConversations, error: myConvError } = await supabase
      .from("dm_participants")
      .select("conversation_id")
      .eq("profile_id", userId);

    if (myConvError) throw myConvError;

    const myConvIds = (myConversations || []).map((c) => c.conversation_id);

    // Check if target user is in any of these conversations
    if (myConvIds.length > 0) {
      const { data: sharedConversations, error: sharedError } = await supabase
        .from("dm_participants")
        .select(`
          conversation_id,
          conversation:dm_conversations(
            id,
            workspace_id,
            created_at
          )
        `)
        .eq("profile_id", targetUserId)
        .in("conversation_id", myConvIds);

      if (sharedError) throw sharedError;

      // Find conversation in current workspace
      const existingConv = (sharedConversations || []).find(
        (c: any) => c.conversation?.workspace_id === workspaceId
      ) as any;

      if (existingConv && existingConv.conversation) {
        console.log("[Team API] startDMConversation - found existing conversation");

        // Get full conversation details
        const fullConv = await getDMConversation(existingConv.conversation.id);
        return { ...fullConv, isNew: false };
      }
    }

    // No existing conversation found - create new one
    console.log("[Team API] startDMConversation - creating new conversation");

    const { data: newConversation, error: createError } = await supabase
      .from("dm_conversations")
      .insert({
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Add both participants
    const { error: participantsError } = await supabase
      .from("dm_participants")
      .insert([
        { conversation_id: newConversation.id, profile_id: userId },
        { conversation_id: newConversation.id, profile_id: targetUserId },
      ]);

    if (participantsError) throw participantsError;

    // Get full conversation details with participant info
    const fullConv = await getDMConversation(newConversation.id);

    console.log("[Team API] startDMConversation response:", fullConv);
    return { ...fullConv, isNew: true };
  } catch (error) {
    console.error("[Team API] startDMConversation ERROR:", error);
    throw error;
  }
}

export async function getDMMessages(
  dmId: string,
  params?: MessagesQueryParams
): Promise<MessagesResponse> {
  console.log("[Team API] getDMMessages via Web API", dmId, params);
  
  // Use the web API endpoint which returns messages with fresh signed URLs
  // The web API has service role permissions to create signed URLs
  const API_URL = getApiBaseUrl();
  
  if (API_URL) {
    try {
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = await getWorkspaceId();
      
      // Build query params
      const queryParams = new URLSearchParams();
      if (workspaceId) queryParams.append("workspaceId", workspaceId);
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.before) queryParams.append("before", params.before);
      if (params?.after) queryParams.append("after", params.after);
      
      const url = `${API_URL}/api/team/dms/${dmId}/messages?${queryParams.toString()}`;
      console.log("[Team API] Fetching from web API:", url);
      
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: session ? `Bearer ${session.access_token}` : "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("[Team API] getDMMessages via Web API response:", data.messages?.length, "messages");
        
        // Transform the response to match our expected format
        // The web API returns messages with attachments that have fresh signed URLs
        const messages = (data.messages || []).map((msg: any) => ({
          ...msg,
          attachments: (msg.attachments || []).map((att: any) => ({
            id: att.id,
            type: getAttachmentTypeFromMime(att.mimeType || att.mime_type || ""),
            url: att.url || att.fileUrl,
            name: att.name || att.fileName,
            size: att.size || att.fileSize || 0,
            mime_type: att.mimeType || att.mime_type || "",
            thumbnail: att.thumbnail,
          })),
        }));
        
        
        return {
          messages,
          has_more: data.hasMore || data.has_more || false,
          next_cursor: data.nextCursor || data.next_cursor,
        };
      } else {
        console.log("[Team API] Web API failed, status:", response.status, "falling back to Supabase");
      }
    } catch (apiError) {
      console.log("[Team API] Web API error, falling back to Supabase:", apiError);
    }
  }
  
  // Fallback to direct Supabase query (URLs may be expired)
  console.log("[Team API] getDMMessages via Supabase (fallback)", dmId, params);
  try {
    const limit = params?.limit || 50;

    let query = supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!sender_id(*),
        message_attachments(*)
      `)
      .eq("dm_conversation_id", dmId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (params?.before) {
      query = query.lt("created_at", params.before);
    }
    if (params?.after) {
      query = query.gt("created_at", params.after);
    }

    const { data, error } = await query;

    if (error) throw error;

    const messages = data || [];
    const has_more = messages.length > limit;
    const resultMessages = has_more ? messages.slice(0, limit) : messages;

    // Transform to map message_attachments to attachments
    const transformedMessages = resultMessages.map(transformMessageAttachments);

    // Reverse to get chronological order
    transformedMessages.reverse();

    // After reverse, first message is oldest - use its timestamp as cursor for next page
    const next_cursor = has_more && transformedMessages.length > 0
      ? transformedMessages[0].created_at
      : undefined;

    console.log("[Team API] getDMMessages response:", transformedMessages.length, "messages, has_more:", has_more);
    return { messages: transformedMessages, has_more, next_cursor };
  } catch (error) {
    console.error("[Team API] getDMMessages ERROR:", error);
    throw error;
  }
}

export async function sendDMMessage(
  dmId: string,
  data: SendMessageInput
): Promise<Message> {
  console.log("[Team API] sendDMMessage via Supabase", dmId, data);
  try {
    const userId = await getCurrentUserId();
    const workspaceId = await getWorkspaceId();

    // Insert message (without attachments column - that's a separate table)
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        dm_conversation_id: dmId,
        sender_id: userId,
        workspace_id: workspaceId,
        content: data.content,
      })
      .select(`*, sender:profiles(*)`)
      .single();

    if (error) throw error;

    // Insert attachments into message_attachments table
    if (data.attachments && data.attachments.length > 0) {
      const attachmentRows = data.attachments.map((att) => ({
        message_id: message.id,
        file_url: att.url,
        file_name: att.name,
        file_type: att.type === "image" ? "image/jpeg" : "application/octet-stream",
        file_size: att.size,
        storage_path: att.url.split("/workspace-files/")[1] || null,
      }));

      const { error: attachError } = await supabase
        .from("message_attachments")
        .insert(attachmentRows);

      if (attachError) {
        console.error("[Team API] Failed to insert attachments:", attachError);
      }
    }

    // Update last_message_at on the conversation
    await supabase
      .from("dm_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", dmId);

    console.log("[Team API] sendDMMessage response:", message);
    return message as Message;
  } catch (error) {
    console.error("[Team API] sendDMMessage ERROR:", error);
    throw error;
  }
}

export async function muteDM(dmId: string): Promise<void> {
  console.log("[Team API] muteDM via Supabase", dmId);
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("dm_participants")
      .update({ is_muted: true })
      .eq("conversation_id", dmId)
      .eq("profile_id", userId);

    if (error) throw error;

    console.log("[Team API] muteDM success");
  } catch (error) {
    console.error("[Team API] muteDM ERROR:", error);
    throw error;
  }
}

export async function unmuteDM(dmId: string): Promise<void> {
  console.log("[Team API] unmuteDM via Supabase", dmId);
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("dm_participants")
      .update({ is_muted: false })
      .eq("conversation_id", dmId)
      .eq("profile_id", userId);

    if (error) throw error;

    console.log("[Team API] unmuteDM success");
  } catch (error) {
    console.error("[Team API] unmuteDM ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Presence & Status
// ============================================================================

export async function updatePresence(data: UpdatePresenceInput): Promise<void> {
  console.log("[Team API] updatePresence via Supabase", data);
  try {
    const userId = await getCurrentUserId();

    // Upsert presence data into user_presence table
    const { error } = await supabase
      .from("user_presence")
      .upsert({
        user_id: userId,
        status: data.status,
        status_message: data.status_message || null,
        status_emoji: data.status_emoji || null,
        status_expiry: data.status_expiry || null,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    console.log("[Team API] updatePresence success");
  } catch (error) {
    console.error("[Team API] updatePresence ERROR:", error);
    throw error;
  }
}

export async function getUserPresence(userId: string): Promise<UserPresence> {
  console.log("[Team API] getUserPresence via Supabase", userId);
  try {
    const { data: presence, error } = await supabase
      .from("user_presence")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If no presence record, return default
      if (error.code === "PGRST116") {
        return {
          user_id: userId,
          status: "offline",
          status_message: null,
          status_emoji: null,
          status_expiry: null,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      throw error;
    }

    console.log("[Team API] getUserPresence response:", presence);
    return presence as UserPresence;
  } catch (error) {
    console.error("[Team API] getUserPresence ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Typing Indicators
// ============================================================================

// Note: Typing indicators are ephemeral and use Supabase Realtime broadcast
// They don't need database storage - just broadcast to channel subscribers

export async function sendTypingIndicator(channelId: string): Promise<void> {
  console.log("[Team API] sendTypingIndicator via Supabase Realtime", channelId);
  try {
    const userId = await getCurrentUserId();

    // Broadcast typing event to channel subscribers
    const channel = supabase.channel(`channel:${channelId}`);
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, timestamp: new Date().toISOString() },
    });

    console.log("[Team API] sendTypingIndicator broadcast sent");
  } catch (error) {
    console.error("[Team API] sendTypingIndicator ERROR:", error);
    // Don't throw - typing indicators are non-critical
  }
}

export async function sendDMTypingIndicator(dmId: string): Promise<void> {
  console.log("[Team API] sendDMTypingIndicator via Supabase Realtime", dmId);
  try {
    const userId = await getCurrentUserId();

    // Broadcast typing event to DM conversation subscribers
    const channel = supabase.channel(`dm:${dmId}`);
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, timestamp: new Date().toISOString() },
    });

    console.log("[Team API] sendDMTypingIndicator broadcast sent");
  } catch (error) {
    console.error("[Team API] sendDMTypingIndicator ERROR:", error);
    // Don't throw - typing indicators are non-critical
  }
}

// ============================================================================
// Mentions
// ============================================================================

export async function getMentions(
  unreadOnly?: boolean
): Promise<MentionsResponse> {
  console.log("[Team API] getMentions via Supabase", { unreadOnly });
  // Note: There's no mentions table in the database.
  // Mentions are parsed from message content (@username) on the client side.
  // Return empty array for now.
  console.log("[Team API] getMentions response: 0 mentions (no mentions table)");
  return { mentions: [] };
}

export async function markMentionRead(id: string): Promise<void> {
  console.log("[Team API] markMentionRead - no-op (no mentions table)", id);
  // No-op since mentions are parsed client-side from message content
}

export async function markAllMentionsRead(): Promise<void> {
  console.log("[Team API] markAllMentionsRead - no-op (no mentions table)");
  // No-op since mentions are parsed client-side from message content
}

// ============================================================================
// Search
// ============================================================================

export async function searchMessages(
  query: string,
  filters?: SearchFilters
): Promise<SearchResponse> {
  console.log("[Team API] searchMessages via Supabase", query, filters);
  try {
    const workspaceId = await getWorkspaceId();

    // Build the query
    let dbQuery = supabase
      .from("messages")
      .select(`
        *,
        sender:profiles(*),
        channel:channels(id, name, is_private)
      `)
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    // Apply filters
    if (filters?.channel_id) {
      dbQuery = dbQuery.eq("channel_id", filters.channel_id);
    }
    if (filters?.from_user_id) {
      dbQuery = dbQuery.eq("sender_id", filters.from_user_id);
    }
    if (filters?.after) {
      dbQuery = dbQuery.gte("created_at", filters.after);
    }
    if (filters?.before) {
      dbQuery = dbQuery.lte("created_at", filters.before);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;

    // Transform to SearchResult format
    const results = (data || []).map((m: any) => ({
      message: {
        id: m.id,
        content: m.content,
        highlighted_content: m.content, // No highlighting for now
        channel: m.channel ? { id: m.channel.id, name: m.channel.name } : undefined,
        dm: m.dm_conversation_id ? { id: m.dm_conversation_id } : undefined,
        user: {
          id: m.sender?.id || m.sender_id,
          name: m.sender?.display_name || m.sender?.email || "Unknown",
          avatar_url: m.sender?.avatar_url || null,
        },
        created_at: m.created_at,
      },
      score: 1, // No relevance scoring for simple ilike search
    }));

    console.log("[Team API] searchMessages response:", results.length, "results");
    return {
      results,
      total: results.length,
      has_more: results.length >= 50,
    };
  } catch (error) {
    console.error("[Team API] searchMessages ERROR:", error);
    throw error;
  }
}

// ============================================================================
// AI Agents
// ============================================================================

export async function getAgents(): Promise<AgentsResponse> {
  console.log("[Team API] getAgents via Supabase");
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (error) throw error;

    const agents = (data || []) as Agent[];

    if (agents.length === 0) {
      console.log("[Team API] getAgents response: 0 agents");
      return { agents };
    }

    const agentIds = agents.map((agent) => agent.id);
    let agentsWithUnread = agents.map((agent) => ({
      ...agent,
      unread_count: 0,
    }));

    try {
      const unreadCountByAgentId = new Map<string, number>();

      // Mirror web unread logic: assistant messages newer than the user's last_read_at.
      // Fallback for older schemas where last_read_at does not exist.
      let conversations: Array<{
        id: string;
        agent_id: string;
        last_read_at: string | null;
      }> = [];

      const conversationsWithReadResult = await supabase
        .from("agent_conversations")
        .select("id, agent_id, last_read_at")
        .eq("user_id", userId)
        .in("agent_id", agentIds);

      if (conversationsWithReadResult.error) {
        if (isMissingColumnError(conversationsWithReadResult.error, "last_read_at")) {
          const conversationsFallbackResult = await supabase
            .from("agent_conversations")
            .select("id, agent_id")
            .eq("user_id", userId)
            .in("agent_id", agentIds);

          if (conversationsFallbackResult.error) {
            throw conversationsFallbackResult.error;
          }

          conversations = (conversationsFallbackResult.data || []).map((conv: any) => ({
            id: conv.id,
            agent_id: conv.agent_id,
            last_read_at: null,
          }));
        } else {
          throw conversationsWithReadResult.error;
        }
      } else {
        conversations = (conversationsWithReadResult.data || []).map((conv: any) => ({
          id: conv.id,
          agent_id: conv.agent_id,
          last_read_at: conv.last_read_at || null,
        }));
      }

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map((conv) => conv.id);
        const lastReadByConversationId = new Map<string, Date>(
          conversations.map((conv) => [
            conv.id,
            conv.last_read_at ? new Date(conv.last_read_at) : new Date(0),
          ])
        );
        const agentByConversationId = new Map<string, string>(
          conversations.map((conv) => [conv.id, conv.agent_id])
        );

        const { data: assistantMessages, error: msgError } = await supabase
          .from("agent_messages")
          .select("conversation_id, created_at")
          .in("conversation_id", conversationIds)
          .eq("role", "assistant");

        if (msgError) throw msgError;

        (assistantMessages || []).forEach((message: any) => {
          const conversationId = message.conversation_id as string | null;
          const createdAt = message.created_at as string | null;
          if (!conversationId || !createdAt) return;

          const lastReadAt = lastReadByConversationId.get(conversationId) || new Date(0);
          if (new Date(createdAt) <= lastReadAt) return;

          const agentId = agentByConversationId.get(conversationId);
          if (!agentId) return;

          unreadCountByAgentId.set(
            agentId,
            (unreadCountByAgentId.get(agentId) || 0) + 1
          );
        });
      }

      agentsWithUnread = agents.map((agent) => ({
        ...agent,
        unread_count: unreadCountByAgentId.get(agent.id) || 0,
      }));
    } catch (unreadError) {
      console.warn(
        "[Team API] getAgents unread count fallback (returning agents without unread counts):",
        unreadError
      );
    }

    console.log("[Team API] getAgents response:", agentsWithUnread.length, "agents");
    return { agents: agentsWithUnread };
  } catch (error) {
    console.error("[Team API] getAgents ERROR:", error);
    throw error;
  }
}

export async function getAgent(id: string): Promise<Agent> {
  console.log("[Team API] getAgent via Supabase", id);
  try {
    const { data: agent, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    console.log("[Team API] getAgent response:", agent);
    return agent as Agent;
  } catch (error) {
    console.error("[Team API] getAgent ERROR:", error);
    throw error;
  }
}

export async function getAgentConversation(
  agentId: string,
  conversationId: string
): Promise<AgentConversation> {
  console.log("[Team API] getAgentConversation via Supabase", agentId, conversationId);
  try {
    const { data: conversation, error } = await supabase
      .from("agent_conversations")
      .select(`
        *,
        messages:agent_messages(*)
      `)
      .eq("id", conversationId)
      .eq("agent_id", agentId)
      .single();

    if (error) throw error;

    console.log("[Team API] getAgentConversation response:", conversation);
    return conversation as AgentConversation;
  } catch (error) {
    console.error("[Team API] getAgentConversation ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Workspace Members
// ============================================================================

export async function getWorkspaceMembers(): Promise<WorkspaceMembersResponse> {
  console.log("[Team API] getWorkspaceMembers via Supabase");
  try {
    const workspaceId = await getWorkspaceId();

    console.log("[Team API] getWorkspaceMembers - workspaceId:", workspaceId);

    // Debug: Get ALL workspace_members to see what's in the table
    const { data: allMembers, error: allError } = await supabase
      .from("workspace_members")
      .select("*");

    console.log("[Team API] getWorkspaceMembers - ALL workspace_members:", allMembers?.length, allMembers);

    const { data, error } = await supabase
      .from("workspace_members")
      .select(`
        role,
        joined_at,
        profile:profiles(*)
      `)
      .eq("workspace_id", workspaceId);

    console.log("[Team API] getWorkspaceMembers - filtered data:", data?.length, data);

    if (error) throw error;

    // Transform to WorkspaceMember format
    const members = (data || [])
      .filter((item: any) => item.profile)
      .map((item: any) => ({
        id: item.profile.id,
        workspace_id: workspaceId,
        user_id: item.profile.id,
        role: item.role,
        display_name: item.profile.display_name,
        title: null,
        timezone: null,
        joined_at: item.joined_at,
        invited_by: null,
        user: {
          id: item.profile.id,
          name: item.profile.display_name || item.profile.email || "",
          email: item.profile.email || "",
          phone: null,
          avatar_url: item.profile.avatar_url,
        },
      })) as WorkspaceMember[];

    console.log("[Team API] getWorkspaceMembers response:", members.length, "members");
    return { members };
  } catch (error) {
    console.error("[Team API] getWorkspaceMembers ERROR:", error);
    throw error;
  }
}

// ============================================================================
// File Uploads
// ============================================================================

export async function uploadAttachment(
  uri: string,
  fileName: string,
  mimeType: string
): Promise<UploadResponse> {
  console.log("[Team API] uploadAttachment:", { uri: uri.substring(0, 50), fileName, mimeType });

  const workspaceId = await getWorkspaceId();
  const userId = await getCurrentUserId();

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });

  // Convert to ArrayBuffer
  const buffer = decode(base64);

  // Generate unique storage path
  const ext = fileName.split(".").pop() || "file";
  const storagePath = `${workspaceId}/${userId}/${Date.now()}.${ext}`;

  console.log("[Team API] uploading to Supabase Storage:", storagePath);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("workspace-files")
    .upload(storagePath, buffer, { contentType: mimeType });

  if (error) {
    console.error("[Team API] uploadAttachment error:", error);
    throw error;
  }

  console.log("[Team API] uploadAttachment success:", data);

  // Get public URL (bucket is public)
  const { data: urlData } = supabase.storage
    .from("workspace-files")
    .getPublicUrl(storagePath);

  return {
    id: data.id || storagePath,
    url: urlData.publicUrl,
    type: getAttachmentTypeFromMime(mimeType),
    name: fileName,
    size: buffer.byteLength,
    mime_type: mimeType,
  };
}

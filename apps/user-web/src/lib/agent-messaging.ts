import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Get all admin profile IDs for a workspace (owners + admins).
 * Used as a fallback when no specific user is set to receive notifications.
 */
export async function getWorkspaceAdminIds(
  workspaceId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  const { data: admins } = await supabase
    .from("workspace_members")
    .select("profile_id")
    .eq("workspace_id", workspaceId)
    .in("role", ["owner", "admin"])

  return (admins || []).map(a => a.profile_id).filter(Boolean)
}

/**
 * Get the workspace owner's profile ID.
 * This is the most reliable final fallback - every workspace must have an owner.
 */
export async function getWorkspaceOwnerId(
  workspaceId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: owner } = await supabase
    .from("workspace_members")
    .select("profile_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .limit(1)
    .single()

  return owner?.profile_id || null
}

interface SendAgentMessageParams {
  agentId: string           // agents.id (local agent ID)
  recipientProfileId: string // User's profile_id
  workspaceId: string
  content: string
  supabase: SupabaseClient
}

interface SendAgentMessageResult {
  success: boolean
  messageId?: string
  conversationId?: string
  error?: string
}

/**
 * Send a DM message as an agent to a user.
 * This finds or creates a DM conversation and inserts a message
 * using the agent's profile_id as the sender.
 */
export async function sendAgentMessage(
  params: SendAgentMessageParams
): Promise<SendAgentMessageResult> {
  const { agentId, recipientProfileId, workspaceId, content, supabase } = params

  console.log(`[AgentMessaging] ========== START sendAgentMessage ==========`)
  console.log(`[AgentMessaging] agentId: ${agentId}`)
  console.log(`[AgentMessaging] recipientProfileId: ${recipientProfileId}`)
  console.log(`[AgentMessaging] workspaceId: ${workspaceId}`)
  console.log(`[AgentMessaging] content length: ${content.length} chars`)

  try {
    // 1. Get the agent's profile_id
    console.log(`[AgentMessaging] Step 1: Fetching agent...`)
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, profile_id, name")
      .eq("id", agentId)
      .single()

    if (agentError || !agent) {
      console.error("[AgentMessaging] Step 1 FAILED - Agent not found:", agentError)
      return {
        success: false,
        error: `Agent not found: ${agentError?.message || "Unknown error"}`,
      }
    }

    console.log(`[AgentMessaging] Step 1 OK - Agent found: ${agent.name}, profile_id: ${agent.profile_id}`)

    if (!agent.profile_id) {
      console.error("[AgentMessaging] Step 1 FAILED - Agent has no profile_id:", agentId)
      return {
        success: false,
        error: "Agent has no associated profile. Please ensure the migration has been run.",
      }
    }

    const agentProfileId = agent.profile_id

    // Verify the agent profile exists and is_agent=true
    const { data: agentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, is_agent")
      .eq("id", agentProfileId)
      .single()

    console.log(`[AgentMessaging] Agent profile check:`, {
      found: !!agentProfile,
      is_agent: agentProfile?.is_agent,
      error: profileError?.message,
    })

    // 2. Find existing DM conversation between agent and user
    console.log(`[AgentMessaging] Step 2: Looking for existing conversation...`)
    let conversationId: string | null = null

    // Get all DM conversations the agent is part of in this workspace
    const { data: agentConvos, error: convosError } = await supabase
      .from("dm_participants")
      .select(`
        conversation_id,
        dm_conversation:conversation_id(id, workspace_id)
      `)
      .eq("profile_id", agentProfileId)

    console.log(`[AgentMessaging] Agent's conversations: ${agentConvos?.length || 0}, error: ${convosError?.message || 'none'}`)

    // Check if any of these conversations include the recipient
    // Note: dm_conversation is returned as an object from the join, but TS may infer it differently
    for (const convo of agentConvos || []) {
      // Handle both array and object forms of the join result
      const dmConvoRaw = convo.dm_conversation
      const dmConvo = Array.isArray(dmConvoRaw) ? dmConvoRaw[0] : dmConvoRaw
      if (!dmConvo || dmConvo.workspace_id !== workspaceId) continue

      const { data: recipientParticipant } = await supabase
        .from("dm_participants")
        .select("profile_id")
        .eq("conversation_id", convo.conversation_id)
        .eq("profile_id", recipientProfileId)
        .single()

      if (recipientParticipant) {
        conversationId = convo.conversation_id
        console.log(`[AgentMessaging] Step 2 OK - Found existing conversation: ${conversationId}`)
        break
      }
    }

    // 3. If no conversation exists, create one
    if (!conversationId) {
      console.log(`[AgentMessaging] Step 3: Creating new conversation...`)
      const { data: newConvo, error: createError } = await supabase
        .from("dm_conversations")
        .insert({ workspace_id: workspaceId })
        .select("id")
        .single()

      if (createError || !newConvo) {
        console.error("[AgentMessaging] Step 3 FAILED - Could not create conversation:", {
          error: createError?.message,
          code: createError?.code,
          details: createError?.details,
          hint: createError?.hint,
        })
        return {
          success: false,
          error: `Failed to create conversation: ${createError?.message}`,
        }
      }

      conversationId = newConvo.id
      console.log(`[AgentMessaging] Step 3 OK - Created conversation: ${conversationId}`)

      // Add both participants
      console.log(`[AgentMessaging] Step 3b: Adding participants...`)
      console.log(`[AgentMessaging]   - Agent profile: ${agentProfileId}`)
      console.log(`[AgentMessaging]   - Recipient profile: ${recipientProfileId}`)

      const { error: participantsError } = await supabase
        .from("dm_participants")
        .insert([
          { conversation_id: conversationId, profile_id: agentProfileId },
          { conversation_id: conversationId, profile_id: recipientProfileId },
        ])

      if (participantsError) {
        console.error("[AgentMessaging] Step 3b FAILED - Could not add participants:", {
          error: participantsError.message,
          code: participantsError.code,
          details: participantsError.details,
          hint: participantsError.hint,
        })
        // Clean up the conversation
        await supabase.from("dm_conversations").delete().eq("id", conversationId)
        return {
          success: false,
          error: `Failed to add participants: ${participantsError.message}`,
        }
      }
      console.log(`[AgentMessaging] Step 3b OK - Participants added`)
    }

    // 4. Insert the message with sender_id = agent's profile_id
    console.log(`[AgentMessaging] Step 4: Inserting message...`)
    console.log(`[AgentMessaging]   - workspace_id: ${workspaceId}`)
    console.log(`[AgentMessaging]   - dm_conversation_id: ${conversationId}`)
    console.log(`[AgentMessaging]   - sender_id (agent profile): ${agentProfileId}`)

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        workspace_id: workspaceId,
        dm_conversation_id: conversationId,
        sender_id: agentProfileId,
        content,
      })
      .select("id")
      .single()

    if (messageError || !message) {
      console.error("[AgentMessaging] Step 4 FAILED - Could not insert message:", {
        error: messageError?.message,
        code: messageError?.code,
        details: messageError?.details,
        hint: messageError?.hint,
      })
      return {
        success: false,
        error: `Failed to send message: ${messageError?.message}`,
      }
    }

    console.log(`[AgentMessaging] Step 4 OK - Message inserted: ${message.id}`)
    console.log(
      `[AgentMessaging] ========== SUCCESS - Sent message from agent ${agent.name} (${agentId}) to user ${recipientProfileId} ==========`
    )

    return {
      success: true,
      messageId: message.id,
      conversationId: conversationId ?? undefined,
    }
  } catch (error) {
    console.error("[AgentMessaging] ========== UNEXPECTED ERROR ==========")
    console.error("[AgentMessaging]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Format a scheduled task completion message for DM delivery.
 */
export function formatTaskCompletionMessage(params: {
  scheduleName: string
  taskPrompt: string
  status: "completed" | "failed"
  resultText: string
  durationMs?: number
}): string {
  const { scheduleName, taskPrompt, status, resultText, durationMs } = params

  if (status === "completed") {
    const truncatedResult = resultText.length > 500
      ? `${resultText.slice(0, 500)}...`
      : resultText
    const durationStr = durationMs
      ? `\n\n_Completed in ${(durationMs / 1000).toFixed(1)}s_`
      : ""

    return `**Scheduled Task Completed**\n\nI finished running your scheduled task: **${scheduleName}**\n\n**Task:** ${taskPrompt}\n\n**Result:** ${truncatedResult}${durationStr}`
  }

  return `**Scheduled Task Failed**\n\nI encountered an error running: **${scheduleName}**\n\n**Task:** ${taskPrompt}\n\n**Error:** ${resultText}`
}

// ============================================================================
// Agent Chat Messages (for Agent Conversation Page)
// ============================================================================

interface SendAgentChatMessageParams {
  agentId: string           // agents.id (local agent ID)
  userId: string            // User's profile_id
  workspaceId: string
  content: string
  supabase: SupabaseClient
}

interface SendAgentChatMessageResult {
  success: boolean
  messageId?: string
  conversationId?: string
  error?: string
}

/**
 * Send a message as an agent to a user's agent chat conversation.
 * The message appears in the agent's chat page (under Agents section).
 *
 * This finds or creates an agent_conversations row for the user+agent,
 * then inserts a message into agent_messages with role='assistant'.
 */
export async function sendAgentChatMessage(
  params: SendAgentChatMessageParams
): Promise<SendAgentChatMessageResult> {
  const { agentId, userId, workspaceId, content, supabase } = params

  try {
    // 1. Find or create conversation for this user+agent
    let conversationId: string

    // Get the most recent conversation for this agent+user pair
    const { data: existingConvos, error: existingError } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(1)
    
    const existing = existingConvos?.[0] || null

    if (existing) {
      conversationId = existing.id
    } else {
      // Create new conversation
      const { data: newConvo, error: createError } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          user_id: userId,
          workspace_id: workspaceId,
          title: 'Scheduled Tasks',
        })
        .select('id')
        .single()

      if (createError) {
        console.error('[AgentMessaging] Failed to create conversation:', createError)
        return {
          success: false,
          error: `Failed to create conversation: ${createError.message}`,
        }
      }
      conversationId = newConvo.id
    }

    // 2. Insert the message as role='assistant'
    const { data: message, error: msgError } = await supabase
      .from('agent_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content,
        parts: [{ type: 'text', text: content }],
      })
      .select('id')
      .single()

    if (msgError) {
      console.error('[AgentMessaging] Failed to insert message:', msgError)
      return {
        success: false,
        error: `Failed to insert message: ${msgError.message}`,
      }
    }

    // 3. Update conversation's updated_at
    await supabase
      .from('agent_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    console.log(
      `[AgentMessaging] Sent chat message from agent ${agentId} to user ${userId} in conversation ${conversationId}`
    )

    return {
      success: true,
      messageId: message.id,
      conversationId,
    }
  } catch (error) {
    console.error('[AgentMessaging] Unexpected error sending chat message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

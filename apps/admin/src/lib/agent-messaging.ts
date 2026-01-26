// Agent Messaging - Send notifications for scheduled task completions
// Ported from financebro-1/apps/finance/src/lib/agent-messaging.ts

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get all admin profile IDs for a workspace (owners + admins).
 * Used as a fallback when no specific user is set to receive notifications.
 */
export async function getWorkspaceAdminIds(
  workspaceId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  const { data: admins } = await supabase
    .from('workspace_members')
    .select('profile_id')
    .eq('workspace_id', workspaceId)
    .in('role', ['owner', 'admin'])

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
    .from('workspace_members')
    .select('profile_id')
    .eq('workspace_id', workspaceId)
    .eq('role', 'owner')
    .limit(1)
    .single()

  return owner?.profile_id || null
}

/**
 * Format a scheduled task completion message for delivery.
 */
export function formatTaskCompletionMessage(params: {
  scheduleName: string
  taskPrompt: string
  status: 'completed' | 'failed'
  resultText: string
  durationMs?: number
}): string {
  const { scheduleName, taskPrompt, status, resultText, durationMs } = params

  if (status === 'completed') {
    const truncatedResult = resultText.length > 500
      ? `${resultText.slice(0, 500)}...`
      : resultText
    const durationStr = durationMs
      ? `\n\n_Completed in ${(durationMs / 1000).toFixed(1)}s_`
      : ''

    return `**Scheduled Task Completed**\n\nI finished running your scheduled task: **${scheduleName}**\n\n**Task:** ${taskPrompt}\n\n**Result:** ${truncatedResult}${durationStr}`
  }

  return `**Scheduled Task Failed**\n\nI encountered an error running: **${scheduleName}**\n\n**Task:** ${taskPrompt}\n\n**Error:** ${resultText}`
}

// ============================================================================
// DM Messages (Teammate-style notifications)
// ============================================================================

interface SendAgentDMParams {
  agentId: string           // agents.id (local agent ID)
  recipientProfileId: string // User's profile_id
  workspaceId: string
  content: string
  supabase: SupabaseClient
}

interface SendAgentDMResult {
  success: boolean
  messageId?: string
  conversationId?: string
  error?: string
}

/**
 * Send a DM message as an agent to a user (like a teammate).
 * This finds or creates a DM conversation and inserts a message
 * using the agent's profile_id as the sender.
 */
export async function sendAgentDM(
  params: SendAgentDMParams
): Promise<SendAgentDMResult> {
  const { agentId, recipientProfileId, workspaceId, content, supabase } = params

  console.log(`[AgentMessaging] Sending DM from agent ${agentId} to user ${recipientProfileId}`)

  try {
    // 1. Get the agent's profile_id
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, profile_id, name")
      .eq("id", agentId)
      .single()

    if (agentError || !agent) {
      console.error("[AgentMessaging] Agent not found:", agentError)
      return { success: false, error: `Agent not found: ${agentError?.message}` }
    }

    if (!agent.profile_id) {
      console.error("[AgentMessaging] Agent has no profile_id:", agentId)
      return { success: false, error: "Agent has no associated profile" }
    }

    const agentProfileId = agent.profile_id

    // 2. Find existing DM conversation between agent and user
    let conversationId: string | null = null

    const { data: agentConvos } = await supabase
      .from("dm_participants")
      .select(`conversation_id, dm_conversation:conversation_id(id, workspace_id)`)
      .eq("profile_id", agentProfileId)

    for (const convo of agentConvos || []) {
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
        break
      }
    }

    // 3. If no conversation exists, create one
    if (!conversationId) {
      const { data: newConvo, error: createError } = await supabase
        .from("dm_conversations")
        .insert({ workspace_id: workspaceId })
        .select("id")
        .single()

      if (createError || !newConvo) {
        console.error("[AgentMessaging] Could not create DM conversation:", createError)
        return { success: false, error: `Failed to create conversation: ${createError?.message}` }
      }

      conversationId = newConvo.id

      // Add both participants
      const { error: participantsError } = await supabase
        .from("dm_participants")
        .insert([
          { conversation_id: conversationId, profile_id: agentProfileId },
          { conversation_id: conversationId, profile_id: recipientProfileId },
        ])

      if (participantsError) {
        console.error("[AgentMessaging] Could not add participants:", participantsError)
        await supabase.from("dm_conversations").delete().eq("id", conversationId)
        return { success: false, error: `Failed to add participants: ${participantsError.message}` }
      }
    }

    // 4. Insert the message with sender_id = agent's profile_id
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
      console.error("[AgentMessaging] Could not insert message:", messageError)
      return { success: false, error: `Failed to send message: ${messageError?.message}` }
    }

    console.log(`[AgentMessaging] DM sent successfully: ${message.id}`)
    return { success: true, messageId: message.id, conversationId: conversationId ?? undefined }
  } catch (error) {
    console.error("[AgentMessaging] Unexpected error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
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
    const { data: existingConvos } = await supabase
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

interface LocalAgentInfo {
  id: string
  reports_to: string | string[] | null  // Can be single ID or array of IDs
  workspace_id: string
}

/**
 * Find the local workspace agent that corresponds to a global ai_agent.
 * Returns the local agent's ID, reports_to, and workspace_id.
 */
export async function findLocalAgent(
  aiAgentId: string,
  workspaceId: string | null,
  supabase: SupabaseClient
): Promise<LocalAgentInfo | null> {
  // Build query - if we have a workspace ID, use it; otherwise get any matching agent
  let query = supabase
    .from('agents')
    .select('id, reports_to, workspace_id')
    .eq('ai_agent_id', aiAgentId)
    .limit(1)

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  const { data: agent, error } = await query.single()

  if (error || !agent) {
    console.log(`[AgentMessaging] No local agent found for ai_agent_id ${aiAgentId}${workspaceId ? ` in workspace ${workspaceId}` : ''}`)
    return null
  }

  return agent as LocalAgentInfo
}

/**
 * Resolve notification recipients for a scheduled task execution.
 * Uses the cascade: reports_to → schedule creator → workspace admins → workspace owner
 */
export async function resolveNotificationRecipients(params: {
  localAgent: LocalAgentInfo | null
  scheduleCreatedBy: string | null
  workspaceId: string
  supabase: SupabaseClient
}): Promise<string[]> {
  const { localAgent, scheduleCreatedBy, workspaceId, supabase } = params
  const recipients: string[] = []

  // 1. Try reports_to from local agent (can be string or array)
  if (localAgent?.reports_to) {
    const reportsToIds = Array.isArray(localAgent.reports_to) 
      ? localAgent.reports_to 
      : [localAgent.reports_to]
    recipients.push(...reportsToIds.filter(Boolean))
    console.log(`[AgentMessaging] Using reports_to: ${recipients.join(', ')}`)
    return recipients
  }

  // 2. Fall back to schedule creator
  if (scheduleCreatedBy) {
    recipients.push(scheduleCreatedBy)
    console.log(`[AgentMessaging] Using schedule creator: ${scheduleCreatedBy}`)
    return recipients
  }

  // 3. Fall back to workspace admins
  const adminIds = await getWorkspaceAdminIds(workspaceId, supabase)
  if (adminIds.length > 0) {
    console.log(`[AgentMessaging] Using workspace admins: ${adminIds.join(', ')}`)
    return adminIds
  }

  // 4. Final fallback to workspace owner
  const ownerId = await getWorkspaceOwnerId(workspaceId, supabase)
  if (ownerId) {
    recipients.push(ownerId)
    console.log(`[AgentMessaging] Using workspace owner: ${ownerId}`)
    return recipients
  }

  console.log(`[AgentMessaging] No recipients found for workspace ${workspaceId}`)
  return []
}

interface SendScheduledTaskNotificationParams {
  executionId: string
  aiAgentId: string
  scheduleId: string
  scheduleName: string
  taskPrompt: string
  status: 'completed' | 'failed'
  resultText: string
  durationMs?: number
  workspaceId: string | null
  scheduleCreatedBy: string | null
  supabase: SupabaseClient
}

interface SendScheduledTaskNotificationResult {
  success: boolean
  recipientCount: number
  errors: string[]
}

/**
 * Send a notification for a completed/failed scheduled task.
 * This is the main entry point for scheduled task notifications.
 */
export async function sendScheduledTaskNotification(
  params: SendScheduledTaskNotificationParams
): Promise<SendScheduledTaskNotificationResult> {
  // #region agent log
  const fs = require('fs')
  const logPath = '/Users/drewbaskin/dreamteam-monorepo-1/.cursor/debug.log'
  const logMsg = (msg: string, data: Record<string, unknown>) => {
    const entry = JSON.stringify({ location: 'agent-messaging.ts:sendScheduledTaskNotification', message: msg, data, timestamp: Date.now(), sessionId: 'debug-session', runId: 'msg-debug' }) + '\n'
    try { fs.appendFileSync(logPath, entry) } catch {}
    console.log(`[MSG DEBUG] ${msg}:`, JSON.stringify(data))
  }
  // #endregion

  const {
    aiAgentId,
    scheduleName,
    taskPrompt,
    status,
    resultText,
    durationMs,
    workspaceId,
    scheduleCreatedBy,
    supabase,
  } = params

  logMsg('sendScheduledTaskNotification called', { aiAgentId, scheduleName, status, workspaceId, scheduleCreatedBy })

  const errors: string[] = []

  // If no workspace ID, we can't send notifications
  if (!workspaceId) {
    logMsg('No workspace ID, skipping', {})
    console.log('[AgentMessaging] No workspace ID provided, skipping notification')
    return { success: false, recipientCount: 0, errors: ['No workspace ID provided'] }
  }

  // Find the local agent for this workspace
  const localAgent = await findLocalAgent(aiAgentId, workspaceId, supabase)
  logMsg('findLocalAgent result', { hasLocalAgent: !!localAgent, localAgentId: localAgent?.id, reportsTo: localAgent?.reports_to })

  if (!localAgent) {
    logMsg('No local agent found, skipping', { aiAgentId, workspaceId })
    console.log(`[AgentMessaging] No local agent found for ai_agent ${aiAgentId} in workspace ${workspaceId}, skipping notification`)
    return { success: false, recipientCount: 0, errors: ['No local agent found in workspace'] }
  }

  // Resolve recipients
  const recipients = await resolveNotificationRecipients({
    localAgent,
    scheduleCreatedBy,
    workspaceId,
    supabase,
  })
  logMsg('Recipients resolved', { recipientCount: recipients.length, recipients })

  if (recipients.length === 0) {
    logMsg('No recipients found', {})
    return { success: false, recipientCount: 0, errors: ['No recipients found'] }
  }

  // Format the message
  const content = formatTaskCompletionMessage({
    scheduleName,
    taskPrompt,
    status,
    resultText,
    durationMs,
  })

  // Send to each recipient via DM (like a teammate)
  let successCount = 0
  for (const recipientId of recipients) {
    logMsg('Sending DM to recipient', { recipientId, localAgentId: localAgent.id })
    const result = await sendAgentDM({
      agentId: localAgent.id,
      recipientProfileId: recipientId,
      workspaceId,
      content,
      supabase,
    })
    logMsg('sendAgentDM result', { recipientId, success: result.success, error: result.error, conversationId: result.conversationId })

    if (result.success) {
      successCount++
    } else if (result.error) {
      errors.push(`Failed to notify ${recipientId}: ${result.error}`)
    }
  }

  logMsg('Notification complete', { successCount, totalRecipients: recipients.length, errors })
  console.log(`[AgentMessaging] Sent scheduled task notification to ${successCount}/${recipients.length} recipients`)

  return {
    success: successCount > 0,
    recipientCount: successCount,
    errors,
  }
}

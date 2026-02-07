import { formatE164, getTwilioPhoneNumber } from './twilio'
import { sendSMSWithCredits } from './sms-with-credits'
import { sendEmail as sendNylasEmail, isNylasConfigured } from './nylas'
import { createAdminClient } from './supabase-server'
import type { WorkflowAction, ActionType, TriggerType, ConditionActionConfig } from '@/types/workflow'
import { evaluateCondition } from './workflow-condition-evaluator'

function isConditionActionConfig(config: Record<string, unknown>): boolean {
  return (
    typeof config.condition === 'object' &&
    config.condition !== null &&
    Array.isArray(config.if_branch)
  )
}

export interface WorkflowContext {
  userId: string
  workspaceId?: string
  leadId?: string
  contactId?: string
  dealId?: string
  lead?: {
    id: string
    name: string
    status?: string
    notes?: string
  }
  contact?: {
    id: string
    first_name: string
    last_name?: string
    email?: string
    phone?: string
  }
  deal?: {
    id: string
    name: string
    status?: string
    stage_id?: string
  }
  activity?: {
    id: string
    type: string
    subject: string
    is_completed: boolean
  }
  leadTask?: {
    id: string
    title: string
    is_completed: boolean
  }
  call?: {
    id: string
    twilio_sid: string
    direction: 'inbound' | 'outbound'
    status: string
    from_number: string
    to_number: string
    duration_seconds?: number
    recording_url?: string
  }
  customFieldValues?: Record<string, string>  // field_id -> value for custom fields
}

interface ActionConfig {
  phone_source?: 'lead_phone' | 'contact_phone' | 'custom'
  custom_phone?: string
  message?: string
  record?: boolean
  // For update_status (UI uses 'status', executor used 'new_status')
  status?: string
  new_status?: string
  // For add_note (UI uses 'note', executor used 'note_content')
  note?: string
  note_content?: string
  // For create_task (UI uses 'title'/'description', also support task_title/task_description)
  title?: string
  description?: string
  task_title?: string
  task_description?: string
  due_days?: number
  priority?: 'low' | 'medium' | 'high'
  // For assign_user
  assignment_type?: 'round_robin' | 'specific' | 'least_leads'
  assigned_user_id?: string
  // For send_notification (UI uses 'title'/'message', executor used notification_*)
  notification_title?: string
  notification_message?: string
  // For wait
  wait_duration?: number
  wait_unit?: 'minutes' | 'hours' | 'days'
  // For send_email (UI uses 'subject'/'body', executor used email_*)
  subject?: string
  body?: string
  email_to?: 'contact_email' | 'custom'
  custom_email?: string
  email_subject?: string
  email_body?: string
  nylas_grant_id?: string  // Specific grant ID to use for sending
  email_cc?: string  // Comma-separated CC emails
  email_bcc?: string  // Comma-separated BCC emails
  // For move_lead_stage and create_deal
  name?: string
  pipeline_id?: string
  stage_id?: string
  stage_name?: string
  value?: number
  currency?: string
  expected_close_date_offset?: number
  notes?: string
  link_to_trigger_contact?: boolean
  // For update_deal, move_deal_stage, close_deal
  deal_source?: 'trigger' | 'most_recent'
  probability?: number
  notes_mode?: 'append' | 'replace'
  auto_update_probability?: boolean
  outcome?: 'won' | 'lost'
  close_reason?: string
  auto_set_close_date?: boolean
  // For add_tag / remove_tag
  tags?: Array<{ id: string; name: string; color?: string }>
  remove_all?: boolean
  // For log_activity
  activity_type?: 'call' | 'email' | 'meeting' | 'note' | 'task'
  activity_subject?: string
  activity_description?: string
  activity_completed?: boolean
}

export interface ExecutionResult {
  success: boolean
  actionType: ActionType
  actionId: string
  error?: string
  data?: Record<string, unknown>
  executedAt: string
}

interface WorkflowExecution {
  id: string
  workflow_id: string
  user_id: string
  trigger_type: TriggerType
  trigger_context: Record<string, unknown>
  status: 'running' | 'completed' | 'failed' | 'paused'
  started_at: string
  completed_at?: string
  action_results: ExecutionResult[]
  error_message?: string
}

/**
 * Replace template variables in a string with context values
 */
function replaceTemplateVariables(template: string, context: WorkflowContext): string {
  let result = template

  // Lead variables
  if (context.lead) {
    result = result.replace(/\{\{lead_name\}\}/g, context.lead.name || '')
    result = result.replace(/\{\{lead_status\}\}/g, context.lead.status || '')
  }

  // Contact variables
  if (context.contact) {
    result = result.replace(/\{\{contact_name\}\}/g,
      `${context.contact.first_name} ${context.contact.last_name || ''}`.trim())
    result = result.replace(/\{\{contact_first_name\}\}/g, context.contact.first_name || '')
    result = result.replace(/\{\{contact_last_name\}\}/g, context.contact.last_name || '')
    result = result.replace(/\{\{contact_email\}\}/g, context.contact.email || '')
  }

  // Deal variables
  if (context.deal) {
    result = result.replace(/\{\{deal_name\}\}/g, context.deal.name || '')
    result = result.replace(/\{\{deal_status\}\}/g, context.deal.status || '')
    result = result.replace(/\{\{deal_value\}\}/g, (context.deal as { value?: number }).value?.toString() || '')
  }

  return result
}

/**
 * Resolve which opportunity ID to use based on deal_source config
 * Opportunities are linked to leads, so we resolve via lead_id
 */
async function resolveOpportunityId(
  config: ActionConfig,
  context: WorkflowContext
): Promise<string | null> {
  // If deal_source is 'trigger' and we have a dealId from context, use it
  if (config.deal_source === 'trigger') {
    return context.dealId || context.deal?.id || null
  }

  // Otherwise, find the most recent opportunity for this lead
  if (!context.leadId) {
    return null
  }

  const supabase = createAdminClient()
  let query = supabase
    .from('lead_opportunities')
    .select('id')
    .eq('lead_id', context.leadId)
    .eq('user_id', context.userId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (context.workspaceId) {
    query = query.eq('workspace_id', context.workspaceId)
  }

  const { data: opportunity, error } = await query.single()

  if (error) {
    // PGRST116 = "no rows returned" which is expected; log other errors
    if (error.code !== 'PGRST116') {
      console.error('[Workflows] Error resolving opportunity:', error)
    }
    return null
  }

  return opportunity?.id || null
}

/**
 * Get the phone number to use based on action config
 */
function getPhoneNumber(config: ActionConfig, context: WorkflowContext): string | null {
  let phone: string | null = null
  switch (config.phone_source) {
    case 'custom':
      phone = config.custom_phone || null
      break
    case 'contact_phone':
    default:
      phone = context.contact?.phone || null
      break
  }
  // Basic validation: only digits, spaces, dashes, parens, dots, and optional leading +
  if (phone && !/^\+?[\d\s\-().]+$/.test(phone)) {
    return null
  }
  return phone
}

/**
 * Create an execution record when workflow starts
 */
async function createExecutionRecord(
  workflowId: string,
  userId: string,
  triggerType: TriggerType,
  context: WorkflowContext
): Promise<string | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_id: workflowId,
      user_id: userId,
      workspace_id: context.workspaceId || null,
      trigger_type: triggerType,
      trigger_context: {
        leadId: context.leadId,
        contactId: context.contactId,
        dealId: context.dealId,
        lead: context.lead,
        contact: context.contact,
        deal: context.deal,
      },
      status: 'running',
      action_results: [],
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating execution record:', error)
    return null
  }

  return data.id
}

/**
 * Update execution record with results
 */
async function updateExecutionRecord(
  executionId: string,
  status: 'completed' | 'failed' | 'paused' | 'running',
  results: ExecutionResult[],
  errorMessage?: string
): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('workflow_executions')
    .update({
      status,
      completed_at: status !== 'paused' ? new Date().toISOString() : null,
      action_results: results,
      error_message: errorMessage,
    })
    .eq('id', executionId)
}

/**
 * Execute a single workflow action
 */
export async function executeWorkflowAction(
  action: WorkflowAction,
  context: WorkflowContext,
  workflowId: string
): Promise<ExecutionResult> {
  const config = action.config as ActionConfig
  const supabase = createAdminClient()
  const executedAt = new Date().toISOString()

  try {
    switch (action.type) {
      case 'send_sms': {
        const phone = getPhoneNumber(config, context)
        if (!phone) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No phone number available for SMS',
            executedAt,
          }
        }

        const formattedPhone = formatE164(phone)
        const message = replaceTemplateVariables(config.message || '', context)

        if (!message) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No message content provided',
            executedAt,
          }
        }

        // Resolve workspaceId from lead record for credit billing
        let smsWorkspaceId: string | null = null
        if (context.leadId) {
          const { data: leadRecord } = await supabase
            .from('leads')
            .select('workspace_id')
            .eq('id', context.leadId)
            .single()
          smsWorkspaceId = leadRecord?.workspace_id || null
        }

        if (!smsWorkspaceId) {
          console.warn(`[Workflows] No workspace found for SMS action in workflow ${workflowId}`)
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No workspace found for billing — cannot send SMS',
            executedAt,
          }
        }

        const fromNumber = getTwilioPhoneNumber()

        // Create communication record
        const { data: comm } = await supabase
          .from('communications')
          .insert({
            user_id: context.userId,
            lead_id: context.leadId || null,
            contact_id: context.contactId || null,
            type: 'sms',
            direction: 'outbound',
            from_number: fromNumber,
            to_number: formattedPhone,
            body: message,
            twilio_status: 'pending',
            triggered_by: 'workflow',
            workflow_id: workflowId,
            workspace_id: smsWorkspaceId,
          })
          .select()
          .single()

        // Send via Twilio with credit check and deduction
        const result = await sendSMSWithCredits({
          workspaceId: smsWorkspaceId,
          to: formattedPhone,
          from: fromNumber,
          body: message,
        })

        // Update status
        if (comm) {
          const { error: updateError } = await supabase
            .from('communications')
            .update({
              twilio_sid: result.messageSid || null,
              twilio_status: result.success ? 'queued' : 'failed',
              error_message: result.error,
            })
            .eq('id', comm.id)

          if (updateError) {
            console.error(`[Workflows] Error updating communication ${comm.id}:`, updateError)
          }
        }

        if (!result.success) {
          console.warn(`[Workflows] SMS credit check failed in workflow ${workflowId}: ${result.error}`)
        }

        return {
          success: result.success,
          actionType: action.type,
          actionId: action.id,
          error: result.error,
          data: { messageSid: result.messageSid, communicationId: comm?.id, creditsUsed: result.creditsUsed },
          executedAt,
        }
      }

      case 'update_status': {
        // UI saves as 'status', also check 'new_status' for backwards compatibility
        const newStatus = config.status || config.new_status
        if (!newStatus) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No new status specified',
            executedAt,
          }
        }

        // Update lead status if we have a lead
        if (context.leadId) {
          const { error } = await supabase
            .from('leads')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', context.leadId)
            .eq('user_id', context.userId)

          if (error) {
            return {
              success: false,
              actionType: action.type,
              actionId: action.id,
              error: `Failed to update lead status: ${error.message}`,
              executedAt,
            }
          }

          return {
            success: true,
            actionType: action.type,
            actionId: action.id,
            data: { leadId: context.leadId, newStatus },
            executedAt,
          }
        }

        // Update deal status if we have a deal
        if (context.dealId) {
          const { error } = await supabase
            .from('deals')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', context.dealId)
            .eq('profile_id', context.userId)

          if (error) {
            return {
              success: false,
              actionType: action.type,
              actionId: action.id,
              error: `Failed to update deal status: ${error.message}`,
              executedAt,
            }
          }

          return {
            success: true,
            actionType: action.type,
            actionId: action.id,
            data: { dealId: context.dealId, newStatus },
            executedAt,
          }
        }

        return {
          success: false,
          actionType: action.type,
          actionId: action.id,
          error: 'No lead or deal to update status for',
          executedAt,
        }
      }

      case 'add_note': {
        // UI saves as 'note', also check 'note_content' for backwards compatibility
        const noteContent = replaceTemplateVariables(config.note || config.note_content || '', context)

        if (!noteContent) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No note content provided',
            executedAt,
          }
        }

        // Activities require a contact_id - get from context or find one from the lead
        let contactId = context.contactId
        if (!contactId && context.leadId) {
          const { data: contacts } = await supabase
            .from('contacts')
            .select('id')
            .eq('lead_id', context.leadId)
            .limit(1)
          contactId = contacts?.[0]?.id
        }

        if (!contactId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No contact found to add note to',
            executedAt,
          }
        }

        // Insert into activities table (notes appear in Notes & Summaries section)
        const { data, error } = await supabase
          .from('activities')
          .insert({
            profile_id: context.userId,
            workspace_id: context.workspaceId || null,
            type: 'note',
            subject: 'Workflow Note',
            description: noteContent,
            contact_id: contactId,
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (error) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Failed to add note: ${error.message}`,
            executedAt,
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { activityId: data.id, contactId },
          executedAt,
        }
      }

      case 'create_task': {
        // UI saves as 'title'/'description', also check 'task_title'/'task_description' for backwards compatibility
        const taskTitle = replaceTemplateVariables(config.title || config.task_title || '', context)
        const taskDescription = replaceTemplateVariables(config.description || config.task_description || '', context)

        if (!taskTitle) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No task title provided',
            executedAt,
          }
        }

        // Calculate due date
        let dueDate = null
        if (config.due_days && config.due_days > 0) {
          const due = new Date()
          due.setDate(due.getDate() + config.due_days)
          dueDate = due.toISOString()
        }

        if (context.leadId) {
          const { data, error } = await supabase
            .from('lead_tasks')
            .insert({
              lead_id: context.leadId,
              user_id: context.userId,
              workspace_id: context.workspaceId || null,
              title: taskTitle,
              description: taskDescription || null,
              is_completed: false,
              due_date: dueDate,
            })
            .select('id')
            .single()

          if (error) {
            return {
              success: false,
              actionType: action.type,
              actionId: action.id,
              error: `Failed to create task: ${error.message}`,
              executedAt,
            }
          }

          return {
            success: true,
            actionType: action.type,
            actionId: action.id,
            data: { taskId: data.id, leadId: context.leadId },
            executedAt,
          }
        }

        return {
          success: false,
          actionType: action.type,
          actionId: action.id,
          error: 'No lead to create task for',
          executedAt,
        }
      }

      case 'assign_user': {
        if (!context.leadId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No lead to assign',
            executedAt,
          }
        }

        let assignedUserId = config.assigned_user_id

        if (config.assignment_type !== 'specific') {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Assignment type "${config.assignment_type}" is not yet implemented. Use "specific" with an assigned_user_id.`,
            executedAt,
          }
        }

        if (!assignedUserId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No assigned_user_id provided for specific assignment',
            executedAt,
          }
        }

        const { error } = await supabase
          .from('leads')
          .update({
            assigned_to: assignedUserId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', context.leadId)
          .eq('user_id', context.userId)

        if (error) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Failed to assign user: ${error.message}`,
            executedAt,
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { leadId: context.leadId, assignedTo: assignedUserId },
          executedAt,
        }
      }

      case 'send_notification': {
        // For now, we'll log the notification - in the future this could
        // integrate with a real notification system or push notifications
        // UI saves as 'title'/'message', also check notification_* for backwards compatibility
        const title = replaceTemplateVariables(config.title || config.notification_title || '', context)
        const message = replaceTemplateVariables(config.message || config.notification_message || '', context)

        if (!title || !message) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'Notification title and message are required',
            executedAt,
          }
        }

        // Log as console for now - could be extended to real notifications
        console.log(`[Workflow Notification] ${title}: ${message}`)

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { title, message, note: 'Notification logged (no push system configured)' },
          executedAt,
        }
      }

      case 'send_email': {
        // Email sending is intentionally unmetered — messages are sent through the
        // user's own connected Nylas/email account, not a platform credit system.
        // Check if Nylas is configured
        if (!isNylasConfigured()) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'Nylas email is not configured',
            executedAt,
          }
        }

        // Get recipient email
        let recipientEmail: string | null = null
        if (config.email_to === 'custom' && config.custom_email) {
          recipientEmail = config.custom_email
        } else {
          // Default to contact email
          recipientEmail = context.contact?.email || null
        }

        if (!recipientEmail) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No recipient email available',
            executedAt,
          }
        }

        // UI saves as 'subject'/'body', also check email_* for backwards compatibility
        const emailSubject = replaceTemplateVariables(config.subject || config.email_subject || '', context)
        const emailBody = replaceTemplateVariables(config.body || config.email_body || '', context)

        if (!emailSubject || !emailBody) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'Email subject and body are required',
            executedAt,
          }
        }

        // Get the user's Nylas grant - use specified grant or fall back to first one
        let grantId: string | null = null

        if (config.nylas_grant_id) {
          // Verify the specified grant belongs to this user
          const { data: specifiedGrant, error: specifiedError } = await supabase
            .from('nylas_grants')
            .select('grant_id')
            .eq('id', config.nylas_grant_id)
            .eq('user_id', context.userId)
            .single()

          if (!specifiedError && specifiedGrant) {
            grantId = specifiedGrant.grant_id
          }
        }

        if (!grantId) {
          // Fall back to user's first grant
          const { data: nylasGrant, error: grantError } = await supabase
            .from('nylas_grants')
            .select('grant_id')
            .eq('user_id', context.userId)
            .limit(1)
            .single()

          if (grantError || !nylasGrant) {
            return {
              success: false,
              actionType: action.type,
              actionId: action.id,
              error: 'No connected email account found. Please connect your email in Settings.',
              executedAt,
            }
          }
          grantId = nylasGrant.grant_id
        }

        // Parse CC/BCC emails
        const ccEmails = config.email_cc
          ? config.email_cc.split(',').map(e => ({ email: e.trim() })).filter(e => e.email)
          : undefined
        const bccEmails = config.email_bcc
          ? config.email_bcc.split(',').map(e => ({ email: e.trim() })).filter(e => e.email)
          : undefined

        // Send email via Nylas (grantId is guaranteed to be non-null after the checks above)
        const emailResult = await sendNylasEmail(grantId!, {
          to: [{ email: recipientEmail }],
          cc: ccEmails,
          bcc: bccEmails,
          subject: emailSubject,
          body: emailBody,
        })

        if (!emailResult.success) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: emailResult.error || 'Failed to send email',
            executedAt,
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: {
            messageId: emailResult.data?.id,
            to: recipientEmail,
            subject: emailSubject,
          },
          executedAt,
        }
      }

      case 'wait':
        // Wait actions are handled specially in executeWorkflow
        // If we reach here, it means we're resuming after a wait
        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { waitCompleted: true },
          executedAt,
        }

      case 'condition':
        // Condition actions are handled in the main execution loop (executeWorkflowActions)
        // This should not be called directly - if it is, return success
        // The actual condition evaluation happens in executeWorkflowActions
        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { note: 'Condition evaluated in main loop' },
          executedAt,
        }

      case 'move_lead_stage': {
        if (!context.leadId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No lead found in workflow context',
            executedAt,
          }
        }

        if (!config.pipeline_id || !config.stage_id) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'Pipeline and stage are required',
            executedAt,
          }
        }

        // Get stage details to update status
        const { data: stage, error: stageError } = await supabase
          .from('lead_pipeline_stages')
          .select('name, is_won, is_lost')
          .eq('id', config.stage_id)
          .single()

        if (stageError || !stage) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Stage not found: ${stageError?.message || config.stage_id}`,
            executedAt,
          }
        }

        // Update lead with new pipeline, stage, and derived status
        const { error } = await supabase
          .from('leads')
          .update({
            pipeline_id: config.pipeline_id,
            stage_id: config.stage_id,
            status: stage?.name?.toLowerCase().replace(/\s+/g, '_') || 'new',
            updated_at: new Date().toISOString(),
          })
          .eq('id', context.leadId)
          .eq('user_id', context.userId)

        if (error) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: error.message,
            executedAt,
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: {
            leadId: context.leadId,
            pipelineId: config.pipeline_id,
            stageId: config.stage_id,
            stageName: stage?.name,
          },
          executedAt,
        }
      }

      case 'create_deal': {
        const opportunityName = replaceTemplateVariables(config.name || 'New Opportunity', context)

        if (!context.leadId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No lead found to create opportunity for',
            executedAt,
          }
        }

        // Calculate expected close date if offset is provided
        let expectedCloseDate: string | null = null
        if (config.expected_close_date_offset && config.expected_close_date_offset > 0) {
          const closeDate = new Date()
          closeDate.setDate(closeDate.getDate() + config.expected_close_date_offset)
          expectedCloseDate = closeDate.toISOString().split('T')[0]
        }

        // If pipeline_id provided, move lead to that pipeline and stage
        if (config.pipeline_id) {
          let stageId = config.stage_id
          if (!stageId) {
            // Get the first stage of the pipeline
            const { data: firstStage } = await supabase
              .from('lead_pipeline_stages')
              .select('id')
              .eq('pipeline_id', config.pipeline_id)
              .order('position', { ascending: true })
              .limit(1)
              .single()

            if (firstStage) {
              stageId = firstStage.id
            }
          }

          // Update lead's pipeline and stage
          await supabase
            .from('leads')
            .update({
              pipeline_id: config.pipeline_id,
              stage_id: stageId || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', context.leadId)
            .eq('user_id', context.userId)
        }

        const contactId = config.link_to_trigger_contact !== false ? context.contactId : null

        // Get workspace_id from lead
        const { data: lead } = await supabase
          .from('leads')
          .select('workspace_id')
          .eq('id', context.leadId)
          .single()

        const { data: opportunity, error } = await supabase
          .from('lead_opportunities')
          .insert({
            lead_id: context.leadId,
            user_id: context.userId,
            workspace_id: lead?.workspace_id || null,
            name: opportunityName,
            value: config.value || null,
            probability: 0,
            expected_close_date: expectedCloseDate,
            notes: config.notes || null,
            status: 'active',
            value_type: 'one_time',
            contact_id: contactId || null,
          })
          .select('id, name')
          .single()

        if (error) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Failed to create opportunity: ${error.message}`,
            executedAt,
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { opportunityId: opportunity.id, opportunityName: opportunity.name },
          executedAt,
        }
      }

      case 'update_deal': {
        const opportunityId = await resolveOpportunityId(config, context)

        if (!opportunityId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No opportunity found to update',
            executedAt,
          }
        }

        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        }

        if (config.value !== undefined) {
          updates.value = config.value
        }

        if (config.probability !== undefined) {
          updates.probability = config.probability
        }

        if (config.expected_close_date_offset !== undefined) {
          const closeDate = new Date()
          closeDate.setDate(closeDate.getDate() + config.expected_close_date_offset)
          updates.expected_close_date = closeDate.toISOString().split('T')[0]
        }

        if (config.notes) {
          if (config.notes_mode === 'replace') {
            updates.notes = config.notes
          } else {
            // Append mode - get existing notes first
            const { data: existingOpportunity } = await supabase
              .from('lead_opportunities')
              .select('notes')
              .eq('id', opportunityId)
              .single()

            const existingNotes = existingOpportunity?.notes || ''
            updates.notes = existingNotes
              ? `${existingNotes}\n\n${config.notes}`
              : config.notes
          }
        }

        const { error } = await supabase
          .from('lead_opportunities')
          .update(updates)
          .eq('id', opportunityId)
          .eq('user_id', context.userId)

        if (error) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Failed to update opportunity: ${error.message}`,
            executedAt,
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { opportunityId, updatedFields: Object.keys(updates) },
          executedAt,
        }
      }

      case 'move_deal_stage': {
        // In this data model, opportunities are linked to leads, and the lead has the stage
        // So we move the lead's stage when "moving" an opportunity

        if (!context.leadId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No lead found to move stage',
            executedAt,
          }
        }

        if (!config.pipeline_id || !config.stage_id) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'Pipeline and stage are required',
            executedAt,
          }
        }

        // Get stage info for auto-probability update on opportunities
        let shouldUpdateProbability = false
        let stageIsWon = false
        let stageIsLost = false

        if (config.auto_update_probability !== false) {
          const { data: stage } = await supabase
            .from('lead_pipeline_stages')
            .select('is_won, is_lost')
            .eq('id', config.stage_id)
            .single()

          if (stage) {
            shouldUpdateProbability = true
            stageIsWon = stage.is_won
            stageIsLost = stage.is_lost
          }
        }

        // Update the lead's pipeline and stage
        const { error } = await supabase
          .from('leads')
          .update({
            pipeline_id: config.pipeline_id,
            stage_id: config.stage_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', context.leadId)
          .eq('user_id', context.userId)

        if (error) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Failed to move stage: ${error.message}`,
            executedAt,
          }
        }

        // Optionally update opportunity probabilities based on won/lost stage
        if (shouldUpdateProbability) {
          const newProbability = stageIsWon ? 100 : (stageIsLost ? 0 : undefined)
          const newStatus = stageIsWon ? 'won' : (stageIsLost ? 'lost' : undefined)

          if (newProbability !== undefined || newStatus !== undefined) {
            const oppUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
            if (newProbability !== undefined) oppUpdates.probability = newProbability
            if (newStatus !== undefined) oppUpdates.status = newStatus

            await supabase
              .from('lead_opportunities')
              .update(oppUpdates)
              .eq('lead_id', context.leadId)
              .eq('user_id', context.userId)
              .eq('status', 'active') // Only update active opportunities
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { leadId: context.leadId, newStageId: config.stage_id },
          executedAt,
        }
      }

      case 'close_deal': {
        const opportunityId = await resolveOpportunityId(config, context)

        if (!opportunityId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No opportunity found to close',
            executedAt,
          }
        }

        if (!config.outcome) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'Outcome (won/lost) is required',
            executedAt,
          }
        }

        const updates: Record<string, unknown> = {
          status: config.outcome,
          probability: config.outcome === 'won' ? 100 : 0,
          updated_at: new Date().toISOString(),
        }

        if (config.auto_set_close_date !== false) {
          updates.closed_at = new Date().toISOString()
        }

        if (config.close_reason) {
          // Append close reason to notes
          const { data: existingOpportunity } = await supabase
            .from('lead_opportunities')
            .select('notes')
            .eq('id', opportunityId)
            .single()

          const existingNotes = existingOpportunity?.notes || ''
          const closeNote = `[${config.outcome.toUpperCase()}] ${config.close_reason}`
          updates.notes = existingNotes
            ? `${existingNotes}\n\n${closeNote}`
            : closeNote
        }

        const { error } = await supabase
          .from('lead_opportunities')
          .update(updates)
          .eq('id', opportunityId)
          .eq('user_id', context.userId)

        if (error) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Failed to close opportunity: ${error.message}`,
            executedAt,
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { opportunityId, outcome: config.outcome },
          executedAt,
        }
      }

      case 'add_tag': {
        if (!context.leadId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No lead to add tags to',
            executedAt,
          }
        }

        const tags = config.tags
        if (!tags || tags.length === 0) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No tags specified',
            executedAt,
          }
        }

        // Insert tag assignments (ignore duplicates with upsert)
        const assignments = tags.map(tag => ({
          lead_id: context.leadId,
          tag_id: tag.id,
        }))

        const { error } = await supabase
          .from('lead_tag_assignments')
          .upsert(assignments, { onConflict: 'lead_id,tag_id', ignoreDuplicates: true })

        if (error) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Failed to add tags: ${error.message}`,
            executedAt,
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { leadId: context.leadId, tagsAdded: tags.map(t => t.name) },
          executedAt,
        }
      }

      case 'remove_tag': {
        if (!context.leadId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No lead to remove tags from',
            executedAt,
          }
        }

        // Check if removing all tags
        if (config.remove_all) {
          const { error } = await supabase
            .from('lead_tag_assignments')
            .delete()
            .eq('lead_id', context.leadId)

          if (error) {
            return {
              success: false,
              actionType: action.type,
              actionId: action.id,
              error: `Failed to remove tags: ${error.message}`,
              executedAt,
            }
          }

          return {
            success: true,
            actionType: action.type,
            actionId: action.id,
            data: { leadId: context.leadId, removedAll: true },
            executedAt,
          }
        }

        // Remove specific tags
        const tags = config.tags
        if (!tags || tags.length === 0) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No tags specified to remove',
            executedAt,
          }
        }

        const tagIds = tags.map(t => t.id)

        const { error } = await supabase
          .from('lead_tag_assignments')
          .delete()
          .eq('lead_id', context.leadId)
          .in('tag_id', tagIds)

        if (error) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Failed to remove tags: ${error.message}`,
            executedAt,
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: { leadId: context.leadId, tagsRemoved: tags.map(t => t.name) },
          executedAt,
        }
      }

      case 'log_activity': {
        // Get activity type, default to 'note'
        const activityType = config.activity_type || 'note'
        const activitySubject = replaceTemplateVariables(config.activity_subject || `Workflow ${activityType}`, context)
        const activityDescription = config.activity_description
          ? replaceTemplateVariables(config.activity_description, context)
          : null
        const isCompleted = config.activity_completed !== false // default to true

        // Activities require a contact_id - get from context or find one from the lead
        let contactId = context.contactId
        if (!contactId && context.leadId) {
          const { data: contacts } = await supabase
            .from('contacts')
            .select('id')
            .eq('lead_id', context.leadId)
            .limit(1)
          contactId = contacts?.[0]?.id
        }

        if (!contactId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No contact found to log activity for',
            executedAt,
          }
        }

        const { data, error } = await supabase
          .from('activities')
          .insert({
            profile_id: context.userId,
            workspace_id: context.workspaceId || null,
            type: activityType,
            subject: activitySubject,
            description: activityDescription,
            contact_id: contactId,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
          })
          .select('id')
          .single()

        if (error) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: `Failed to log activity: ${error.message}`,
            executedAt,
          }
        }

        return {
          success: true,
          actionType: action.type,
          actionId: action.id,
          data: {
            activityId: data.id,
            contactId,
            activityType,
            subject: activitySubject,
            isCompleted,
          },
          executedAt,
        }
      }

      default:
        return {
          success: false,
          actionType: action.type,
          actionId: action.id,
          error: `Unknown action type: ${action.type}`,
          executedAt,
        }
    }
  } catch (error) {
    console.error(`Error executing workflow action ${action.type}:`, error)
    return {
      success: false,
      actionType: action.type,
      actionId: action.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      executedAt,
    }
  }
}

/**
 * Calculate scheduled time for a wait action
 */
function calculateScheduledTime(config: ActionConfig): Date {
  const now = new Date()
  const duration = config.wait_duration || 1
  const unit = config.wait_unit || 'hours'

  switch (unit) {
    case 'minutes':
      now.setMinutes(now.getMinutes() + duration)
      break
    case 'hours':
      now.setHours(now.getHours() + duration)
      break
    case 'days':
      now.setDate(now.getDate() + duration)
      break
  }

  return now
}

/**
 * Create a scheduled action record for resuming after a wait
 */
async function createScheduledAction(
  executionId: string,
  workflowId: string,
  userId: string,
  actionIndex: number,
  remainingActions: WorkflowAction[],
  context: WorkflowContext,
  scheduledFor: Date
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('workflow_scheduled_actions').insert({
    execution_id: executionId,
    workflow_id: workflowId,
    user_id: userId,
    workspace_id: context.workspaceId || null,
    action_index: actionIndex,
    remaining_actions: remainingActions,
    workflow_context: context,
    scheduled_for: scheduledFor.toISOString(),
    status: 'pending',
  })
}

/**
 * Helper to execute actions recursively, handling conditions
 * Returns { results, paused, remainingActions } where paused is true if a wait was encountered
 */
interface ExecuteActionsResult {
  results: ExecutionResult[]
  paused: boolean
  remainingActions?: WorkflowAction[]
  scheduledTime?: Date
}

async function executeActionsRecursive(
  actions: WorkflowAction[],
  context: WorkflowContext,
  workflowId: string,
  previousResults: ExecutionResult[],
  executionId: string | null,
  updateProgress: (results: ExecutionResult[]) => Promise<void>
): Promise<ExecuteActionsResult> {
  const results: ExecutionResult[] = [...previousResults]
  const sortedActions = [...actions].sort((a, b) => a.order - b.order)

  for (let i = 0; i < sortedActions.length; i++) {
    const action = sortedActions[i]
    const executedAt = new Date().toISOString()

    // Handle wait actions - pause execution
    if (action.type === 'wait') {
      const config = action.config as ActionConfig
      const scheduledTime = calculateScheduledTime(config)

      results.push({
        success: true,
        actionType: action.type,
        actionId: action.id,
        data: {
          scheduledFor: scheduledTime.toISOString(),
          duration: config.wait_duration,
          unit: config.wait_unit,
        },
        executedAt,
      })

      const remainingActions = sortedActions.slice(i + 1)
      return {
        results,
        paused: remainingActions.length > 0,
        remainingActions,
        scheduledTime,
      }
    }

    // Handle condition actions - evaluate and execute appropriate branch
    if (action.type === 'condition') {
      if (!isConditionActionConfig(action.config)) {
        results.push({
          success: false,
          actionType: action.type,
          actionId: action.id,
          error: 'Invalid condition configuration',
          executedAt,
        })
        continue
      }

      // Safe to cast — shape validated by isConditionActionConfig above
      const condConfig = action.config as unknown as ConditionActionConfig

      // Validate condition is configured
      if (!condConfig.condition?.field_path || !condConfig.condition?.operator) {
        results.push({
          success: false,
          actionType: action.type,
          actionId: action.id,
          error: 'Condition not configured - missing field or operator',
          executedAt,
        })
        continue
      }

      // Evaluate the condition
      const conditionMet = evaluateCondition(condConfig.condition, context, results)

      // Record the condition evaluation result
      results.push({
        success: true,
        actionType: action.type,
        actionId: action.id,
        data: {
          conditionMet,
          field: condConfig.condition.field_path,
          operator: condConfig.condition.operator,
          expectedValue: condConfig.condition.value,
        },
        executedAt,
      })

      await updateProgress(results)

      // Execute the appropriate branch
      const branchActions = conditionMet
        ? (condConfig.if_branch || [])
        : (condConfig.else_branch || [])

      if (branchActions.length > 0) {
        const branchResult = await executeActionsRecursive(
          branchActions,
          context,
          workflowId,
          results,
          executionId,
          updateProgress
        )

        // If branch paused on a wait, we need to handle that
        if (branchResult.paused) {
          // The remaining branch actions plus remaining top-level actions
          const topLevelRemaining = sortedActions.slice(i + 1)
          return {
            results: branchResult.results,
            paused: true,
            remainingActions: [...(branchResult.remainingActions || []), ...topLevelRemaining],
            scheduledTime: branchResult.scheduledTime,
          }
        }

        // Branch completed — replace results with branch output.
        // branchResult.results is a superset (it was seeded with `results` via previousResults),
        // so this avoids double-counting earlier actions.
        results.length = 0
        results.push(...branchResult.results)
      }

      continue
    }

    // Execute regular action
    const result = await executeWorkflowAction(action, context, workflowId)
    results.push(result)

    await updateProgress(results)
  }

  return { results, paused: false }
}

/**
 * Execute all actions in a workflow with execution logging
 */
export async function executeWorkflow(
  workflowId: string,
  actions: WorkflowAction[],
  context: WorkflowContext,
  triggerType: TriggerType = 'lead_created'
): Promise<ExecutionResult[]> {
  // Create execution record
  const executionId = await createExecutionRecord(
    workflowId,
    context.userId,
    triggerType,
    context
  )

  // Helper to update progress
  const updateProgress = async (results: ExecutionResult[]) => {
    if (executionId) {
      await updateExecutionRecord(executionId, 'running', results)
    }
  }

  // Execute actions recursively (handles conditions and waits)
  const { results, paused, remainingActions, scheduledTime } = await executeActionsRecursive(
    actions,
    context,
    workflowId,
    [],
    executionId,
    updateProgress
  )

  // Check if we paused for a wait action
  if (paused && remainingActions && remainingActions.length > 0 && executionId && scheduledTime) {
    await createScheduledAction(
      executionId,
      workflowId,
      context.userId,
      0, // Index doesn't matter much for nested structures
      remainingActions,
      context,
      scheduledTime
    )

    await updateExecutionRecord(executionId, 'paused', results)

    console.log(
      `[Workflows] Paused workflow ${workflowId} - resuming at ${scheduledTime.toISOString()}`
    )

    return results
  }

  // Check for any errors in results
  const hasError = results.some(r => !r.success)

  // Finalize execution record
  if (executionId) {
    await updateExecutionRecord(
      executionId,
      hasError ? 'failed' : 'completed',
      results,
      hasError ? 'One or more actions failed' : undefined
    )
  }

  return results
}

/**
 * Resume a paused workflow from a specific action index
 * Used when processing scheduled/delayed actions
 */
export async function resumeWorkflow(
  executionId: string,
  workflowId: string,
  remainingActions: WorkflowAction[],
  context: WorkflowContext,
  previousResults: ExecutionResult[] = []
): Promise<ExecutionResult[]> {
  // Helper to update progress
  const updateProgress = async (results: ExecutionResult[]) => {
    await updateExecutionRecord(executionId, 'running', results)
  }

  // Execute remaining actions recursively (handles conditions and waits)
  const { results, paused, remainingActions: moreRemaining, scheduledTime } = await executeActionsRecursive(
    remainingActions,
    context,
    workflowId,
    previousResults,
    executionId,
    updateProgress
  )

  // Check if we paused again for another wait action
  if (paused && moreRemaining && moreRemaining.length > 0 && scheduledTime) {
    await createScheduledAction(
      executionId,
      workflowId,
      context.userId,
      0,
      moreRemaining,
      context,
      scheduledTime
    )

    await updateExecutionRecord(executionId, 'paused', results)

    console.log(
      `[Workflows] Paused workflow ${workflowId} again - resuming at ${scheduledTime.toISOString()}`
    )

    return results
  }

  // Check for any errors in results
  const hasError = results.some(r => !r.success)

  // Finalize execution record
  await updateExecutionRecord(
    executionId,
    hasError ? 'failed' : 'completed',
    results,
    hasError ? 'One or more actions failed' : undefined
  )

  return results
}

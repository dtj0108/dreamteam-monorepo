import { sendSMS, makeCall, formatE164, getTwilioPhoneNumber } from './twilio'
import { createAdminClient } from './supabase-server'
import type { WorkflowAction, ActionType, TriggerType } from '@/types/workflow'

export interface WorkflowContext {
  userId: string
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
}

interface ActionConfig {
  phone_source?: 'lead_phone' | 'contact_phone' | 'custom'
  custom_phone?: string
  message?: string
  record?: boolean
  // For update_status
  new_status?: string
  // For add_note
  note_content?: string
  // For create_task
  task_title?: string
  task_description?: string
  due_days?: number
  priority?: 'low' | 'medium' | 'high'
  // For assign_user
  assignment_type?: 'round_robin' | 'specific' | 'least_leads'
  assigned_user_id?: string
  // For send_notification
  notification_title?: string
  notification_message?: string
  // For wait
  wait_duration?: number
  wait_unit?: 'minutes' | 'hours' | 'days'
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
  }

  return result
}

/**
 * Get the phone number to use based on action config
 */
function getPhoneNumber(config: ActionConfig, context: WorkflowContext): string | null {
  switch (config.phone_source) {
    case 'custom':
      return config.custom_phone || null
    case 'contact_phone':
    default:
      return context.contact?.phone || null
  }
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

        // Create communication record
        const { data: comm } = await supabase
          .from('communications')
          .insert({
            user_id: context.userId,
            lead_id: context.leadId || null,
            contact_id: context.contactId || null,
            type: 'sms',
            direction: 'outbound',
            from_number: getTwilioPhoneNumber(),
            to_number: formattedPhone,
            body: message,
            twilio_status: 'pending',
            triggered_by: 'workflow',
            workflow_id: workflowId,
          })
          .select()
          .single()

        // Send via Twilio
        const result = await sendSMS({
          to: formattedPhone,
          body: message,
        })

        // Update status
        if (comm) {
          await supabase
            .from('communications')
            .update({
              twilio_sid: result.sid,
              twilio_status: result.success ? result.status : 'failed',
              error_message: result.error,
            })
            .eq('id', comm.id)
        }

        return {
          success: result.success,
          actionType: action.type,
          actionId: action.id,
          error: result.error,
          data: { sid: result.sid, communicationId: comm?.id },
          executedAt,
        }
      }

      case 'make_call': {
        const phone = getPhoneNumber(config, context)
        if (!phone) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No phone number available for call',
            executedAt,
          }
        }

        const formattedPhone = formatE164(phone)

        // Create communication record
        const { data: comm } = await supabase
          .from('communications')
          .insert({
            user_id: context.userId,
            lead_id: context.leadId || null,
            contact_id: context.contactId || null,
            type: 'call',
            direction: 'outbound',
            from_number: getTwilioPhoneNumber(),
            to_number: formattedPhone,
            twilio_status: 'pending',
            triggered_by: 'workflow',
            workflow_id: workflowId,
          })
          .select()
          .single()

        // Make call via Twilio
        const result = await makeCall({
          to: formattedPhone,
          record: config.record ?? true,
        })

        // Update status
        if (comm) {
          await supabase
            .from('communications')
            .update({
              twilio_sid: result.sid,
              twilio_status: result.success ? result.status : 'failed',
              error_message: result.error,
            })
            .eq('id', comm.id)
        }

        return {
          success: result.success,
          actionType: action.type,
          actionId: action.id,
          error: result.error,
          data: { sid: result.sid, communicationId: comm?.id },
          executedAt,
        }
      }

      case 'update_status': {
        if (!config.new_status) {
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
            .update({ status: config.new_status, updated_at: new Date().toISOString() })
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
            data: { leadId: context.leadId, newStatus: config.new_status },
            executedAt,
          }
        }

        // Update deal status if we have a deal
        if (context.dealId) {
          const { error } = await supabase
            .from('deals')
            .update({ status: config.new_status, updated_at: new Date().toISOString() })
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
            data: { dealId: context.dealId, newStatus: config.new_status },
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
        const noteContent = replaceTemplateVariables(config.note_content || '', context)

        if (!noteContent) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'No note content provided',
            executedAt,
          }
        }

        // Add note to lead_tasks as a note-type task (or activities if that's the pattern)
        // Looking at the data model, notes are typically stored in activities or lead_tasks
        if (context.leadId) {
          const { data, error } = await supabase
            .from('lead_tasks')
            .insert({
              lead_id: context.leadId,
              user_id: context.userId,
              title: 'Workflow Note',
              description: noteContent,
              type: 'note',
              status: 'completed',
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
            data: { noteId: data.id, leadId: context.leadId },
            executedAt,
          }
        }

        return {
          success: false,
          actionType: action.type,
          actionId: action.id,
          error: 'No lead to add note to',
          executedAt,
        }
      }

      case 'create_task': {
        const taskTitle = replaceTemplateVariables(config.task_title || '', context)
        const taskDescription = replaceTemplateVariables(config.task_description || '', context)

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
              title: taskTitle,
              description: taskDescription || null,
              type: 'task',
              status: 'pending',
              priority: config.priority || 'medium',
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

        // For round_robin or least_leads, we'd need to implement the logic
        // For now, we'll just handle specific user assignment
        if (config.assignment_type !== 'specific' || !assignedUserId) {
          return {
            success: false,
            actionType: action.type,
            actionId: action.id,
            error: 'Only specific user assignment is currently supported',
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
        const title = replaceTemplateVariables(config.notification_title || '', context)
        const message = replaceTemplateVariables(config.notification_message || '', context)

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

      case 'send_email':
        return {
          success: false,
          actionType: action.type,
          actionId: action.id,
          error: 'Email sending not configured - skipping',
          executedAt,
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
        // Condition actions require branching logic
        // For now, return not implemented
        return {
          success: false,
          actionType: action.type,
          actionId: action.id,
          error: 'Condition branching not yet implemented',
          executedAt,
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
    action_index: actionIndex,
    remaining_actions: remainingActions,
    workflow_context: context,
    scheduled_for: scheduledFor.toISOString(),
    status: 'pending',
  })
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
  const results: ExecutionResult[] = []

  // Create execution record
  const executionId = await createExecutionRecord(
    workflowId,
    context.userId,
    triggerType,
    context
  )

  // Sort actions by order
  const sortedActions = [...actions].sort((a, b) => a.order - b.order)

  let hasError = false

  for (let i = 0; i < sortedActions.length; i++) {
    const action = sortedActions[i]

    // Handle wait actions specially
    if (action.type === 'wait') {
      const config = action.config as ActionConfig
      const scheduledTime = calculateScheduledTime(config)

      // Record the wait action as successful
      results.push({
        success: true,
        actionType: action.type,
        actionId: action.id,
        data: {
          scheduledFor: scheduledTime.toISOString(),
          duration: config.wait_duration,
          unit: config.wait_unit,
        },
        executedAt: new Date().toISOString(),
      })

      // Get remaining actions (after this wait)
      const remainingActions = sortedActions.slice(i + 1)

      if (remainingActions.length > 0 && executionId) {
        // Schedule the remaining actions
        await createScheduledAction(
          executionId,
          workflowId,
          context.userId,
          i + 1,
          remainingActions,
          context,
          scheduledTime
        )

        // Mark execution as paused
        await updateExecutionRecord(executionId, 'paused', results)

        console.log(
          `[Workflows] Paused workflow ${workflowId} - resuming at ${scheduledTime.toISOString()}`
        )

        return results
      }

      // No remaining actions, just complete
      continue
    }

    const result = await executeWorkflowAction(action, context, workflowId)
    results.push(result)

    if (!result.success) {
      hasError = true
    }

    // Update execution record with progress
    if (executionId) {
      await updateExecutionRecord(
        executionId,
        'running',
        results
      )
    }
  }

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
  const results: ExecutionResult[] = [...previousResults]

  let hasError = false

  for (const action of remainingActions) {
    const result = await executeWorkflowAction(action, context, workflowId)
    results.push(result)

    if (!result.success) {
      hasError = true
    }

    // Update execution record with progress
    await updateExecutionRecord(
      executionId,
      'running',
      results
    )
  }

  // Finalize execution record
  await updateExecutionRecord(
    executionId,
    hasError ? 'failed' : 'completed',
    results,
    hasError ? 'One or more actions failed' : undefined
  )

  return results
}

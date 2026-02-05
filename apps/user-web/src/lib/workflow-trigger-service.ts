import { createAdminClient } from './supabase-server'
import { executeWorkflow, type WorkflowContext } from './workflow-executor'
import type { Workflow, TriggerType, WorkflowAction } from '@/types/workflow'

export interface Lead {
  id: string
  name: string
  status?: string
  notes?: string
  user_id: string
}

export interface Contact {
  id: string
  first_name: string
  last_name?: string
  email?: string
  phone?: string
}

interface Deal {
  id: string
  name: string
  status?: string
  stage_id?: string
  profile_id: string
  contact_id?: string
}

interface Activity {
  id: string
  type: string  // 'call', 'email', 'meeting', 'note', 'task'
  subject: string
  description?: string
  is_completed: boolean
  completed_at?: string
}

interface LeadTask {
  id: string
  lead_id: string
  title: string
  description?: string
  is_completed: boolean
  completed_at?: string
  due_date?: string
}

export interface Call {
  id: string
  twilio_sid: string
  direction: 'inbound' | 'outbound'
  status: string
  from_number: string
  to_number: string
  duration_seconds?: number
  recording_url?: string
  recording_sid?: string
}

interface TriggerContext {
  userId: string
  lead?: Lead
  contact?: Contact
  deal?: Deal
  activity?: Activity
  leadTask?: LeadTask
  call?: Call
  previousStatus?: string
  previousStageId?: string
}

/**
 * Find all active workflows matching a trigger type for a user
 */
async function findMatchingWorkflows(
  triggerType: TriggerType,
  userId: string
): Promise<Workflow[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('user_id', userId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true)

  if (error) {
    console.error('Error finding matching workflows:', error)
    return []
  }

  return (data || []) as Workflow[]
}

/**
 * Build workflow execution context from trigger context
 */
function buildWorkflowContext(triggerContext: TriggerContext): WorkflowContext {
  const context: WorkflowContext = {
    userId: triggerContext.userId,
  }

  if (triggerContext.lead) {
    context.leadId = triggerContext.lead.id
    context.lead = {
      id: triggerContext.lead.id,
      name: triggerContext.lead.name,
      status: triggerContext.lead.status,
      notes: triggerContext.lead.notes,
    }
  }

  if (triggerContext.contact) {
    context.contactId = triggerContext.contact.id
    context.contact = {
      id: triggerContext.contact.id,
      first_name: triggerContext.contact.first_name,
      last_name: triggerContext.contact.last_name,
      email: triggerContext.contact.email,
      phone: triggerContext.contact.phone,
    }
  }

  if (triggerContext.activity) {
    context.activity = {
      id: triggerContext.activity.id,
      type: triggerContext.activity.type,
      subject: triggerContext.activity.subject,
      is_completed: triggerContext.activity.is_completed,
    }
  }

  if (triggerContext.leadTask) {
    context.leadTask = {
      id: triggerContext.leadTask.id,
      title: triggerContext.leadTask.title,
      is_completed: triggerContext.leadTask.is_completed,
    }
  }

  if (triggerContext.call) {
    context.call = {
      id: triggerContext.call.id,
      twilio_sid: triggerContext.call.twilio_sid,
      direction: triggerContext.call.direction,
      status: triggerContext.call.status,
      from_number: triggerContext.call.from_number,
      to_number: triggerContext.call.to_number,
      duration_seconds: triggerContext.call.duration_seconds,
      recording_url: triggerContext.call.recording_url,
    }
  }

  return context
}

/**
 * Fetch the primary contact for a lead
 */
async function fetchLeadPrimaryContact(leadId: string): Promise<Contact | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as Contact
}

/**
 * Fetch contact by ID
 */
async function fetchContact(contactId: string): Promise<Contact | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone')
    .eq('id', contactId)
    .single()

  if (error || !data) {
    return null
  }

  return data as Contact
}

/**
 * Trigger workflows for a specific event
 * This function is non-blocking - it fires workflows in the background
 */
export async function triggerWorkflows(
  triggerType: TriggerType,
  triggerContext: TriggerContext
): Promise<void> {
  // Find all matching active workflows
  const workflows = await findMatchingWorkflows(triggerType, triggerContext.userId)

  if (workflows.length === 0) {
    return
  }

  console.log(`[Workflows] Triggering ${workflows.length} workflow(s) for ${triggerType}`)

  // Build execution context
  const workflowContext = buildWorkflowContext(triggerContext)

  // Execute each workflow (non-blocking)
  for (const workflow of workflows) {
    // Don't await - fire and forget, results are logged to workflow_executions table
    executeWorkflow(
      workflow.id,
      workflow.actions as WorkflowAction[],
      workflowContext,
      triggerType
    )
      .then((results) => {
        const successCount = results.filter(r => r.success).length
        console.log(
          `[Workflows] Completed workflow "${workflow.name}" (${workflow.id}): ${successCount}/${results.length} actions succeeded`
        )
      })
      .catch((error) => {
        console.error(`[Workflows] Error executing workflow "${workflow.name}" (${workflow.id}):`, error)
      })
  }
}

/**
 * Trigger workflows when a lead is created
 */
export async function triggerLeadCreated(lead: Lead): Promise<void> {
  // Try to fetch the primary contact for this lead
  const contact = await fetchLeadPrimaryContact(lead.id)

  await triggerWorkflows('lead_created', {
    userId: lead.user_id,
    lead,
    contact: contact || undefined,
  })
}

/**
 * Trigger workflows when a lead's status changes
 */
export async function triggerLeadStatusChanged(
  lead: Lead,
  previousStatus: string
): Promise<void> {
  // Only trigger if status actually changed
  if (lead.status === previousStatus) {
    return
  }

  const contact = await fetchLeadPrimaryContact(lead.id)

  await triggerWorkflows('lead_status_changed', {
    userId: lead.user_id,
    lead,
    contact: contact || undefined,
    previousStatus,
  })
}

/**
 * Trigger workflows when a lead's pipeline stage changes
 */
export async function triggerLeadStageChanged(
  lead: Lead & { stage_id?: string },
  previousStageId: string
): Promise<void> {
  // Only trigger if stage actually changed
  if (lead.stage_id === previousStageId) {
    return
  }

  const contact = await fetchLeadPrimaryContact(lead.id)

  await triggerWorkflows('lead_stage_changed', {
    userId: lead.user_id,
    lead,
    contact: contact || undefined,
    previousStageId,
  })
}

/**
 * Trigger workflows when a lead is first contacted
 */
export async function triggerLeadContacted(lead: Lead, contact?: Contact): Promise<void> {
  await triggerWorkflows('lead_contacted', {
    userId: lead.user_id,
    lead,
    contact,
  })
}

/**
 * Trigger workflows when a deal is created
 */
export async function triggerDealCreated(deal: Deal): Promise<void> {
  // Fetch the contact if deal has one
  const contact = deal.contact_id ? await fetchContact(deal.contact_id) : null

  await triggerWorkflows('deal_created', {
    userId: deal.profile_id,
    deal,
    contact: contact || undefined,
  })
}

/**
 * Trigger workflows when a deal's stage changes
 */
export async function triggerDealStageChanged(
  deal: Deal,
  previousStageId: string
): Promise<void> {
  // Only trigger if stage actually changed
  if (deal.stage_id === previousStageId) {
    return
  }

  const contact = deal.contact_id ? await fetchContact(deal.contact_id) : null

  await triggerWorkflows('deal_stage_changed', {
    userId: deal.profile_id,
    deal,
    contact: contact || undefined,
    previousStageId,
  })
}

/**
 * Trigger workflows when a deal is won
 */
export async function triggerDealWon(deal: Deal): Promise<void> {
  const contact = deal.contact_id ? await fetchContact(deal.contact_id) : null

  await triggerWorkflows('deal_won', {
    userId: deal.profile_id,
    deal,
    contact: contact || undefined,
  })
}

/**
 * Trigger workflows when a deal is lost
 */
export async function triggerDealLost(deal: Deal): Promise<void> {
  const contact = deal.contact_id ? await fetchContact(deal.contact_id) : null

  await triggerWorkflows('deal_lost', {
    userId: deal.profile_id,
    deal,
    contact: contact || undefined,
  })
}

/**
 * Trigger workflows when an activity is logged on a lead
 */
export async function triggerActivityLogged(
  activity: Activity,
  lead: Lead,
  userId: string
): Promise<void> {
  const contact = await fetchLeadPrimaryContact(lead.id)

  await triggerWorkflows('activity_logged', {
    userId,
    lead,
    contact: contact || undefined,
    activity,
  })
}

/**
 * Trigger workflows when an activity is completed
 */
export async function triggerActivityCompleted(
  activity: Activity,
  lead: Lead,
  userId: string
): Promise<void> {
  const contact = await fetchLeadPrimaryContact(lead.id)

  await triggerWorkflows('activity_completed', {
    userId,
    lead,
    contact: contact || undefined,
    activity,
  })
}

/**
 * Trigger workflows when a lead task is completed
 */
export async function triggerTaskCompleted(
  task: LeadTask,
  lead: Lead,
  userId: string
): Promise<void> {
  const contact = await fetchLeadPrimaryContact(lead.id)

  await triggerWorkflows('task_completed', {
    userId,
    lead,
    contact: contact || undefined,
    leadTask: task,
  })
}

/**
 * Trigger workflows when an inbound call is received
 */
export async function triggerCallReceived(
  call: Call,
  lead: Lead,
  contact: Contact | null,
  userId: string
): Promise<void> {
  await triggerWorkflows('call_received', {
    userId,
    lead,
    contact: contact || undefined,
    call,
  })
}

/**
 * Trigger workflows when a call is completed successfully (duration > 0)
 */
export async function triggerCallCompleted(
  call: Call,
  lead: Lead | null,
  contact: Contact | null,
  userId: string
): Promise<void> {
  await triggerWorkflows('call_completed', {
    userId,
    lead: lead || undefined,
    contact: contact || undefined,
    call,
  })
}

/**
 * Trigger workflows when a call is missed (no-answer, busy, canceled)
 */
export async function triggerCallMissed(
  call: Call,
  lead: Lead | null,
  contact: Contact | null,
  userId: string
): Promise<void> {
  await triggerWorkflows('call_missed', {
    userId,
    lead: lead || undefined,
    contact: contact || undefined,
    call,
  })
}

/**
 * Trigger workflows when a voicemail recording is ready
 */
export async function triggerVoicemailReceived(
  call: Call,
  lead: Lead | null,
  contact: Contact | null,
  userId: string
): Promise<void> {
  await triggerWorkflows('voicemail_received', {
    userId,
    lead: lead || undefined,
    contact: contact || undefined,
    call,
  })
}

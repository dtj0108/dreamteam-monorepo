export interface ScheduledEmail {
  id: string
  user_id: string
  workspace_id: string
  lead_id?: string | null
  contact_id?: string | null
  grant_id: string
  to_email: string
  to_name?: string | null
  subject: string
  body: string
  scheduled_for: string
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  error_message?: string | null
  created_at: string
  updated_at: string
  sent_at?: string | null
  cancelled_at?: string | null
}

export interface CreateScheduledEmailInput {
  grantId: string
  toEmail: string
  toName?: string
  subject: string
  body: string
  leadId?: string
  contactId?: string
  scheduledFor: string
}

export interface UpdateScheduledEmailInput {
  subject?: string
  body?: string
  scheduledFor?: string
  status?: 'cancelled'
}

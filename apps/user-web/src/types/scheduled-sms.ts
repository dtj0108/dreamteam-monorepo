export interface ScheduledSMS {
  id: string
  user_id: string
  lead_id?: string | null
  contact_id?: string | null
  from_number: string
  to_number: string
  body: string
  scheduled_for: string
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  communication_id?: string | null
  error_message?: string | null
  created_at: string
  updated_at: string
  sent_at?: string | null
  cancelled_at?: string | null
}

export interface CreateScheduledSMSInput {
  to: string
  message: string
  leadId?: string
  contactId?: string
  fromNumberId: string
  scheduledFor: string
}

export interface UpdateScheduledSMSInput {
  body?: string
  scheduledFor?: string
  status?: 'cancelled'
}

// Sales Module Types

// Lead status type
export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "unqualified"
  | "won"
  | "lost";

// Activity type for timeline (includes "sms" for Twilio communications)
export type ActivityType = "call" | "email" | "meeting" | "note" | "task" | "sms";

// Opportunity stage
export type OpportunityStage =
  | "prospect"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

// Lead
export interface Lead {
  id: string;
  user_id: string;
  name: string;
  website?: string;
  industry?: string;
  status: LeadStatus;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  pipeline_id?: string;
  stage_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadWithRelations extends Lead {
  contacts: Contact[];
  activities: Activity[];
  tasks: LeadTask[];
  opportunities: LeadOpportunity[];
  stage?: LeadPipelineStage;
  contactCount: number;
}

// Contact
export interface Contact {
  id: string;
  lead_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  lead?: Pick<Lead, "id" | "name">;
}

// Lead Task
export interface LeadTask {
  id: string;
  lead_id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Lead Opportunity
export interface LeadOpportunity {
  id: string;
  lead_id: string;
  user_id: string;
  name: string;
  value?: number;
  stage: OpportunityStage;
  probability: number;
  expected_close_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Activity (for timeline)
export interface Activity {
  id: string;
  profile_id: string;
  contact_id?: string;
  deal_id?: string;
  lead_id?: string;
  type: ActivityType;
  subject?: string;
  description?: string;
  due_date?: string;
  completed_at?: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations
  contact?: Pick<Contact, "id" | "first_name" | "last_name">;
  // Extended fields for communications displayed in timeline
  _isCommunication?: boolean;
  _communicationData?: Communication;
}

// Lead Pipeline
export interface LeadPipeline {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  stages: LeadPipelineStage[];
  created_at: string;
  updated_at: string;
}

export interface LeadPipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

// API Response types
export interface LeadsResponse {
  leads: Lead[];
  total?: number;
}

export interface ContactsResponse {
  contacts: Contact[];
  total?: number;
}

export interface LeadPipelinesResponse {
  pipelines: LeadPipeline[];
}

// Input types for mutations
export interface CreateLeadInput {
  name: string;
  website?: string;
  industry?: string;
  status?: LeadStatus;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  pipeline_id?: string;
  stage_id?: string;
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {
  id: string;
}

export interface CreateContactInput {
  lead_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  notes?: string;
}

export interface UpdateContactInput extends Partial<Omit<CreateContactInput, "lead_id">> {
  id: string;
}

export interface CreateLeadTaskInput {
  lead_id: string;
  title: string;
  description?: string;
  due_date?: string;
}

export interface UpdateLeadTaskInput extends Partial<Omit<CreateLeadTaskInput, "lead_id">> {
  id: string;
  is_completed?: boolean;
}

export interface CreateLeadOpportunityInput {
  lead_id: string;
  name: string;
  value?: number;
  stage?: OpportunityStage;
  probability?: number;
  expected_close_date?: string;
  notes?: string;
}

export interface UpdateLeadOpportunityInput extends Partial<Omit<CreateLeadOpportunityInput, "lead_id">> {
  id: string;
}

export interface MoveLeadStageInput {
  lead_id: string;
  stage_id: string;
  pipeline_id?: string;
}

// Color constants for lead statuses
export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "#6b7280",
  contacted: "#3b82f6",
  qualified: "#22c55e",
  unqualified: "#f97316",
  won: "#10b981",
  lost: "#ef4444",
};

// Color constants for opportunity stages
export const OPPORTUNITY_STAGE_COLORS: Record<OpportunityStage, string> = {
  prospect: "#6b7280",
  qualified: "#3b82f6",
  proposal: "#eab308",
  negotiation: "#f97316",
  closed_won: "#22c55e",
  closed_lost: "#ef4444",
};

// Color constants for activity types
export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  call: "#22c55e",
  email: "#3b82f6",
  meeting: "#8b5cf6",
  note: "#6b7280",
  task: "#f59e0b",
  sms: "#06b6d4", // cyan-500 for SMS
};

// Activity type icons (FontAwesome icon names)
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  call: "phone",
  email: "envelope",
  meeting: "calendar",
  note: "file-text-o",
  task: "check-square-o",
  sms: "comment",
};

// Helper functions
export const getLeadStatusLabel = (status: LeadStatus): string => {
  const labels: Record<LeadStatus, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    unqualified: "Unqualified",
    won: "Won",
    lost: "Lost",
  };
  return labels[status];
};

export const getOpportunityStageLabel = (stage: OpportunityStage): string => {
  const labels: Record<OpportunityStage, string> = {
    prospect: "Prospect",
    qualified: "Qualified",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Closed Won",
    closed_lost: "Closed Lost",
  };
  return labels[stage];
};

export const getContactFullName = (contact: Contact): string => {
  return contact.last_name
    ? `${contact.first_name} ${contact.last_name}`
    : contact.first_name;
};

export const formatCurrency = (value: number, currency = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const getActivityTypeLabel = (type: ActivityType): string => {
  const labels: Record<ActivityType, string> = {
    call: "Call",
    email: "Email",
    meeting: "Meeting",
    note: "Note",
    task: "Task",
    sms: "SMS",
  };
  return labels[type];
};

// Activity type emojis for quick actions
export const ACTIVITY_TYPE_EMOJIS: Record<ActivityType, string> = {
  call: "📞",
  email: "📧",
  meeting: "📅",
  note: "📝",
  task: "✅",
  sms: "💬",
};

// Activity input type
export interface CreateLeadActivityInput {
  type: ActivityType;
  subject?: string;
  description?: string;
  due_date?: string;
  is_completed?: boolean;
}

// ============================================
// Deal/Opportunity Types (for Deals tab)
// ============================================

export interface Deal extends LeadOpportunity {
  lead?: Pick<Lead, "id" | "name">;
}

export interface DealsResponse {
  deals: Deal[];
  total?: number;
}

export interface CreateDealInput {
  name: string;
  lead_id?: string;
  value?: number;
  stage?: OpportunityStage;
  probability?: number;
  expected_close_date?: string;
  notes?: string;
}

export interface UpdateDealInput extends Partial<CreateDealInput> {
  id: string;
}

export interface DealsQueryParams {
  stage?: OpportunityStage;
  lead_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MoveDealStageInput {
  deal_id: string;
  stage: OpportunityStage;
}

// ============================================
// Sales Analytics Types
// ============================================

export interface SalesAnalyticsOverview {
  summary: {
    totalLeads: number;
    newLeads: number;
    qualifiedLeads: number;
    wonDeals: number;
    lostDeals: number;
    conversionRate: number;
  };
  pipelineValue: {
    total: number;
    weighted: number;
    won: number;
    lost: number;
  };
  changes: {
    leads: number;
    deals: number;
    revenue: number;
  };
}

export interface ConversionFunnelStage {
  id: string;
  name: string;
  color: string;
  count: number;
  value: number;
  conversionRate: number;
}

export interface ConversionFunnelData {
  stages: ConversionFunnelStage[];
  overallConversionRate: number;
}

export interface DealMetrics {
  summary: {
    totalPipelineValue: number;
    expectedRevenue: number;
    wonValue: number;
    lostValue: number;
    avgDealSize: number;
    avgTimeToClose: number;
  };
  byStage: Array<{
    stage: OpportunityStage;
    count: number;
    value: number;
    avgValue: number;
  }>;
  nearingClose: Array<{
    id: string;
    name: string;
    value: number;
    expectedCloseDate: string;
    probability: number;
  }>;
}

export interface ActivityMetrics {
  summary: {
    totalActivities: number;
    callsMade: number;
    emailsSent: number;
    meetingsHeld: number;
    tasksCompleted: number;
  };
  trend: Array<{
    period: string;
    calls: number;
    emails: number;
    meetings: number;
    tasks: number;
  }>;
  byLead: Array<{
    leadId: string;
    leadName: string;
    activityCount: number;
  }>;
}

export interface SalesTrendData {
  period: string;
  label: string;
  newLeads: number;
  qualifiedLeads: number;
  wonDeals: number;
  revenue: number;
}

export interface TopPerformer {
  id: string;
  name: string;
  value: number;
  stage: string;
  closingDate?: string;
  probability?: number;
}

export interface SalesDateRange {
  startDate: string;
  endDate: string;
}

// ============================================
// Communication Types (Twilio calls, SMS)
// ============================================

export type CommunicationType = "call" | "sms" | "email";
export type CommunicationDirection = "inbound" | "outbound";
export type CommunicationStatus =
  | "queued"
  | "ringing"
  | "in-progress"
  | "completed"
  | "busy"
  | "failed"
  | "no-answer"
  | "canceled"
  | "sent"
  | "delivered"
  | "undelivered"
  | "received";

export interface CallRecording {
  id: string;
  communication_id: string;
  recording_sid: string;
  recording_url: string;
  duration: number;
  created_at: string;
}

export interface Communication {
  id: string;
  user_id: string;
  lead_id?: string;
  contact_id?: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  status: CommunicationStatus;
  from_number?: string;
  to_number?: string;
  call_sid?: string;
  duration?: number;
  body?: string;
  subject?: string;
  notes?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  recordings?: CallRecording[];
}

export interface CommunicationsQueryParams {
  leadId?: string;
  contactId?: string;
  type?: CommunicationType;
  limit?: number;
  offset?: number;
}

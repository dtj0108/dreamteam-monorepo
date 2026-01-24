/**
 * CRM test fixtures
 */

export const testWorkspaceId = 'test-workspace-123'
export const testUserId = 'test-user-id'

// Contact fixtures
export const mockContact = {
  id: 'contact-123',
  workspace_id: testWorkspaceId,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  title: 'CEO',
  lead_id: 'lead-123',
  notes: 'Important contact',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const mockContactList = [
  mockContact,
  {
    id: 'contact-456',
    workspace_id: testWorkspaceId,
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+0987654321',
    title: 'CTO',
    lead_id: 'lead-456',
    notes: null,
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
]

// Lead fixtures
export const mockLead = {
  id: 'lead-123',
  workspace_id: testWorkspaceId,
  user_id: testUserId,
  name: 'Acme Corp',
  website: 'https://acme.com',
  industry: 'Technology',
  status: 'qualified',
  notes: 'High potential lead',
  pipeline_id: 'pipeline-123',
  stage_id: 'stage-123',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const mockLeadList = [
  mockLead,
  {
    id: 'lead-456',
    workspace_id: testWorkspaceId,
    user_id: testUserId,
    name: 'Beta Inc',
    website: 'https://beta.com',
    industry: 'Finance',
    status: 'new',
    notes: null,
    pipeline_id: 'pipeline-123',
    stage_id: 'stage-456',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
]

// Deal (lead_opportunities) fixtures
export const mockDeal = {
  id: 'deal-123',
  workspace_id: testWorkspaceId,
  user_id: testUserId,
  lead_id: 'lead-123',
  name: 'Enterprise License',
  value: 50000,
  stage: 'proposal',
  probability: 60,
  expected_close_date: '2024-03-01',
  contact_id: 'contact-123',
  notes: 'Large enterprise deal',
  status: 'active',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const mockDealList = [
  mockDeal,
  {
    id: 'deal-456',
    workspace_id: testWorkspaceId,
    user_id: testUserId,
    lead_id: 'lead-456',
    name: 'SMB Package',
    value: 10000,
    stage: 'qualification',
    probability: 30,
    expected_close_date: '2024-04-01',
    contact_id: 'contact-456',
    notes: null,
    status: 'active',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
]

// Activity fixtures
export const mockActivity = {
  id: 'activity-123',
  profile_id: testUserId,
  type: 'call',
  subject: 'Follow-up call',
  description: 'Discussed pricing options',
  contact_id: 'contact-123',
  deal_id: 'deal-123',
  due_date: '2024-01-20T14:00:00Z',
  is_completed: false,
  completed_at: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const mockActivityList = [
  mockActivity,
  {
    id: 'activity-456',
    profile_id: testUserId,
    type: 'email',
    subject: 'Proposal sent',
    description: 'Sent pricing proposal',
    contact_id: 'contact-456',
    deal_id: 'deal-456',
    due_date: null,
    is_completed: true,
    completed_at: '2024-01-16T10:00:00Z',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
]

// Pipeline fixtures
export const mockPipeline = {
  id: 'pipeline-123',
  user_id: testUserId,
  name: 'Sales Pipeline',
  description: 'Main sales pipeline',
  is_default: true,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const mockPipelineList = [
  mockPipeline,
  {
    id: 'pipeline-456',
    user_id: testUserId,
    name: 'Partner Pipeline',
    description: 'For partner deals',
    is_default: false,
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
]

// Pipeline stage fixtures
export const mockStage = {
  id: 'stage-123',
  pipeline_id: 'pipeline-123',
  name: 'New',
  color: '#6b7280',
  position: 0,
  is_won: false,
  is_lost: false,
}

export const mockStageList = [
  mockStage,
  {
    id: 'stage-456',
    pipeline_id: 'pipeline-123',
    name: 'Contacted',
    color: '#3b82f6',
    position: 1,
    is_won: false,
    is_lost: false,
  },
  {
    id: 'stage-789',
    pipeline_id: 'pipeline-123',
    name: 'Won',
    color: '#10b981',
    position: 2,
    is_won: true,
    is_lost: false,
  },
]

// Lead task fixtures
export const mockLeadTask = {
  id: 'task-123',
  lead_id: 'lead-123',
  workspace_id: testWorkspaceId,
  user_id: testUserId,
  title: 'Send proposal',
  description: 'Send pricing proposal to client',
  due_date: '2024-01-25',
  is_completed: false,
  completed_at: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const mockLeadTaskList = [
  mockLeadTask,
  {
    id: 'task-456',
    lead_id: 'lead-123',
    workspace_id: testWorkspaceId,
    user_id: testUserId,
    title: 'Schedule demo',
    description: null,
    due_date: '2024-01-30',
    is_completed: true,
    completed_at: '2024-01-29T10:00:00Z',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
]

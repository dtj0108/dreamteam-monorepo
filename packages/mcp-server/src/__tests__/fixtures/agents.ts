/**
 * Agents test fixtures
 */

export const testWorkspaceId = 'workspace-123'
export const testUserId = 'user-123'

// ============================================
// Agent fixtures
// ============================================
export const mockAgent = {
  id: 'agent-123',
  workspace_id: testWorkspaceId,
  name: 'Sales Assistant',
  description: 'An AI agent for sales support',
  system_prompt: 'You are a helpful sales assistant.',
  model: 'claude-3-sonnet',
  tools: ['crm_contact_get', 'crm_deal_create'],
  is_active: true,
  created_by: 'profile-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export const mockAgentInactive = {
  id: 'agent-456',
  workspace_id: testWorkspaceId,
  name: 'Support Bot',
  description: 'Customer support agent',
  system_prompt: 'You are a customer support agent.',
  model: 'claude-3-haiku',
  tools: ['knowledge_page_search'],
  is_active: false,
  created_by: 'profile-123',
  created_at: '2024-01-05T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
}

export const mockAgentList = [mockAgent, mockAgentInactive]

// ============================================
// Agent Skill fixtures
// ============================================
export const mockAgentSkill = {
  id: 'skill-123',
  workspace_id: testWorkspaceId,
  name: 'CRM Integration',
  description: 'Skills for CRM operations',
  tools: ['crm_contact_list', 'crm_contact_get'],
  is_system: false,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockAgentSkillSystem = {
  id: 'skill-456',
  workspace_id: null,
  name: 'System Knowledge',
  description: 'System-level knowledge skill',
  tools: ['knowledge_page_search'],
  is_system: true,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockSkillAssignment = {
  agent_id: mockAgent.id,
  skill_id: mockAgentSkill.id,
}

// ============================================
// Conversation fixtures
// ============================================
export const mockConversation = {
  id: 'conv-123',
  workspace_id: testWorkspaceId,
  agent_id: mockAgent.id,
  user_id: 'profile-123',
  title: 'Sales inquiry conversation',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T11:30:00Z',
}

export const mockConversationSecond = {
  id: 'conv-456',
  workspace_id: testWorkspaceId,
  agent_id: mockAgent.id,
  user_id: 'profile-123',
  title: 'Product questions',
  created_at: '2024-01-16T09:00:00Z',
  updated_at: '2024-01-16T09:30:00Z',
}

export const mockConversationList = [mockConversation, mockConversationSecond]

// ============================================
// Message fixtures
// ============================================
export const mockMessage = {
  id: 'msg-123',
  conversation_id: mockConversation.id,
  role: 'user',
  content: 'Hello, I need help with a sales inquiry.',
  parts: [{ type: 'text', text: 'Hello, I need help with a sales inquiry.' }],
  created_at: '2024-01-15T10:00:00Z',
}

export const mockMessageAssistant = {
  id: 'msg-124',
  conversation_id: mockConversation.id,
  role: 'assistant',
  content: 'Hello! I would be happy to help with your sales inquiry. What would you like to know?',
  parts: [{ type: 'text', text: 'Hello! I would be happy to help with your sales inquiry. What would you like to know?' }],
  created_at: '2024-01-15T10:01:00Z',
}

export const mockMessageList = [mockMessage, mockMessageAssistant]

// ============================================
// Memory fixtures
// ============================================
export const mockMemory = {
  id: 'memory-123',
  agent_id: mockAgent.id,
  workspace_id: testWorkspaceId,
  path: 'user_preferences',
  content: '# User Preferences\n\n- Prefers formal communication\n- Time zone: EST',
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export const mockMemorySecond = {
  id: 'memory-456',
  agent_id: mockAgent.id,
  workspace_id: testWorkspaceId,
  path: 'conversation_context',
  content: '# Recent Context\n\nLast discussed: Product pricing for enterprise plan',
  created_at: '2024-01-12T00:00:00Z',
  updated_at: '2024-01-14T00:00:00Z',
}

export const mockMemoryList = [mockMemory, mockMemorySecond]

// ============================================
// Workflow fixtures
// ============================================
export const mockWorkflow = {
  id: 'workflow-123',
  user_id: testUserId,
  name: 'Daily Report',
  description: 'Generate daily sales report',
  trigger_type: 'schedule',
  trigger_config: { cron: '0 9 * * *' },
  actions: [
    { type: 'query', table: 'deals', filters: { status: 'won' } },
    { type: 'email', to: 'team@example.com', template: 'daily_report' },
  ],
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
}

export const mockWorkflowInactive = {
  id: 'workflow-456',
  user_id: testUserId,
  name: 'Weekly Digest',
  description: 'Send weekly summary',
  trigger_type: 'schedule',
  trigger_config: { cron: '0 8 * * 1' },
  actions: [
    { type: 'aggregate', source: 'activities' },
    { type: 'slack', channel: '#general' },
  ],
  is_active: false,
  created_at: '2024-01-05T00:00:00Z',
  updated_at: '2024-01-08T00:00:00Z',
}

export const mockWorkflowManual = {
  id: 'workflow-789',
  user_id: testUserId,
  name: 'Lead Enrichment',
  description: 'Enrich lead data from external sources',
  trigger_type: 'manual',
  trigger_config: {},
  actions: [
    { type: 'api_call', url: 'https://api.example.com/enrich' },
  ],
  is_active: true,
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

export const mockWorkflowList = [mockWorkflow, mockWorkflowInactive, mockWorkflowManual]

// ============================================
// Workflow Execution fixtures
// ============================================
export const mockWorkflowExecution = {
  id: 'exec-123',
  workflow_id: mockWorkflow.id,
  user_id: testUserId,
  trigger_type: 'schedule',
  trigger_context: {},
  status: 'completed',
  started_at: '2024-01-15T09:00:00Z',
  completed_at: '2024-01-15T09:00:30Z',
  result: { rows_processed: 42 },
}

export const mockWorkflowExecutionPending = {
  id: 'exec-456',
  workflow_id: mockWorkflow.id,
  user_id: testUserId,
  trigger_type: 'manual',
  trigger_context: { lead_id: 'lead-123' },
  status: 'pending',
  started_at: '2024-01-16T10:00:00Z',
  completed_at: null,
  result: null,
}

export const mockExecutionList = [mockWorkflowExecution, mockWorkflowExecutionPending]

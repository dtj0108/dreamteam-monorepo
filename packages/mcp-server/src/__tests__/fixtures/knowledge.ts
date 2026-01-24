/**
 * Knowledge test fixtures
 */

export const testWorkspaceId = 'workspace-123'
export const testUserId = 'test-user-id'

// ============================================
// Knowledge Page fixtures
// ============================================
export const mockKnowledgePage = {
  id: 'page-123',
  workspace_id: testWorkspaceId,
  title: 'Getting Started Guide',
  icon: 'book',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Welcome!' }] }],
  parent_id: null,
  position: 0,
  is_archived: false,
  is_favorited_by: [],
  template_id: null,
  created_by: testUserId,
  last_edited_by: testUserId,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  project: {
    id: 'project-123',
    name: 'Website Redesign',
    workspace_id: testWorkspaceId,
  },
}

export const mockKnowledgePageList = [
  mockKnowledgePage,
  {
    id: 'page-456',
    workspace_id: testWorkspaceId,
    title: 'API Documentation',
    icon: 'code',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'API docs' }] }],
    parent_id: null,
    position: 1,
    is_archived: false,
    is_favorited_by: [testUserId],
    template_id: null,
    created_by: testUserId,
    last_edited_by: testUserId,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
]

export const mockChildPage = {
  id: 'page-789',
  workspace_id: testWorkspaceId,
  title: 'Sub-page',
  icon: 'file',
  content: [],
  parent_id: 'page-123',
  position: 0,
  is_archived: false,
  is_favorited_by: [],
  template_id: null,
  created_by: testUserId,
  last_edited_by: testUserId,
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
}

// ============================================
// Knowledge Category fixtures
// ============================================
export const mockKnowledgeCategory = {
  id: 'category-123',
  workspace_id: testWorkspaceId,
  name: 'Engineering',
  description: 'Technical documentation',
  color: '#6366f1',
  icon: 'code',
  is_system: false,
  position: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockSystemCategory = {
  id: 'category-system',
  workspace_id: null,
  name: 'General',
  description: 'Default category',
  color: '#737373',
  icon: 'folder',
  is_system: true,
  position: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockKnowledgeCategoryList = [
  mockKnowledgeCategory,
  {
    id: 'category-456',
    workspace_id: testWorkspaceId,
    name: 'Design',
    description: 'Design documentation',
    color: '#ec4899',
    icon: 'palette',
    is_system: false,
    position: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

export const mockPageCategory = {
  id: 'page-category-123',
  page_id: 'page-123',
  category_id: 'category-123',
  created_at: '2024-01-15T00:00:00Z',
}

// ============================================
// Knowledge Template fixtures
// ============================================
export const mockKnowledgeTemplate = {
  id: 'template-123',
  workspace_id: testWorkspaceId,
  name: 'Meeting Notes',
  description: 'Template for meeting notes',
  icon: 'calendar',
  category: 'general',
  content: [{ type: 'heading', content: [{ type: 'text', text: 'Meeting Notes' }] }],
  is_system: false,
  usage_count: 5,
  created_by: testUserId,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockSystemTemplate = {
  id: 'template-system',
  workspace_id: null,
  name: 'Blank Page',
  description: 'Start with a blank page',
  icon: 'file',
  category: 'general',
  content: [],
  is_system: true,
  usage_count: 100,
  created_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockKnowledgeTemplateList = [
  mockKnowledgeTemplate,
  {
    id: 'template-456',
    workspace_id: testWorkspaceId,
    name: 'Project Plan',
    description: 'Template for project plans',
    icon: 'clipboard-list',
    category: 'projects',
    content: [{ type: 'heading', content: [{ type: 'text', text: 'Project Plan' }] }],
    is_system: false,
    usage_count: 3,
    created_by: testUserId,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
]

// ============================================
// Knowledge Whiteboard fixtures
// ============================================
export const mockKnowledgeWhiteboard = {
  id: 'whiteboard-123',
  workspace_id: testWorkspaceId,
  title: 'Architecture Diagram',
  icon: 'layout',
  content: { elements: [], appState: {} },
  thumbnail: null,
  is_archived: false,
  is_favorited_by: [],
  position: 0,
  created_by: testUserId,
  last_edited_by: testUserId,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export const mockArchivedWhiteboard = {
  id: 'whiteboard-archived',
  workspace_id: testWorkspaceId,
  title: 'Old Diagram',
  icon: 'archive',
  content: { elements: [], appState: {} },
  thumbnail: null,
  is_archived: true,
  is_favorited_by: [],
  position: 0,
  created_by: testUserId,
  last_edited_by: testUserId,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
}

export const mockKnowledgeWhiteboardList = [
  mockKnowledgeWhiteboard,
  {
    id: 'whiteboard-456',
    workspace_id: testWorkspaceId,
    title: 'User Flow',
    icon: 'git-branch',
    content: { elements: [], appState: {} },
    thumbnail: 'base64-thumbnail-data',
    is_archived: false,
    is_favorited_by: [testUserId],
    position: 1,
    created_by: testUserId,
    last_edited_by: testUserId,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
]

/**
 * Projects test fixtures
 */

export const testWorkspaceId = 'workspace-123'
export const testUserId = 'test-user-id'

// ============================================
// Department fixtures
// ============================================
export const mockDepartment = {
  id: 'department-123',
  workspace_id: testWorkspaceId,
  name: 'Engineering',
  description: 'Engineering department',
  color: '#6366f1',
  icon: 'building-2',
  position: 0,
  created_by: testUserId,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockDepartmentList = [
  mockDepartment,
  {
    id: 'department-456',
    workspace_id: testWorkspaceId,
    name: 'Marketing',
    description: 'Marketing department',
    color: '#ec4899',
    icon: 'megaphone',
    position: 1,
    created_by: testUserId,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// ============================================
// Project fixtures
// ============================================
export const mockProject = {
  id: 'project-123',
  workspace_id: testWorkspaceId,
  name: 'Website Redesign',
  description: 'Redesign the company website',
  status: 'active',
  priority: 'high',
  color: '#6366f1',
  icon: 'folder',
  start_date: '2024-01-01',
  target_end_date: '2024-06-30',
  actual_end_date: null,
  budget: 50000,
  department_id: 'department-123',
  owner_id: testUserId,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export const mockProjectList = [
  mockProject,
  {
    id: 'project-456',
    workspace_id: testWorkspaceId,
    name: 'Mobile App',
    description: 'Build a mobile app',
    status: 'active',
    priority: 'medium',
    color: '#10b981',
    icon: 'smartphone',
    start_date: '2024-02-01',
    target_end_date: '2024-09-30',
    actual_end_date: null,
    budget: 100000,
    department_id: 'department-123',
    owner_id: testUserId,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
  },
]

export const mockProjectMember = {
  id: 'member-123',
  project_id: 'project-123',
  user_id: testUserId,
  role: 'owner',
  hours_per_week: 40,
  created_at: '2024-01-01T00:00:00Z',
  user: {
    id: testUserId,
    name: 'Test User',
    avatar_url: null,
  },
}

// ============================================
// Task fixtures
// ============================================
export const mockTask = {
  id: 'task-123',
  project_id: 'project-123',
  title: 'Design homepage',
  description: 'Create mockups for the new homepage',
  status: 'in_progress',
  priority: 'high',
  start_date: '2024-01-15',
  due_date: '2024-02-15',
  estimated_hours: 40,
  actual_hours: 20,
  position: 0,
  parent_id: null,
  created_by: testUserId,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-20T00:00:00Z',
  project: {
    id: 'project-123',
    name: 'Website Redesign',
    workspace_id: testWorkspaceId,
  },
}

export const mockTaskList = [
  mockTask,
  {
    id: 'task-456',
    project_id: 'project-123',
    title: 'Implement header',
    description: 'Build the header component',
    status: 'todo',
    priority: 'medium',
    start_date: '2024-02-01',
    due_date: '2024-02-15',
    estimated_hours: 16,
    actual_hours: 0,
    position: 1,
    parent_id: null,
    created_by: testUserId,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    project: {
      id: 'project-123',
      name: 'Website Redesign',
      workspace_id: testWorkspaceId,
    },
  },
]

export const mockTaskAssignee = {
  id: 'assignee-123',
  task_id: 'task-123',
  user_id: testUserId,
  created_at: '2024-01-15T00:00:00Z',
  user: {
    id: testUserId,
    name: 'Test User',
    avatar_url: null,
  },
}

export const mockTaskComment = {
  id: 'comment-123',
  task_id: 'task-123',
  user_id: testUserId,
  content: 'Great progress on this!',
  parent_id: null,
  created_at: '2024-01-20T00:00:00Z',
  updated_at: '2024-01-20T00:00:00Z',
  user: {
    id: testUserId,
    name: 'Test User',
    avatar_url: null,
  },
}

export const mockTaskLabel = {
  id: 'label-123',
  project_id: 'project-123',
  name: 'Bug',
  color: '#ef4444',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockTaskDependency = {
  id: 'dependency-123',
  task_id: 'task-456',
  depends_on_id: 'task-123',
  dependency_type: 'finish_to_start',
  created_at: '2024-01-15T00:00:00Z',
}

// ============================================
// Milestone fixtures
// ============================================
export const mockMilestone = {
  id: 'milestone-123',
  project_id: 'project-123',
  name: 'Phase 1 Complete',
  description: 'Complete the first phase of development',
  target_date: '2024-03-31',
  status: 'upcoming',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  project: {
    id: 'project-123',
    name: 'Website Redesign',
    workspace_id: testWorkspaceId,
  },
}

export const mockMilestoneList = [
  mockMilestone,
  {
    id: 'milestone-456',
    project_id: 'project-123',
    name: 'Beta Launch',
    description: 'Launch beta version',
    target_date: '2024-05-15',
    status: 'upcoming',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

export const mockMilestoneTask = {
  id: 'milestone-task-123',
  milestone_id: 'milestone-123',
  task_id: 'task-123',
  created_at: '2024-01-15T00:00:00Z',
}

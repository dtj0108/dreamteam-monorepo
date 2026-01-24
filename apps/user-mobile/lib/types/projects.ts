// Projects Module Types

// Status types
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

// Priority types
export type ProjectPriority = "low" | "medium" | "high" | "critical";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

// Member role
export type MemberRole = "owner" | "admin" | "member" | "viewer";

// User (for assignees and members)
export interface ProjectUser {
  id: string;
  name: string;
  avatar_url: string | null;
  email?: string;
}

// Project
export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  color: string;
  icon: string | null;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  budget: number | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  owner?: ProjectUser;
  project_members?: ProjectMember[];
  // Computed
  progress?: number;
  completedTasks?: number;
  totalTasks?: number;
}

export interface ProjectWithTasks extends Project {
  tasks: Task[];
}

// Task
export interface Task {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  task_assignees?: TaskAssignee[];
  task_labels?: TaskLabelAssignment[];
  subtasks?: Task[];
  created_by_user?: ProjectUser;
  // For My Tasks - includes project context
  project?: Pick<Project, "id" | "name" | "color">;
}

// Task Assignee
export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
  user: ProjectUser;
}

// Project Label
export interface ProjectLabel {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
}

// Task Label Assignment (join table)
export interface TaskLabelAssignment {
  task_id: string;
  label_id: string;
  label: ProjectLabel;
}

// Project Labels Response
export interface ProjectLabelsResponse {
  labels: ProjectLabel[];
}

// Label Input Types
export interface CreateLabelInput {
  name: string;
  color: string;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
}

// Default label colors
export const LABEL_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
];

// Project Member
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  hours_per_week: number;
  created_at: string;
  user: ProjectUser;
}

// API Response types
export interface ProjectsResponse {
  projects: Project[];
  total?: number;
}

export interface TasksResponse {
  tasks: Task[];
  total?: number;
}

export interface MyTasksResponse {
  tasks: Task[];
  total?: number;
  stats?: {
    todo: number;
    in_progress: number;
    review: number;
    done: number;
    overdue: number;
  };
}

export interface ProjectMembersResponse {
  members: ProjectMember[];
}

// Input types for mutations
export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  color?: string;
  icon?: string;
  start_date?: string;
  target_end_date?: string;
  budget?: number;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  id: string;
  actual_end_date?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  parent_id?: string;
  assignees?: string[];
  labels?: string[];
  position?: number;
}

export interface UpdateTaskInput extends Partial<Omit<CreateTaskInput, "parent_id">> {
  id: string;
  actual_hours?: number;
}

// Color constants for project statuses
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "#10b981",
  on_hold: "#f59e0b",
  completed: "#3b82f6",
  archived: "#6b7280",
};

// Color constants for task statuses
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "#6b7280",
  in_progress: "#3b82f6",
  review: "#8b5cf6",
  done: "#10b981",
};

// Color constants for task priorities
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "#6b7280",
  medium: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

// Color constants for project priorities
export const PROJECT_PRIORITY_COLORS: Record<ProjectPriority, string> = {
  low: "#6b7280",
  medium: "#3b82f6",
  high: "#f59e0b",
  critical: "#ef4444",
};

// Helper functions
export const getProjectStatusLabel = (status: ProjectStatus): string => {
  const labels: Record<ProjectStatus, string> = {
    active: "Active",
    on_hold: "On Hold",
    completed: "Completed",
    archived: "Archived",
  };
  return labels[status];
};

export const getTaskStatusLabel = (status: TaskStatus): string => {
  const labels: Record<TaskStatus, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    review: "Review",
    done: "Done",
  };
  return labels[status];
};

export const getTaskPriorityLabel = (priority: TaskPriority): string => {
  const labels: Record<TaskPriority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };
  return labels[priority];
};

export const getProjectPriorityLabel = (priority: ProjectPriority): string => {
  const labels: Record<ProjectPriority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };
  return labels[priority];
};

export const getMemberRoleLabel = (role: MemberRole): string => {
  const labels: Record<MemberRole, string> = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
    viewer: "Viewer",
  };
  return labels[role];
};

// Task status order for Kanban columns
export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "review", "done"];

// ============================================================================
// Milestones
// ============================================================================

export type MilestoneStatus = "upcoming" | "at_risk" | "completed" | "missed";

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  target_date: string;
  status: MilestoneStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  milestone_tasks?: { task: Task }[];
  project?: Pick<Project, "id" | "name" | "color">;
  // Computed
  progress?: number;
  completedTasks?: number;
  totalTasks?: number;
}

export interface MilestonesResponse {
  milestones: Milestone[];
  total?: number;
}

export interface CreateMilestoneInput {
  name: string;
  description?: string;
  target_date: string;
  tasks?: string[];
}

export interface UpdateMilestoneInput extends Partial<Omit<CreateMilestoneInput, "tasks">> {
  id: string;
  status?: MilestoneStatus;
  tasks?: string[];
}

// Milestone status colors
export const MILESTONE_STATUS_COLORS: Record<MilestoneStatus, string> = {
  upcoming: "#3b82f6", // blue
  at_risk: "#ef4444", // red
  completed: "#10b981", // emerald
  missed: "#6b7280", // gray
};

export const getMilestoneStatusLabel = (status: MilestoneStatus): string => {
  const labels: Record<MilestoneStatus, string> = {
    upcoming: "Upcoming",
    at_risk: "At Risk",
    completed: "Completed",
    missed: "Missed",
  };
  return labels[status];
};

export const getMilestoneStatusIcon = (status: MilestoneStatus): string => {
  const icons: Record<MilestoneStatus, string> = {
    upcoming: "clock-o",
    at_risk: "exclamation-triangle",
    completed: "check-circle",
    missed: "times-circle",
  };
  return icons[status];
};

// ============================================================================
// Task Comments
// ============================================================================

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: ProjectUser;
}

export interface TaskCommentsResponse {
  comments: TaskComment[];
  total?: number;
}

export interface CreateTaskCommentInput {
  content: string;
}

export interface UpdateTaskCommentInput {
  content: string;
}

// ============================================================================
// Project Knowledge Links
// ============================================================================

export interface ProjectKnowledgeLink {
  id: string;
  project_id: string;
  page_id: string;
  created_at: string;
  // Joined data
  page?: {
    id: string;
    title: string;
    icon: string | null;
  };
}

export interface ProjectKnowledgeLinksResponse {
  links: ProjectKnowledgeLink[];
}

// ============================================================================
// Project Activity
// ============================================================================

export type ActivityAction =
  | "project_created"
  | "project_updated"
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_deleted"
  | "comment_added"
  | "member_added"
  | "member_removed"
  | "milestone_created"
  | "milestone_completed"
  | "label_added"
  | "label_removed"
  | "knowledge_linked"
  | "knowledge_unlinked";

export interface ProjectActivity {
  id: string;
  project_id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: "project" | "task" | "milestone" | "comment" | "member" | "label" | "knowledge";
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined data
  user?: ProjectUser;
}

export interface ProjectActivityResponse {
  activities: ProjectActivity[];
  total?: number;
}

export const getActivityActionLabel = (action: ActivityAction): string => {
  const labels: Record<ActivityAction, string> = {
    project_created: "created the project",
    project_updated: "updated the project",
    task_created: "created a task",
    task_updated: "updated a task",
    task_completed: "completed a task",
    task_deleted: "deleted a task",
    comment_added: "added a comment",
    member_added: "added a team member",
    member_removed: "removed a team member",
    milestone_created: "created a milestone",
    milestone_completed: "completed a milestone",
    label_added: "added a label",
    label_removed: "removed a label",
    knowledge_linked: "linked a knowledge page",
    knowledge_unlinked: "unlinked a knowledge page",
  };
  return labels[action];
};

export const getActivityActionIcon = (action: ActivityAction): string => {
  const icons: Record<ActivityAction, string> = {
    project_created: "folder",
    project_updated: "pencil",
    task_created: "plus",
    task_updated: "pencil",
    task_completed: "check",
    task_deleted: "trash",
    comment_added: "comment",
    member_added: "user-plus",
    member_removed: "user-times",
    milestone_created: "flag",
    milestone_completed: "flag-checkered",
    label_added: "tag",
    label_removed: "tag",
    knowledge_linked: "link",
    knowledge_unlinked: "unlink",
  };
  return icons[action];
};

// ============================================================================
// Project Notifications
// ============================================================================

export type NotificationType =
  | "task_assigned"
  | "task_due_soon"
  | "task_overdue"
  | "task_completed"
  | "comment_mention"
  | "comment_reply"
  | "project_update"
  | "milestone_approaching"
  | "milestone_completed";

export interface ProjectNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  project_id: string | null;
  task_id: string | null;
  is_read: boolean;
  created_at: string;
  // Joined data
  project?: Pick<Project, "id" | "name" | "color">;
  task?: Pick<Task, "id" | "title">;
}

export interface ProjectNotificationsResponse {
  notifications: ProjectNotification[];
  unread_count: number;
  total?: number;
}

export const getNotificationIcon = (type: NotificationType): string => {
  const icons: Record<NotificationType, string> = {
    task_assigned: "user-plus",
    task_due_soon: "clock-o",
    task_overdue: "exclamation-circle",
    task_completed: "check-circle",
    comment_mention: "at",
    comment_reply: "reply",
    project_update: "folder",
    milestone_approaching: "flag",
    milestone_completed: "flag-checkered",
  };
  return icons[type];
};

export const getNotificationColor = (type: NotificationType): string => {
  const colors: Record<NotificationType, string> = {
    task_assigned: "#3b82f6", // blue
    task_due_soon: "#f59e0b", // amber
    task_overdue: "#ef4444", // red
    task_completed: "#22c55e", // green
    comment_mention: "#8b5cf6", // violet
    comment_reply: "#6366f1", // indigo
    project_update: "#0ea5e9", // sky
    milestone_approaching: "#f97316", // orange
    milestone_completed: "#10b981", // emerald
  };
  return colors[type];
};

// Default project colors for picker
export const PROJECT_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
];

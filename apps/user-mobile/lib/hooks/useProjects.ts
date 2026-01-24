import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getMyTasks,
  getAllTasks,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  getMilestones,
  getAllMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getTaskComments,
  createTaskComment,
  updateTaskComment,
  deleteTaskComment,
  getProjectLabels,
  createProjectLabel,
  updateProjectLabel,
  deleteProjectLabel,
  addTaskLabel,
  removeTaskLabel,
  getProjectKnowledgeLinks,
  linkKnowledgePage,
  unlinkKnowledgePage,
  getProjectActivity,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  ProjectsQueryParams,
  TasksQueryParams,
  MyTasksQueryParams,
  MilestonesQueryParams,
  TaskCommentsQueryParams,
  ActivityQueryParams,
  NotificationsQueryParams,
} from "../api/projects";
import {
  Project,
  ProjectWithTasks,
  ProjectsResponse,
  CreateProjectInput,
  UpdateProjectInput,
  Task,
  TasksResponse,
  CreateTaskInput,
  UpdateTaskInput,
  MyTasksResponse,
  ProjectMember,
  ProjectMembersResponse,
  Milestone,
  MilestonesResponse,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  TaskComment,
  TaskCommentsResponse,
  CreateTaskCommentInput,
  UpdateTaskCommentInput,
  ProjectLabel,
  ProjectLabelsResponse,
  CreateLabelInput,
  UpdateLabelInput,
  ProjectKnowledgeLink,
  ProjectKnowledgeLinksResponse,
  ProjectActivityResponse,
  ProjectNotificationsResponse,
} from "../types/projects";

// Query keys
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params?: ProjectsQueryParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  members: (projectId: string) => [...projectKeys.detail(projectId), "members"] as const,
};

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (projectId: string, params?: TasksQueryParams) =>
    [...taskKeys.lists(), projectId, params] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (projectId: string, taskId: string) =>
    [...taskKeys.details(), projectId, taskId] as const,
  myTasks: (params?: MyTasksQueryParams) => [...taskKeys.all, "my-tasks", params] as const,
  allTasks: (params?: MyTasksQueryParams) => [...taskKeys.all, "all-tasks", params] as const,
};

// Projects queries
export function useProjects(params?: ProjectsQueryParams) {
  return useQuery<ProjectsResponse>({
    queryKey: projectKeys.list(params),
    queryFn: () => getProjects(params),
  });
}

export function useProject(id: string) {
  return useQuery<ProjectWithTasks>({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject(id),
    enabled: !!id,
  });
}

// Project mutations
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectInput) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<UpdateProjectInput, "id"> }) =>
      updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Tasks queries
export function useTasks(projectId: string, params?: TasksQueryParams) {
  return useQuery<TasksResponse>({
    queryKey: taskKeys.list(projectId, params),
    queryFn: () => getTasks(projectId, params),
    enabled: !!projectId,
  });
}

export function useTask(projectId: string, taskId: string) {
  return useQuery<Task>({
    queryKey: taskKeys.detail(projectId, taskId),
    queryFn: () => getTask(projectId, taskId),
    enabled: !!projectId && !!taskId,
  });
}

// Task mutations
export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskInput) => createTask(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Omit<UpdateTaskInput, "id"> }) =>
      updateTask(projectId, taskId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(projectId, taskId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
    },
  });
}

// My Tasks query
export function useMyTasks(params?: MyTasksQueryParams) {
  return useQuery<MyTasksResponse>({
    queryKey: taskKeys.myTasks(params),
    queryFn: () => getMyTasks(params),
  });
}

// All Tasks query (cross-project, all users)
export function useAllTasks(params?: MyTasksQueryParams) {
  return useQuery<MyTasksResponse>({
    queryKey: taskKeys.allTasks(params),
    queryFn: () => getAllTasks(params),
  });
}

// Project Members queries and mutations
export function useProjectMembers(projectId: string) {
  return useQuery<ProjectMembersResponse>({
    queryKey: projectKeys.members(projectId),
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId,
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { user_id: string; role?: string; hours_per_week?: number }) =>
      addProjectMember(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeProjectMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

// ============================================================================
// Milestones
// ============================================================================

export const milestoneKeys = {
  all: ["milestones"] as const,
  lists: () => [...milestoneKeys.all, "list"] as const,
  list: (projectId: string, params?: MilestonesQueryParams) =>
    [...milestoneKeys.lists(), projectId, params] as const,
  global: (params?: MilestonesQueryParams) =>
    [...milestoneKeys.all, "global", params] as const,
};

export function useMilestones(projectId: string, params?: MilestonesQueryParams) {
  return useQuery<MilestonesResponse>({
    queryKey: milestoneKeys.list(projectId, params),
    queryFn: () => getMilestones(projectId, params),
    enabled: !!projectId,
  });
}

export function useAllMilestones(params?: MilestonesQueryParams) {
  return useQuery<MilestonesResponse>({
    queryKey: milestoneKeys.global(params),
    queryFn: () => getAllMilestones(params),
  });
}

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMilestoneInput) => createMilestone(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
      queryClient.invalidateQueries({ queryKey: milestoneKeys.global() });
    },
  });
}

export function useUpdateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ milestoneId, data }: { milestoneId: string; data: Omit<UpdateMilestoneInput, "id"> }) =>
      updateMilestone(projectId, milestoneId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
      queryClient.invalidateQueries({ queryKey: milestoneKeys.global() });
    },
  });
}

export function useDeleteMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (milestoneId: string) => deleteMilestone(projectId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
      queryClient.invalidateQueries({ queryKey: milestoneKeys.global() });
    },
  });
}

// ============================================================================
// Task Comments
// ============================================================================

export const commentKeys = {
  all: ["task-comments"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (taskId: string, params?: TaskCommentsQueryParams) =>
    [...commentKeys.lists(), taskId, params] as const,
};

export function useTaskComments(taskId: string, params?: TaskCommentsQueryParams) {
  return useQuery<TaskCommentsResponse>({
    queryKey: commentKeys.list(taskId, params),
    queryFn: () => getTaskComments(taskId, params),
    enabled: !!taskId,
  });
}

export function useCreateTaskComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskCommentInput) => createTaskComment(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(taskId) });
    },
  });
}

export function useUpdateTaskComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateTaskCommentInput }) =>
      updateTaskComment(commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(taskId) });
    },
  });
}

export function useDeleteTaskComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteTaskComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(taskId) });
    },
  });
}

// ============================================================================
// Project Labels
// ============================================================================

export const labelKeys = {
  all: ["project-labels"] as const,
  lists: () => [...labelKeys.all, "list"] as const,
  list: (projectId: string) => [...labelKeys.lists(), projectId] as const,
};

export function useProjectLabels(projectId: string) {
  return useQuery<ProjectLabelsResponse>({
    queryKey: labelKeys.list(projectId),
    queryFn: () => getProjectLabels(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProjectLabel(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLabelInput) => createProjectLabel(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.list(projectId) });
    },
  });
}

export function useUpdateProjectLabel(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ labelId, data }: { labelId: string; data: UpdateLabelInput }) =>
      updateProjectLabel(labelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.list(projectId) });
    },
  });
}

export function useDeleteProjectLabel(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labelId: string) => deleteProjectLabel(labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.list(projectId) });
      // Also invalidate tasks since labels are shown on tasks
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useAddTaskLabel(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      addTaskLabel(taskId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useRemoveTaskLabel(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      removeTaskLabel(taskId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

// ============================================================================
// Project Knowledge Links
// ============================================================================

export const knowledgeLinkKeys = {
  all: ["project-knowledge-links"] as const,
  lists: () => [...knowledgeLinkKeys.all, "list"] as const,
  list: (projectId: string) => [...knowledgeLinkKeys.lists(), projectId] as const,
};

export function useProjectKnowledgeLinks(projectId: string) {
  return useQuery<ProjectKnowledgeLinksResponse>({
    queryKey: knowledgeLinkKeys.list(projectId),
    queryFn: () => getProjectKnowledgeLinks(projectId),
    enabled: !!projectId,
  });
}

export function useLinkKnowledgePage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pageId: string) => linkKnowledgePage(projectId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeLinkKeys.list(projectId) });
    },
  });
}

export function useUnlinkKnowledgePage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => unlinkKnowledgePage(projectId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeLinkKeys.list(projectId) });
    },
  });
}

// ============================================================================
// Project Activity
// ============================================================================

export const activityKeys = {
  all: ["project-activity"] as const,
  lists: () => [...activityKeys.all, "list"] as const,
  list: (projectId: string, params?: ActivityQueryParams) =>
    [...activityKeys.lists(), projectId, params] as const,
};

export function useProjectActivity(projectId: string, params?: ActivityQueryParams) {
  return useQuery<ProjectActivityResponse>({
    queryKey: activityKeys.list(projectId, params),
    queryFn: () => getProjectActivity(projectId, params),
    enabled: !!projectId,
  });
}

// ============================================================================
// Notifications
// ============================================================================

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params?: NotificationsQueryParams) => [...notificationKeys.lists(), params] as const,
};

export function useNotificationsList(params?: NotificationsQueryParams) {
  return useQuery<ProjectNotificationsResponse>({
    queryKey: notificationKeys.list(params),
    queryFn: () => getNotifications(params),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

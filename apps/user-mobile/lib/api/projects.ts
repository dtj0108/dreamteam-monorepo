import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
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
  ProjectUser,
  TaskStatus,
  Milestone,
  MilestonesResponse,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  MilestoneStatus,
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
  ProjectActivity,
  ProjectActivityResponse,
  ProjectNotification,
  ProjectNotificationsResponse,
} from "../types/projects";

export interface ProjectsQueryParams {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TasksQueryParams {
  status?: string;
  assignee?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MyTasksQueryParams {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const WORKSPACE_ID_KEY = "currentWorkspaceId";

// ============================================================================
// Helper Functions
// ============================================================================

async function getWorkspaceId(): Promise<string> {
  const workspaceId = await AsyncStorage.getItem(WORKSPACE_ID_KEY);
  if (!workspaceId) {
    throw new Error("No workspace selected");
  }
  return workspaceId;
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

// Helper to transform profile to ProjectUser
function profileToUser(profile: any): ProjectUser {
  return {
    id: profile.id,
    name: profile.name || profile.id,
    avatar_url: profile.avatar_url,
    email: profile.email,
  };
}

// ============================================================================
// Projects CRUD
// ============================================================================

export async function getProjects(params?: ProjectsQueryParams): Promise<ProjectsResponse> {
  console.log("[Projects API] getProjects via Supabase", params);
  try {
    const workspaceId = await getWorkspaceId();

    let query = supabase
      .from("projects")
      .select(`
        *,
        owner:profiles(id, name, avatar_url)
      `)
      .eq("workspace_id", workspaceId)
      .neq("status", "archived");

    if (params?.status) {
      query = query.eq("status", params.status);
    }
    if (params?.search) {
      query = query.ilike("name", `%${params.search}%`);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
    }

    query = query.order("updated_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Get task counts for each project to calculate progress
    const projects = (data || []) as any[];
    const projectIds = projects.map(p => p.id);

    if (projectIds.length > 0) {
      // Get task counts per project
      const { data: taskCounts, error: countError } = await supabase
        .from("tasks")
        .select("project_id, status")
        .in("project_id", projectIds)
        .is("parent_id", null); // Only count top-level tasks

      if (!countError && taskCounts) {
        const countsByProject = taskCounts.reduce((acc: Record<string, { total: number; done: number }>, task) => {
          if (!acc[task.project_id]) {
            acc[task.project_id] = { total: 0, done: 0 };
          }
          acc[task.project_id].total++;
          if (task.status === "done") {
            acc[task.project_id].done++;
          }
          return acc;
        }, {});

        projects.forEach(project => {
          const counts = countsByProject[project.id] || { total: 0, done: 0 };
          project.totalTasks = counts.total;
          project.completedTasks = counts.done;
          project.progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
        });
      }
    }

    // Transform owner profiles
    const transformedProjects = projects.map(p => ({
      ...p,
      owner: p.owner ? profileToUser(p.owner) : undefined,
    })) as Project[];

    console.log("[Projects API] getProjects response:", transformedProjects.length, "projects");
    return { projects: transformedProjects };
  } catch (error) {
    console.error("[Projects API] getProjects ERROR:", error);
    throw error;
  }
}

export async function getProject(id: string): Promise<ProjectWithTasks> {
  console.log("[Projects API] getProject via Supabase", id);
  try {
    // Get project with owner
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        owner:profiles(id, name, avatar_url)
      `)
      .eq("id", id)
      .single();

    if (projectError) throw projectError;

    // Get tasks for this project
    const { tasks } = await getTasks(id);

    // Calculate progress
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "done").length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const result: ProjectWithTasks = {
      ...project,
      owner: project.owner ? profileToUser(project.owner) : undefined,
      tasks,
      totalTasks,
      completedTasks,
      progress,
    };

    console.log("[Projects API] getProject response:", result.name, "with", tasks.length, "tasks");
    return result;
  } catch (error) {
    console.error("[Projects API] getProject ERROR:", error);
    throw error;
  }
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  console.log("[Projects API] createProject via Supabase", data);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    // Insert the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        workspace_id: workspaceId,
        name: data.name,
        description: data.description || null,
        status: data.status || "active",
        priority: data.priority || "medium",
        color: data.color || "#3b82f6",
        icon: data.icon || null,
        start_date: data.start_date || null,
        target_end_date: data.target_end_date || null,
        budget: data.budget || null,
        owner_id: userId,
      })
      .select(`
        *,
        owner:profiles(id, name, avatar_url)
      `)
      .single();

    if (projectError) throw projectError;

    // Add creator as owner member
    const { error: memberError } = await supabase
      .from("project_members")
      .insert({
        project_id: project.id,
        user_id: userId,
        role: "owner",
        hours_per_week: 0,
      });

    if (memberError) {
      console.error("[Projects API] Failed to add creator as member:", memberError);
      // Don't throw - project was created successfully
    }

    const result: Project = {
      ...project,
      owner: project.owner ? profileToUser(project.owner) : undefined,
      progress: 0,
      completedTasks: 0,
      totalTasks: 0,
    };

    console.log("[Projects API] createProject response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] createProject ERROR:", error);
    throw error;
  }
}

export async function updateProject(
  id: string,
  data: Omit<UpdateProjectInput, "id">
): Promise<Project> {
  console.log("[Projects API] updateProject via Supabase", id, data);
  try {
    const { data: project, error } = await supabase
      .from("projects")
      .update({
        name: data.name,
        description: data.description,
        status: data.status,
        priority: data.priority,
        color: data.color,
        icon: data.icon,
        start_date: data.start_date,
        target_end_date: data.target_end_date,
        actual_end_date: data.actual_end_date,
        budget: data.budget,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        owner:profiles(id, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    const result: Project = {
      ...project,
      owner: project.owner ? profileToUser(project.owner) : undefined,
    };

    console.log("[Projects API] updateProject response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] updateProject ERROR:", error);
    throw error;
  }
}

export async function deleteProject(id: string): Promise<void> {
  console.log("[Projects API] deleteProject via Supabase", id);
  try {
    // Soft delete by archiving
    const { error } = await supabase
      .from("projects")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    console.log("[Projects API] deleteProject success");
  } catch (error) {
    console.error("[Projects API] deleteProject ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Tasks CRUD
// ============================================================================

export async function getTasks(
  projectId: string,
  params?: TasksQueryParams
): Promise<TasksResponse> {
  console.log("[Projects API] getTasks via Supabase", projectId, params);
  try {
    // Step 1: Fetch tasks with NO joins (to avoid RLS recursion)
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .is("parent_id", null);

    if (params?.status) {
      query = query.eq("status", params.status);
    }
    if (params?.search) {
      query = query.ilike("title", `%${params.search}%`);
    }

    query = query
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return { tasks: [] };
    }

    const taskIds = tasks.map(t => t.id);

    // Step 2: Fetch subtasks separately (no joins)
    const { data: subtasks } = await supabase
      .from("tasks")
      .select("*")
      .in("parent_id", taskIds)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    const allTaskIds = [...taskIds, ...(subtasks || []).map(s => s.id)];

    // Step 3: Fetch task_assignees separately (no profile join)
    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("id, task_id, user_id")
      .in("task_id", allTaskIds);

    // Step 4: Fetch profiles separately for all assignee user IDs
    const userIds = [...new Set((assignees || []).map(a => a.user_id))];
    let profileMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    // Step 5: Group assignees by task_id
    const assigneesByTask: Record<string, any[]> = {};
    (assignees || []).forEach(a => {
      if (!assigneesByTask[a.task_id]) {
        assigneesByTask[a.task_id] = [];
      }
      assigneesByTask[a.task_id].push({
        id: a.id,
        task_id: a.task_id,
        user_id: a.user_id,
        user: profileMap[a.user_id] ? profileToUser(profileMap[a.user_id]) : undefined,
      });
    });

    // Step 6: Group subtasks by parent_id
    const subtasksByParent: Record<string, any[]> = {};
    (subtasks || []).forEach(st => {
      if (!subtasksByParent[st.parent_id]) {
        subtasksByParent[st.parent_id] = [];
      }
      subtasksByParent[st.parent_id].push({
        ...st,
        task_assignees: assigneesByTask[st.id] || [],
      });
    });

    // Step 7: Build final tasks with assignees and subtasks
    const transformedTasks = tasks.map(task => ({
      ...task,
      task_assignees: assigneesByTask[task.id] || [],
      subtasks: subtasksByParent[task.id] || [],
    })) as Task[];

    // Filter by assignee if needed
    let filteredTasks = transformedTasks;
    if (params?.assignee) {
      filteredTasks = transformedTasks.filter(task =>
        task.task_assignees?.some(ta => ta.user_id === params.assignee)
      );
    }

    console.log("[Projects API] getTasks response:", filteredTasks.length, "tasks");
    return { tasks: filteredTasks };
  } catch (error) {
    console.error("[Projects API] getTasks ERROR:", error);
    throw error;
  }
}

export async function getTask(projectId: string, taskId: string): Promise<Task> {
  console.log("[Projects API] getTask via Supabase", projectId, taskId);
  try {
    // Step 1: Fetch task with NO joins (to avoid RLS recursion)
    const { data: task, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("project_id", projectId)
      .single();

    if (error) throw error;

    // Step 2: Fetch subtasks separately (no joins)
    const { data: subtasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("parent_id", taskId)
      .order("position", { ascending: true });

    const allTaskIds = [taskId, ...(subtasks || []).map(s => s.id)];

    // Step 3: Fetch task_assignees separately (no profile join)
    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("id, task_id, user_id")
      .in("task_id", allTaskIds);

    // Step 4: Fetch profiles separately for all assignee user IDs
    const userIds = [...new Set((assignees || []).map(a => a.user_id))];
    let profileMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    // Step 5: Group assignees by task_id
    const assigneesByTask: Record<string, any[]> = {};
    (assignees || []).forEach(a => {
      if (!assigneesByTask[a.task_id]) {
        assigneesByTask[a.task_id] = [];
      }
      assigneesByTask[a.task_id].push({
        id: a.id,
        task_id: a.task_id,
        user_id: a.user_id,
        user: profileMap[a.user_id] ? profileToUser(profileMap[a.user_id]) : undefined,
      });
    });

    // Step 6: Build final task with assignees and subtasks
    const result: Task = {
      ...task,
      task_assignees: assigneesByTask[taskId] || [],
      subtasks: (subtasks || []).map(st => ({
        ...st,
        task_assignees: assigneesByTask[st.id] || [],
      })),
    };

    console.log("[Projects API] getTask response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] getTask ERROR:", error);
    throw error;
  }
}

export async function createTask(
  projectId: string,
  data: CreateTaskInput
): Promise<Task> {
  console.log("[Projects API] createTask via Supabase", projectId, data);
  try {
    const userId = await getCurrentUserId();

    // Get the next position for the task
    const { data: maxPositionTask } = await supabase
      .from("tasks")
      .select("position")
      .eq("project_id", projectId)
      .is("parent_id", data.parent_id || null)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPositionTask?.position || 0) + 1;

    // Insert the task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        parent_id: data.parent_id || null,
        title: data.title,
        description: data.description || null,
        status: data.status || "todo",
        priority: data.priority || "medium",
        start_date: data.start_date || null,
        due_date: data.due_date || null,
        estimated_hours: data.estimated_hours || null,
        position: data.position ?? nextPosition,
        created_by: userId,
      })
      .select(`*`)
      .single();

    if (taskError) throw taskError;

    // Add assignees if provided
    if (data.assignees && data.assignees.length > 0) {
      const assigneeInserts = data.assignees.map(assigneeId => ({
        task_id: task.id,
        user_id: assigneeId,
      }));

      const { error: assigneeError } = await supabase
        .from("task_assignees")
        .insert(assigneeInserts);

      if (assigneeError) {
        console.error("[Projects API] Failed to add assignees:", assigneeError);
      }
    }

    // Fetch the complete task with assignees
    const result = await getTask(projectId, task.id);

    console.log("[Projects API] createTask response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] createTask ERROR:", error);
    throw error;
  }
}

export async function updateTask(
  projectId: string,
  taskId: string,
  data: Omit<UpdateTaskInput, "id">
): Promise<Task> {
  console.log("[Projects API] updateTask via Supabase", projectId, taskId, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are provided
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.start_date !== undefined) updateData.start_date = data.start_date;
    if (data.due_date !== undefined) updateData.due_date = data.due_date;
    if (data.estimated_hours !== undefined) updateData.estimated_hours = data.estimated_hours;
    if (data.actual_hours !== undefined) updateData.actual_hours = data.actual_hours;
    if (data.position !== undefined) updateData.position = data.position;

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("project_id", projectId)
      .select()
      .single();

    if (error) throw error;

    // Update assignees if provided
    if (data.assignees !== undefined) {
      // Remove existing assignees
      await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", taskId);

      // Add new assignees
      if (data.assignees.length > 0) {
        const assigneeInserts = data.assignees.map(assigneeId => ({
          task_id: taskId,
          user_id: assigneeId,
        }));

        await supabase
          .from("task_assignees")
          .insert(assigneeInserts);
      }
    }

    // Fetch the complete task with all relations
    const result = await getTask(projectId, taskId);

    console.log("[Projects API] updateTask response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] updateTask ERROR:", error);
    throw error;
  }
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  console.log("[Projects API] deleteTask via Supabase", projectId, taskId);
  try {
    // Delete assignees first (cascade may handle this, but being explicit)
    await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId);

    // Delete any subtasks
    await supabase
      .from("tasks")
      .delete()
      .eq("parent_id", taskId);

    // Delete the task
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("project_id", projectId);

    if (error) throw error;

    console.log("[Projects API] deleteTask success");
  } catch (error) {
    console.error("[Projects API] deleteTask ERROR:", error);
    throw error;
  }
}

// ============================================================================
// My Tasks (cross-project)
// ============================================================================

export async function getMyTasks(params?: MyTasksQueryParams): Promise<MyTasksResponse> {
  console.log("[Projects API] getMyTasks via Supabase", params);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();
    console.log("[Projects API] getMyTasks - userId:", userId, "workspaceId:", workspaceId);

    // Step 1: Get task IDs assigned to the current user (with user_id for later)
    const { data: myAssignments, error: assigneeError } = await supabase
      .from("task_assignees")
      .select("id, task_id, user_id")
      .eq("user_id", userId);

    if (assigneeError) throw assigneeError;

    const taskIds = (myAssignments || []).map(a => a.task_id);
    console.log("[Projects API] getMyTasks - found", taskIds.length, "task assignments for user");

    if (taskIds.length === 0) {
      console.log("[Projects API] getMyTasks - no assignments found, returning empty");
      return {
        tasks: [],
        total: 0,
        stats: { todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 },
      };
    }

    // Step 2: Get tasks with NO joins (to avoid RLS recursion)
    let query = supabase
      .from("tasks")
      .select("*")
      .in("id", taskIds);

    if (params?.status) {
      query = query.eq("status", params.status);
    }
    if (params?.search) {
      query = query.ilike("title", `%${params.search}%`);
    }

    query = query.order("due_date", { ascending: true, nullsFirst: false });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return {
        tasks: [],
        total: 0,
        stats: { todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 },
      };
    }

    const fetchedTaskIds = tasks.map(t => t.id);

    // Step 3: Fetch ALL assignees for these tasks separately (no profile join)
    const { data: allAssignees } = await supabase
      .from("task_assignees")
      .select("id, task_id, user_id")
      .in("task_id", fetchedTaskIds);

    // Step 4: Fetch profiles separately for all assignee user IDs
    const allUserIds = [...new Set((allAssignees || []).map(a => a.user_id))];
    let profileMap: Record<string, any> = {};

    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", allUserIds);

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    // Step 5: Group assignees by task_id
    const assigneesByTask: Record<string, any[]> = {};
    (allAssignees || []).forEach(a => {
      if (!assigneesByTask[a.task_id]) {
        assigneesByTask[a.task_id] = [];
      }
      assigneesByTask[a.task_id].push({
        id: a.id,
        task_id: a.task_id,
        user_id: a.user_id,
        user: profileMap[a.user_id] ? profileToUser(profileMap[a.user_id]) : undefined,
      });
    });

    // Step 6: Get unique project IDs and fetch project info separately
    const projectIds = [...new Set(tasks.map(t => t.project_id))];

    let projectMap: Record<string, { id: string; name: string; color: string; workspace_id: string }> = {};

    if (projectIds.length > 0) {
      const { data: projects, error: projectError } = await supabase
        .from("projects")
        .select("id, name, color, workspace_id")
        .in("id", projectIds);

      if (!projectError && projects) {
        projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
      }
    }

    // Step 7: Filter to current workspace and merge project + assignee info
    console.log("[Projects API] getMyTasks - tasks before workspace filter:", tasks.length);
    const workspaceTasks = tasks.filter((t: any) => {
      const project = projectMap[t.project_id];
      return project?.workspace_id === workspaceId;
    });
    console.log("[Projects API] getMyTasks - tasks after workspace filter:", workspaceTasks.length);
    if (tasks.length !== workspaceTasks.length) {
      console.log("[Projects API] getMyTasks - filtered out", tasks.length - workspaceTasks.length, "tasks from other workspaces");
    }

    const transformedTasks = workspaceTasks.map((task: any) => {
      const project = projectMap[task.project_id];
      return {
        ...task,
        task_assignees: assigneesByTask[task.id] || [],
        project: project ? {
          id: project.id,
          name: project.name,
          color: project.color,
        } : undefined,
      };
    }) as Task[];

    // Calculate stats
    const now = new Date();
    const stats = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
      overdue: 0,
    };

    transformedTasks.forEach(task => {
      stats[task.status as keyof typeof stats]++;
      if (task.due_date && new Date(task.due_date) < now && task.status !== "done") {
        stats.overdue++;
      }
    });

    console.log("[Projects API] getMyTasks response:", transformedTasks.length, "tasks");
    return {
      tasks: transformedTasks,
      total: transformedTasks.length,
      stats,
    };
  } catch (error) {
    console.error("[Projects API] getMyTasks ERROR:", error);
    throw error;
  }
}

// ============================================================================
// All Tasks (cross-project, all users)
// ============================================================================

export async function getAllTasks(params?: MyTasksQueryParams): Promise<MyTasksResponse> {
  console.log("[Projects API] getAllTasks via Supabase", params);
  try {
    const workspaceId = await getWorkspaceId();

    // Step 1: Get all projects in the workspace
    const { data: projects, error: projectError } = await supabase
      .from("projects")
      .select("id, name, color, workspace_id")
      .eq("workspace_id", workspaceId);

    if (projectError) throw projectError;

    if (!projects || projects.length === 0) {
      return {
        tasks: [],
        total: 0,
        stats: { todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 },
      };
    }

    const projectIds = projects.map(p => p.id);
    const projectMap: Record<string, { id: string; name: string; color: string }> =
      Object.fromEntries(projects.map(p => [p.id, { id: p.id, name: p.name, color: p.color }]));

    // Step 2: Get all tasks from these projects
    let query = supabase
      .from("tasks")
      .select("*")
      .in("project_id", projectIds);

    if (params?.status) {
      query = query.eq("status", params.status);
    }
    if (params?.search) {
      query = query.ilike("title", `%${params.search}%`);
    }

    query = query.order("due_date", { ascending: true, nullsFirst: false });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return {
        tasks: [],
        total: 0,
        stats: { todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 },
      };
    }

    const fetchedTaskIds = tasks.map(t => t.id);

    // Step 3: Fetch ALL assignees for these tasks
    const { data: allAssignees } = await supabase
      .from("task_assignees")
      .select("id, task_id, user_id")
      .in("task_id", fetchedTaskIds);

    // Step 4: Fetch profiles for all assignee user IDs
    const allUserIds = [...new Set((allAssignees || []).map(a => a.user_id))];
    let profileMap: Record<string, any> = {};

    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", allUserIds);

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    // Step 5: Group assignees by task_id
    const assigneesByTask: Record<string, any[]> = {};
    (allAssignees || []).forEach(a => {
      if (!assigneesByTask[a.task_id]) {
        assigneesByTask[a.task_id] = [];
      }
      assigneesByTask[a.task_id].push({
        id: a.id,
        task_id: a.task_id,
        user_id: a.user_id,
        user: profileMap[a.user_id] ? profileToUser(profileMap[a.user_id]) : undefined,
      });
    });

    // Step 6: Merge project + assignee info
    const transformedTasks = tasks.map((task: any) => {
      const project = projectMap[task.project_id];
      return {
        ...task,
        task_assignees: assigneesByTask[task.id] || [],
        project: project ? {
          id: project.id,
          name: project.name,
          color: project.color,
        } : undefined,
      };
    }) as Task[];

    // Calculate stats
    const now = new Date();
    const stats = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
      overdue: 0,
    };

    transformedTasks.forEach(task => {
      stats[task.status as keyof typeof stats]++;
      if (task.due_date && new Date(task.due_date) < now && task.status !== "done") {
        stats.overdue++;
      }
    });

    console.log("[Projects API] getAllTasks response:", transformedTasks.length, "tasks");
    return {
      tasks: transformedTasks,
      total: transformedTasks.length,
      stats,
    };
  } catch (error) {
    console.error("[Projects API] getAllTasks ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Project Members
// ============================================================================

export async function getProjectMembers(projectId: string): Promise<ProjectMembersResponse> {
  console.log("[Projects API] getProjectMembers via Supabase", projectId);
  try {
    const { data, error } = await supabase
      .from("project_members")
      .select(`
        *,
        user:profiles(id, name, avatar_url)
      `)
      .eq("project_id", projectId);

    if (error) throw error;

    const members = (data || []).map((m: any) => ({
      ...m,
      user: m.user ? profileToUser(m.user) : undefined,
    })) as ProjectMember[];

    console.log("[Projects API] getProjectMembers response:", members.length, "members");
    return { members };
  } catch (error) {
    console.error("[Projects API] getProjectMembers ERROR:", error);
    throw error;
  }
}

export async function addProjectMember(
  projectId: string,
  data: { user_id: string; role?: string; hours_per_week?: number }
): Promise<ProjectMember> {
  console.log("[Projects API] addProjectMember via Supabase", projectId, data);
  try {
    const { data: member, error } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: data.user_id,
        role: data.role || "member",
        hours_per_week: data.hours_per_week || 0,
      })
      .select(`
        *,
        user:profiles(id, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    const result: ProjectMember = {
      ...member,
      user: member.user ? profileToUser(member.user) : undefined,
    } as ProjectMember;

    console.log("[Projects API] addProjectMember response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] addProjectMember ERROR:", error);
    throw error;
  }
}

export async function removeProjectMember(
  projectId: string,
  memberId: string
): Promise<void> {
  console.log("[Projects API] removeProjectMember via Supabase", projectId, memberId);
  try {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId)
      .eq("project_id", projectId);

    if (error) throw error;

    console.log("[Projects API] removeProjectMember success");
  } catch (error) {
    console.error("[Projects API] removeProjectMember ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Milestones
// ============================================================================

export interface MilestonesQueryParams {
  status?: MilestoneStatus;
  limit?: number;
  offset?: number;
}

export async function getMilestones(
  projectId: string,
  params?: MilestonesQueryParams
): Promise<MilestonesResponse> {
  console.log("[Projects API] getMilestones via Supabase", projectId, params);
  try {
    let query = supabase
      .from("milestones")
      .select("*")
      .eq("project_id", projectId);

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    query = query.order("target_date", { ascending: true });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data: milestones, error } = await query;

    if (error) throw error;

    if (!milestones || milestones.length === 0) {
      return { milestones: [] };
    }

    const milestoneIds = milestones.map(m => m.id);

    // Get linked tasks for each milestone
    const { data: milestoneTasks } = await supabase
      .from("milestone_tasks")
      .select("milestone_id, task_id")
      .in("milestone_id", milestoneIds);

    // Get task details
    const taskIds = [...new Set((milestoneTasks || []).map(mt => mt.task_id))];
    let tasksMap: Record<string, Task> = {};

    if (taskIds.length > 0) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);

      if (tasks) {
        tasksMap = Object.fromEntries(tasks.map(t => [t.id, t]));
      }
    }

    // Group tasks by milestone
    const tasksByMilestone: Record<string, { task: Task }[]> = {};
    (milestoneTasks || []).forEach(mt => {
      if (!tasksByMilestone[mt.milestone_id]) {
        tasksByMilestone[mt.milestone_id] = [];
      }
      if (tasksMap[mt.task_id]) {
        tasksByMilestone[mt.milestone_id].push({ task: tasksMap[mt.task_id] });
      }
    });

    // Calculate progress for each milestone
    const transformedMilestones = milestones.map(milestone => {
      const linkedTasks = tasksByMilestone[milestone.id] || [];
      const totalTasks = linkedTasks.length;
      const completedTasks = linkedTasks.filter(lt => lt.task.status === "done").length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...milestone,
        milestone_tasks: linkedTasks,
        progress,
        completedTasks,
        totalTasks,
      };
    }) as Milestone[];

    console.log("[Projects API] getMilestones response:", transformedMilestones.length, "milestones");
    return { milestones: transformedMilestones };
  } catch (error) {
    console.error("[Projects API] getMilestones ERROR:", error);
    throw error;
  }
}

export async function getAllMilestones(params?: MilestonesQueryParams): Promise<MilestonesResponse> {
  console.log("[Projects API] getAllMilestones via Supabase", params);
  try {
    const workspaceId = await getWorkspaceId();

    // Get all projects in workspace
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, color")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived");

    if (!projects || projects.length === 0) {
      return { milestones: [] };
    }

    const projectIds = projects.map(p => p.id);
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

    // Get all milestones from these projects
    let query = supabase
      .from("milestones")
      .select("*")
      .in("project_id", projectIds);

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    query = query.order("target_date", { ascending: true });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data: milestones, error } = await query;

    if (error) throw error;

    if (!milestones || milestones.length === 0) {
      return { milestones: [] };
    }

    const milestoneIds = milestones.map(m => m.id);

    // Get linked tasks for each milestone
    const { data: milestoneTasks } = await supabase
      .from("milestone_tasks")
      .select("milestone_id, task_id")
      .in("milestone_id", milestoneIds);

    // Get task details
    const taskIds = [...new Set((milestoneTasks || []).map(mt => mt.task_id))];
    let tasksMap: Record<string, Task> = {};

    if (taskIds.length > 0) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);

      if (tasks) {
        tasksMap = Object.fromEntries(tasks.map(t => [t.id, t]));
      }
    }

    // Group tasks by milestone
    const tasksByMilestone: Record<string, { task: Task }[]> = {};
    (milestoneTasks || []).forEach(mt => {
      if (!tasksByMilestone[mt.milestone_id]) {
        tasksByMilestone[mt.milestone_id] = [];
      }
      if (tasksMap[mt.task_id]) {
        tasksByMilestone[mt.milestone_id].push({ task: tasksMap[mt.task_id] });
      }
    });

    // Transform milestones with project info and progress
    const transformedMilestones = milestones.map(milestone => {
      const linkedTasks = tasksByMilestone[milestone.id] || [];
      const totalTasks = linkedTasks.length;
      const completedTasks = linkedTasks.filter(lt => lt.task.status === "done").length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...milestone,
        project: projectMap[milestone.project_id],
        milestone_tasks: linkedTasks,
        progress,
        completedTasks,
        totalTasks,
      };
    }) as Milestone[];

    console.log("[Projects API] getAllMilestones response:", transformedMilestones.length, "milestones");
    return { milestones: transformedMilestones };
  } catch (error) {
    console.error("[Projects API] getAllMilestones ERROR:", error);
    throw error;
  }
}

export async function createMilestone(
  projectId: string,
  data: CreateMilestoneInput
): Promise<Milestone> {
  console.log("[Projects API] createMilestone via Supabase", projectId, data);
  try {
    // Insert the milestone
    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .insert({
        project_id: projectId,
        name: data.name,
        description: data.description || null,
        target_date: data.target_date,
        status: "upcoming",
      })
      .select()
      .single();

    if (milestoneError) throw milestoneError;

    // Link tasks if provided
    if (data.tasks && data.tasks.length > 0) {
      const taskLinks = data.tasks.map(taskId => ({
        milestone_id: milestone.id,
        task_id: taskId,
      }));

      await supabase.from("milestone_tasks").insert(taskLinks);
    }

    const result: Milestone = {
      ...milestone,
      milestone_tasks: [],
      progress: 0,
      completedTasks: 0,
      totalTasks: data.tasks?.length || 0,
    };

    console.log("[Projects API] createMilestone response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] createMilestone ERROR:", error);
    throw error;
  }
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  data: Omit<UpdateMilestoneInput, "id">
): Promise<Milestone> {
  console.log("[Projects API] updateMilestone via Supabase", projectId, milestoneId, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.target_date !== undefined) updateData.target_date = data.target_date;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: milestone, error } = await supabase
      .from("milestones")
      .update(updateData)
      .eq("id", milestoneId)
      .eq("project_id", projectId)
      .select()
      .single();

    if (error) throw error;

    // Update linked tasks if provided
    if (data.tasks !== undefined) {
      // Remove existing links
      await supabase
        .from("milestone_tasks")
        .delete()
        .eq("milestone_id", milestoneId);

      // Add new links
      if (data.tasks.length > 0) {
        const taskLinks = data.tasks.map(taskId => ({
          milestone_id: milestoneId,
          task_id: taskId,
        }));

        await supabase.from("milestone_tasks").insert(taskLinks);
      }
    }

    const result: Milestone = {
      ...milestone,
      progress: 0,
      completedTasks: 0,
      totalTasks: 0,
    };

    console.log("[Projects API] updateMilestone response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] updateMilestone ERROR:", error);
    throw error;
  }
}

export async function deleteMilestone(
  projectId: string,
  milestoneId: string
): Promise<void> {
  console.log("[Projects API] deleteMilestone via Supabase", projectId, milestoneId);
  try {
    // Delete task links first
    await supabase
      .from("milestone_tasks")
      .delete()
      .eq("milestone_id", milestoneId);

    // Delete the milestone
    const { error } = await supabase
      .from("milestones")
      .delete()
      .eq("id", milestoneId)
      .eq("project_id", projectId);

    if (error) throw error;

    console.log("[Projects API] deleteMilestone success");
  } catch (error) {
    console.error("[Projects API] deleteMilestone ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Task Comments
// ============================================================================

export interface TaskCommentsQueryParams {
  limit?: number;
  offset?: number;
}

export async function getTaskComments(
  taskId: string,
  params?: TaskCommentsQueryParams
): Promise<TaskCommentsResponse> {
  console.log("[Projects API] getTaskComments via Supabase", taskId, params);
  try {
    // Step 1: Fetch comments with NO joins (to avoid RLS recursion)
    let query = supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data: comments, error } = await query;

    if (error) throw error;

    if (!comments || comments.length === 0) {
      return { comments: [] };
    }

    // Step 2: Get unique user IDs and fetch profiles separately
    const userIds = [...new Set(comments.map(c => c.user_id))];
    let profileMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    // Step 3: Transform comments with user data
    const transformedComments = comments.map(comment => ({
      ...comment,
      user: profileMap[comment.user_id] ? profileToUser(profileMap[comment.user_id]) : undefined,
    })) as TaskComment[];

    console.log("[Projects API] getTaskComments response:", transformedComments.length, "comments");
    return { comments: transformedComments };
  } catch (error) {
    console.error("[Projects API] getTaskComments ERROR:", error);
    throw error;
  }
}

export async function createTaskComment(
  taskId: string,
  data: CreateTaskCommentInput
): Promise<TaskComment> {
  console.log("[Projects API] createTaskComment via Supabase", taskId, data);
  try {
    const userId = await getCurrentUserId();

    // Insert the comment
    const { data: comment, error: commentError } = await supabase
      .from("task_comments")
      .insert({
        task_id: taskId,
        user_id: userId,
        content: data.content,
      })
      .select()
      .single();

    if (commentError) throw commentError;

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", userId)
      .single();

    const result: TaskComment = {
      ...comment,
      user: profile ? profileToUser(profile) : undefined,
    };

    console.log("[Projects API] createTaskComment response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] createTaskComment ERROR:", error);
    throw error;
  }
}

export async function updateTaskComment(
  commentId: string,
  data: UpdateTaskCommentInput
): Promise<TaskComment> {
  console.log("[Projects API] updateTaskComment via Supabase", commentId, data);
  try {
    const { data: comment, error } = await supabase
      .from("task_comments")
      .update({
        content: data.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .select()
      .single();

    if (error) throw error;

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", comment.user_id)
      .single();

    const result: TaskComment = {
      ...comment,
      user: profile ? profileToUser(profile) : undefined,
    };

    console.log("[Projects API] updateTaskComment response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] updateTaskComment ERROR:", error);
    throw error;
  }
}

export async function deleteTaskComment(commentId: string): Promise<void> {
  console.log("[Projects API] deleteTaskComment via Supabase", commentId);
  try {
    const { error } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", commentId);

    if (error) throw error;

    console.log("[Projects API] deleteTaskComment success");
  } catch (error) {
    console.error("[Projects API] deleteTaskComment ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Project Labels
// ============================================================================

export async function getProjectLabels(projectId: string): Promise<ProjectLabelsResponse> {
  console.log("[Projects API] getProjectLabels via Supabase", projectId);
  try {
    const { data: labels, error } = await supabase
      .from("project_labels")
      .select("*")
      .eq("project_id", projectId)
      .order("name", { ascending: true });

    if (error) throw error;

    console.log("[Projects API] getProjectLabels response:", (labels || []).length, "labels");
    return { labels: (labels || []) as ProjectLabel[] };
  } catch (error) {
    console.error("[Projects API] getProjectLabels ERROR:", error);
    throw error;
  }
}

export async function createProjectLabel(
  projectId: string,
  data: CreateLabelInput
): Promise<ProjectLabel> {
  console.log("[Projects API] createProjectLabel via Supabase", projectId, data);
  try {
    const { data: label, error } = await supabase
      .from("project_labels")
      .insert({
        project_id: projectId,
        name: data.name,
        color: data.color,
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[Projects API] createProjectLabel response:", label);
    return label as ProjectLabel;
  } catch (error) {
    console.error("[Projects API] createProjectLabel ERROR:", error);
    throw error;
  }
}

export async function updateProjectLabel(
  labelId: string,
  data: UpdateLabelInput
): Promise<ProjectLabel> {
  console.log("[Projects API] updateProjectLabel via Supabase", labelId, data);
  try {
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;

    const { data: label, error } = await supabase
      .from("project_labels")
      .update(updateData)
      .eq("id", labelId)
      .select()
      .single();

    if (error) throw error;

    console.log("[Projects API] updateProjectLabel response:", label);
    return label as ProjectLabel;
  } catch (error) {
    console.error("[Projects API] updateProjectLabel ERROR:", error);
    throw error;
  }
}

export async function deleteProjectLabel(labelId: string): Promise<void> {
  console.log("[Projects API] deleteProjectLabel via Supabase", labelId);
  try {
    // Delete task label assignments first
    await supabase
      .from("task_labels")
      .delete()
      .eq("label_id", labelId);

    // Delete the label
    const { error } = await supabase
      .from("project_labels")
      .delete()
      .eq("id", labelId);

    if (error) throw error;

    console.log("[Projects API] deleteProjectLabel success");
  } catch (error) {
    console.error("[Projects API] deleteProjectLabel ERROR:", error);
    throw error;
  }
}

// Task Labels (assigning labels to tasks)
export async function addTaskLabel(taskId: string, labelId: string): Promise<void> {
  console.log("[Projects API] addTaskLabel via Supabase", taskId, labelId);
  try {
    const { error } = await supabase
      .from("task_labels")
      .insert({
        task_id: taskId,
        label_id: labelId,
      });

    if (error) throw error;

    console.log("[Projects API] addTaskLabel success");
  } catch (error) {
    console.error("[Projects API] addTaskLabel ERROR:", error);
    throw error;
  }
}

export async function removeTaskLabel(taskId: string, labelId: string): Promise<void> {
  console.log("[Projects API] removeTaskLabel via Supabase", taskId, labelId);
  try {
    const { error } = await supabase
      .from("task_labels")
      .delete()
      .eq("task_id", taskId)
      .eq("label_id", labelId);

    if (error) throw error;

    console.log("[Projects API] removeTaskLabel success");
  } catch (error) {
    console.error("[Projects API] removeTaskLabel ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Project Knowledge Links
// ============================================================================

export async function getProjectKnowledgeLinks(
  projectId: string
): Promise<ProjectKnowledgeLinksResponse> {
  console.log("[Projects API] getProjectKnowledgeLinks via Supabase", projectId);
  try {
    // Fetch links with NO joins (to avoid RLS recursion)
    const { data: links, error } = await supabase
      .from("project_knowledge_links")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!links || links.length === 0) {
      return { links: [] };
    }

    // Fetch page info separately
    const pageIds = links.map(l => l.page_id);
    const { data: pages } = await supabase
      .from("knowledge_pages")
      .select("id, title, icon")
      .in("id", pageIds);

    const pageMap = Object.fromEntries((pages || []).map(p => [p.id, p]));

    // Transform links with page data
    const transformedLinks = links.map(link => ({
      ...link,
      page: pageMap[link.page_id] || undefined,
    })) as ProjectKnowledgeLink[];

    console.log("[Projects API] getProjectKnowledgeLinks response:", transformedLinks.length, "links");
    return { links: transformedLinks };
  } catch (error) {
    console.error("[Projects API] getProjectKnowledgeLinks ERROR:", error);
    throw error;
  }
}

export async function linkKnowledgePage(
  projectId: string,
  pageId: string
): Promise<ProjectKnowledgeLink> {
  console.log("[Projects API] linkKnowledgePage via Supabase", projectId, pageId);
  try {
    const { data: link, error } = await supabase
      .from("project_knowledge_links")
      .insert({
        project_id: projectId,
        page_id: pageId,
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch page info
    const { data: page } = await supabase
      .from("knowledge_pages")
      .select("id, title, icon")
      .eq("id", pageId)
      .single();

    const result: ProjectKnowledgeLink = {
      ...link,
      page: page || undefined,
    };

    console.log("[Projects API] linkKnowledgePage response:", result);
    return result;
  } catch (error) {
    console.error("[Projects API] linkKnowledgePage ERROR:", error);
    throw error;
  }
}

export async function unlinkKnowledgePage(
  projectId: string,
  linkId: string
): Promise<void> {
  console.log("[Projects API] unlinkKnowledgePage via Supabase", projectId, linkId);
  try {
    const { error } = await supabase
      .from("project_knowledge_links")
      .delete()
      .eq("id", linkId)
      .eq("project_id", projectId);

    if (error) throw error;

    console.log("[Projects API] unlinkKnowledgePage success");
  } catch (error) {
    console.error("[Projects API] unlinkKnowledgePage ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Project Activity
// ============================================================================

export interface ActivityQueryParams {
  limit?: number;
  offset?: number;
}

export async function getProjectActivity(
  projectId: string,
  params?: ActivityQueryParams
): Promise<ProjectActivityResponse> {
  console.log("[Projects API] getProjectActivity via Supabase", projectId, params);
  try {
    // Step 1: Fetch activities with NO joins (to avoid RLS recursion)
    let query = supabase
      .from("project_activities")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data: activities, error } = await query;

    if (error) throw error;

    if (!activities || activities.length === 0) {
      return { activities: [] };
    }

    // Step 2: Get unique user IDs and fetch profiles separately
    const userIds = [...new Set(activities.map(a => a.user_id))];
    let profileMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    // Step 3: Transform activities with user data
    const transformedActivities = activities.map(activity => ({
      ...activity,
      user: profileMap[activity.user_id] ? profileToUser(profileMap[activity.user_id]) : undefined,
    })) as ProjectActivity[];

    console.log("[Projects API] getProjectActivity response:", transformedActivities.length, "activities");
    return { activities: transformedActivities };
  } catch (error) {
    console.error("[Projects API] getProjectActivity ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Notifications
// ============================================================================

export interface NotificationsQueryParams {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

export async function getNotifications(
  params?: NotificationsQueryParams
): Promise<ProjectNotificationsResponse> {
  console.log("[Projects API] getNotifications via Supabase", params);
  try {
    const userId = await getCurrentUserId();

    // Step 1: Fetch notifications with NO joins (to avoid RLS recursion)
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (params?.unread_only) {
      query = query.eq("is_read", false);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!notifications || notifications.length === 0) {
      return { notifications: [], unread_count: unreadCount || 0 };
    }

    // Step 2: Get unique project and task IDs
    const projectIds = [...new Set(notifications.filter(n => n.project_id).map(n => n.project_id))];
    const taskIds = [...new Set(notifications.filter(n => n.task_id).map(n => n.task_id))];

    // Step 3: Fetch project info separately
    let projectMap: Record<string, { id: string; name: string; color: string }> = {};
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, color")
        .in("id", projectIds);

      if (projects) {
        projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
      }
    }

    // Step 4: Fetch task info separately
    let taskMap: Record<string, { id: string; title: string }> = {};
    if (taskIds.length > 0) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title")
        .in("id", taskIds);

      if (tasks) {
        taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));
      }
    }

    // Step 5: Transform notifications with project and task data
    const transformedNotifications = notifications.map(notification => ({
      ...notification,
      project: notification.project_id ? projectMap[notification.project_id] : undefined,
      task: notification.task_id ? taskMap[notification.task_id] : undefined,
    })) as ProjectNotification[];

    console.log("[Projects API] getNotifications response:", transformedNotifications.length, "notifications");
    return {
      notifications: transformedNotifications,
      unread_count: unreadCount || 0,
    };
  } catch (error: any) {
    // Gracefully handle missing table (PGRST205 = table not found)
    if (error?.code === "PGRST205") {
      console.log("[Projects API] Notifications table not found, returning empty data");
      return { notifications: [], unread_count: 0 };
    }
    console.error("[Projects API] getNotifications ERROR:", error);
    throw error;
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  console.log("[Projects API] markNotificationRead via Supabase", notificationId);
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throw error;

    console.log("[Projects API] markNotificationRead success");
  } catch (error: any) {
    // Silently ignore if table doesn't exist
    if (error?.code === "PGRST205") return;
    console.error("[Projects API] markNotificationRead ERROR:", error);
    throw error;
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  console.log("[Projects API] markAllNotificationsRead via Supabase");
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    console.log("[Projects API] markAllNotificationsRead success");
  } catch (error: any) {
    // Silently ignore if table doesn't exist
    if (error?.code === "PGRST205") return;
    console.error("[Projects API] markAllNotificationsRead ERROR:", error);
    throw error;
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  console.log("[Projects API] deleteNotification via Supabase", notificationId);
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;

    console.log("[Projects API] deleteNotification success");
  } catch (error: any) {
    // Silently ignore if table doesn't exist
    if (error?.code === "PGRST205") return;
    console.error("[Projects API] deleteNotification ERROR:", error);
    throw error;
  }
}

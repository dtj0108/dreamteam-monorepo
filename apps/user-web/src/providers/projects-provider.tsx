"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

// Types
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived"
export type ProjectPriority = "low" | "medium" | "high" | "critical"
export type TaskStatus = "todo" | "in_progress" | "review" | "done"
export type TaskPriority = "low" | "medium" | "high" | "urgent"

export interface Department {
  id: string
  workspace_id: string
  name: string
  description: string | null
  color: string
  icon: string
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
  project_count?: number
}

export interface ProjectMember {
  id: string
  role: string
  hours_per_week: number
  user: {
    id: string
    name: string
    avatar_url: string | null
    email?: string
  }
}

export interface ProjectLabel {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  project_id: string
  parent_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  start_date: string | null
  due_date: string | null
  estimated_hours: number | null
  actual_hours: number | null
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
  task_assignees?: {
    id: string
    user: {
      id: string
      name: string
      avatar_url: string | null
    }
  }[]
  task_labels?: {
    label: ProjectLabel
  }[]
  subtasks?: Task[]
}

export interface Milestone {
  id: string
  project_id: string
  name: string
  description: string | null
  target_date: string
  status: "upcoming" | "at_risk" | "completed" | "missed"
  progress?: number
  completedTasks?: number
  totalTasks?: number
  tasks?: Task[]
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  description: string | null
  status: ProjectStatus
  priority: ProjectPriority
  color: string
  icon: string
  start_date: string | null
  target_end_date: string | null
  actual_end_date: string | null
  budget: number | null
  owner_id: string | null
  department_id: string | null
  position: number
  created_at: string
  updated_at: string
  owner?: {
    id: string
    name: string
    avatar_url: string | null
  }
  department?: {
    id: string
    name: string
    color: string
    icon: string
  }
  project_members?: ProjectMember[]
  tasks?: Task[]
  milestones?: Milestone[]
  project_labels?: ProjectLabel[]
  progress?: number
  completedTasks?: number
  totalTasks?: number
}

interface ProjectsContextType {
  projects: Project[]
  currentProject: Project | null
  tasks: Task[]
  milestones: Milestone[]
  members: ProjectMember[]
  labels: ProjectLabel[]
  departments: Department[]
  loading: boolean
  error: string | null
  fetchProjects: (departmentId?: string) => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (data: Partial<Project>) => Promise<Project | null>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  fetchTasks: (projectId: string) => Promise<void>
  createTask: (projectId: string, data: Partial<Task>) => Promise<Task | null>
  updateTask: (projectId: string, taskId: string, data: Partial<Task>) => Promise<void>
  deleteTask: (projectId: string, taskId: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  fetchDepartments: () => Promise<void>
  createDepartment: (data: Partial<Department>) => Promise<Department | null>
  updateDepartment: (id: string, data: Partial<Department>) => Promise<void>
  deleteDepartment: (id: string) => Promise<void>
  reorderProjects: (projectIds: string[]) => Promise<void>
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined)

export function useProjects() {
  const context = useContext(ProjectsContext)
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider")
  }
  return context
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [labels, setLabels] = useState<ProjectLabel[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch("/api/departments")
      if (!response.ok) throw new Error("Failed to fetch departments")
      const data = await response.json()
      setDepartments(data.departments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch departments")
    }
  }, [])

  const createDepartment = useCallback(async (data: Partial<Department>) => {
    try {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to create department")
      const result = await response.json()
      setDepartments(prev => [...prev, result.department])
      return result.department
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create department")
      return null
    }
  }, [])

  const updateDepartment = useCallback(async (id: string, data: Partial<Department>) => {
    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update department")
      const result = await response.json()
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...result.department } : d))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update department")
    }
  }, [])

  const deleteDepartment = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/departments/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete department")
      setDepartments(prev => prev.filter(d => d.id !== id))
      // Refresh projects to update department references
      fetchProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete department")
    }
  }, [])

  const fetchProjects = useCallback(async (departmentId?: string) => {
    try {
      // Only show loading spinner on first load (no cached data)
      // This enables instant navigation when returning to the page
      setLoading(prev => projects.length === 0 ? true : prev)
      const url = departmentId ? `/api/projects?department_id=${departmentId}` : "/api/projects"
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch projects")
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects")
    } finally {
      setLoading(false)
    }
  }, [projects.length])

  const fetchProject = useCallback(async (id: string) => {
    try {
      // Only show loading on first load - if we have cached data, show it instantly
      // and refresh in the background
      const hasCachedProject = currentProject?.id === id
      if (!hasCachedProject) {
        setLoading(true)
      }
      const response = await fetch(`/api/projects/${id}`)

      if (!response.ok) throw new Error("Failed to fetch project")
      const data = await response.json()
      setCurrentProject(data.project)
      setTasks(data.project.tasks || [])
      setMilestones(data.project.milestones || [])
      setMembers(data.project.project_members || [])
      setLabels(data.project.project_labels || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch project")
    } finally {
      setLoading(false)
    }
  }, [currentProject?.id])

  const createProject = useCallback(async (data: Partial<Project>) => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create project")
      const result = await response.json()

      setProjects(prev => [result.project, ...prev])
      return result.project
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
      return null
    }
  }, [])

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update project")
      const result = await response.json()
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...result.project } : p))
      if (currentProject?.id === id) {
        setCurrentProject(prev => prev ? { ...prev, ...result.project } : null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project")
    }
  }, [currentProject?.id])

  const deleteProject = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete project")
      setProjects(prev => prev.filter(p => p.id !== id))
      if (currentProject?.id === id) {
        setCurrentProject(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project")
    }
  }, [currentProject?.id])

  const reorderProjects = useCallback(async (projectIds: string[]) => {
    // Optimistically update local state
    const previousProjects = [...projects]
    const reorderedProjects = projectIds
      .map((id, index) => {
        const project = projects.find(p => p.id === id)
        return project ? { ...project, position: index } : null
      })
      .filter((p): p is Project => p !== null)

    // Merge reordered projects with any that weren't in the reorder list
    const reorderedIds = new Set(projectIds)
    const otherProjects = projects.filter(p => !reorderedIds.has(p.id))
    setProjects([...reorderedProjects, ...otherProjects])

    try {
      const response = await fetch("/api/projects/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projects: projectIds.map((id, index) => ({ id, position: index })),
        }),
      })
      if (!response.ok) throw new Error("Failed to reorder projects")
    } catch (err) {
      // Rollback on failure
      setProjects(previousProjects)
      setError(err instanceof Error ? err.message : "Failed to reorder projects")
    }
  }, [projects])

  const fetchTasks = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`)
      if (!response.ok) throw new Error("Failed to fetch tasks")
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tasks")
    }
  }, [])

  const createTask = useCallback(async (projectId: string, data: Partial<Task>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to create task")
      const result = await response.json()
      setTasks(prev => [...prev, result.task])
      return result.task
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task")
      return null
    }
  }, [])

  const updateTask = useCallback(async (projectId: string, taskId: string, data: Partial<Task>) => {
    // Store previous state for rollback
    let previousTasks: Task[] = []
    setTasks(prev => {
      previousTasks = prev
      // Optimistically update UI immediately
      return prev.map(t => t.id === taskId ? { ...t, ...data } : t)
    })

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update task")
      const result = await response.json()
      // Update with server response for any computed fields
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...result.task } : t))
    } catch (err) {
      // Rollback on failure
      setTasks(previousTasks)
      setError(err instanceof Error ? err.message : "Failed to update task")
    }
  }, [])

  const deleteTask = useCallback(async (projectId: string, taskId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete task")
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task")
    }
  }, [])

  useEffect(() => {
    fetchProjects()
    fetchDepartments()
  }, [fetchProjects, fetchDepartments])

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        currentProject,
        tasks,
        milestones,
        members,
        labels,
        departments,
        loading,
        error,
        fetchProjects,
        fetchProject,
        createProject,
        updateProject,
        deleteProject,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask,
        setCurrentProject,
        fetchDepartments,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        reorderProjects,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  )
}


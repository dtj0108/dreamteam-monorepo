import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getAuthContext } from "@/lib/api-auth"
import Anthropic from "@anthropic-ai/sdk"

// POST /api/projects/[id]/generate-instructions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 })
    }

    // Fetch project with full task details
    const adminSupabase = createAdminClient()

    const { data: project, error } = await adminSupabase
      .from("projects")
      .select(`
        *,
        owner:profiles!projects_owner_id_fkey(id, name, email),
        project_members(
          id,
          role,
          user:profiles(id, name, email)
        ),
        tasks(
          id,
          title,
          description,
          status,
          priority,
          due_date,
          start_date,
          estimated_hours,
          parent_id,
          task_assignees(
            user:profiles(id, name)
          )
        ),
        milestones(
          id,
          name,
          description,
          target_date,
          status
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching project:", error)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Format project data for the AI prompt
    const projectContext = formatProjectForPrompt(project)

    // Call Anthropic API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are helping generate a CLAUDE.md-style instruction file for a software project. This file will be used with Claude Code to help execute the project tasks.

## Project Data:
${projectContext}

## Instructions:
Generate a clear, actionable markdown document that Claude Code can use to help execute this project. The document should:

1. **Project Overview**: A brief summary of what this project is about and its goals
2. **Current Status**: What's done, in progress, and remaining
3. **Key Tasks**: List the most important tasks to focus on, prioritized by:
   - Priority level (urgent > high > medium > low)
   - Due date (sooner first)
   - Dependencies (tasks that unblock others first)
4. **Suggested Execution Order**: A recommended sequence for tackling the tasks
5. **Notes**: Any important considerations, blockers, or context

Format the output as clean markdown that can be copied directly into Claude Code. Be concise but actionable. Focus on what needs to be done, not lengthy descriptions.

Output ONLY the markdown content, no additional commentary.`
        }
      ]
    })

    // Extract text content from response
    const textContent = message.content.find(block => block.type === "text")
    const markdown = textContent?.type === "text" ? textContent.text : ""

    return NextResponse.json({ markdown })
  } catch (error) {
    console.error("Error generating instructions:", error)
    return NextResponse.json({ error: "Failed to generate instructions" }, { status: 500 })
  }
}

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  start_date: string | null
  estimated_hours: number | null
  parent_id: string | null
  task_assignees?: { user: { id: string; name: string } | null }[]
}

interface Project {
  name: string
  description: string | null
  status: string
  priority: string
  start_date: string | null
  target_end_date: string | null
  owner?: { id: string; name: string; email: string } | null
  project_members?: { id: string; role: string; user: { id: string; name: string; email: string } | null }[]
  tasks?: Task[]
  milestones?: { id: string; name: string; description: string | null; target_date: string | null; status: string }[]
}

function formatProjectForPrompt(project: Project): string {
  const lines: string[] = []

  // Project info
  lines.push(`### Project: ${project.name}`)
  if (project.description) {
    lines.push(`**Description:** ${project.description}`)
  }
  lines.push(`**Status:** ${project.status}`)
  lines.push(`**Priority:** ${project.priority}`)
  if (project.start_date) {
    lines.push(`**Start Date:** ${project.start_date}`)
  }
  if (project.target_end_date) {
    lines.push(`**Target End Date:** ${project.target_end_date}`)
  }

  // Owner
  if (project.owner) {
    lines.push(`**Owner:** ${project.owner.name}`)
  }

  // Team members
  if (project.project_members && project.project_members.length > 0) {
    lines.push(`\n**Team Members:**`)
    for (const member of project.project_members) {
      if (member.user) {
        lines.push(`- ${member.user.name} (${member.role})`)
      }
    }
  }

  // Milestones
  if (project.milestones && project.milestones.length > 0) {
    lines.push(`\n**Milestones:**`)
    for (const milestone of project.milestones) {
      const date = milestone.target_date ? ` - Due: ${milestone.target_date}` : ""
      lines.push(`- ${milestone.name} [${milestone.status}]${date}`)
      if (milestone.description) {
        lines.push(`  ${milestone.description}`)
      }
    }
  }

  // Tasks
  if (project.tasks && project.tasks.length > 0) {
    lines.push(`\n**Tasks:**`)

    // Group by status
    const tasksByStatus: Record<string, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: []
    }

    for (const task of project.tasks) {
      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task)
      }
    }

    for (const [status, tasks] of Object.entries(tasksByStatus)) {
      if (tasks.length > 0) {
        lines.push(`\n#### ${formatStatus(status)} (${tasks.length})`)
        for (const task of tasks) {
          const priority = task.priority !== "medium" ? ` [${task.priority.toUpperCase()}]` : ""
          const dueDate = task.due_date ? ` - Due: ${task.due_date}` : ""
          const assignees = task.task_assignees?.map(a => a.user?.name).filter(Boolean).join(", ")
          const assigneeStr = assignees ? ` (Assigned: ${assignees})` : ""

          lines.push(`- ${task.title}${priority}${dueDate}${assigneeStr}`)
          if (task.description) {
            lines.push(`  Description: ${task.description}`)
          }
          if (task.estimated_hours) {
            lines.push(`  Estimated: ${task.estimated_hours}h`)
          }
        }
      }
    }
  }

  return lines.join("\n")
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    review: "In Review",
    done: "Done"
  }
  return statusMap[status] || status
}

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { checkRateLimit, getRateLimitHeaders, rateLimitPresets } from "@dreamteam/auth"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * GET /api/cron/check-overdue-tasks
 *
 * Checks for tasks that have become overdue and fires webhooks.
 * Should be called by a cron job (e.g., every hour or daily).
 *
 * To prevent abuse, this endpoint can be protected with a secret header.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - use IP address as identifier
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    
    const rateLimitResult = checkRateLimit(clientIp, rateLimitPresets.cron)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Optional: Verify cron secret to prevent abuse
    const cronSecret = request.headers.get("x-cron-secret")
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // Find tasks that:
    // 1. Have a due_date in the past
    // 2. Are not completed (status != 'done')
    const { data: overdueTasks, error } = await supabase
      .from("tasks")
      .select(`
        id, title, description, status, priority, due_date,
        assignee_id, project_id, workspace_id, created_at
      `)
      .lt("due_date", now)
      .neq("status", "done")

    if (error) {
      console.error("Error fetching overdue tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      return NextResponse.json({ message: "No overdue tasks found", count: 0 })
    }

    // Group tasks by workspace for webhook firing
    const tasksByWorkspace: Record<string, typeof overdueTasks> = {}
    for (const task of overdueTasks) {
      if (task.workspace_id) {
        if (!tasksByWorkspace[task.workspace_id]) {
          tasksByWorkspace[task.workspace_id] = []
        }
        tasksByWorkspace[task.workspace_id].push(task)
      }
    }

    // Fire webhooks and mark tasks as notified
    const taskIds: string[] = []
    for (const [workspaceId, tasks] of Object.entries(tasksByWorkspace)) {
      for (const task of tasks) {
        await fireWebhooks("task.overdue", {
          id: task.id,
          name: task.title,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          assignee_id: task.assignee_id,
          project_id: task.project_id,
          workspace_id: task.workspace_id,
        }, workspaceId)
        taskIds.push(task.id)
      }
    }

    return NextResponse.json({
      message: "Overdue tasks processed",
      count: taskIds.length,
    })
  } catch (error) {
    console.error("Error in check-overdue-tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

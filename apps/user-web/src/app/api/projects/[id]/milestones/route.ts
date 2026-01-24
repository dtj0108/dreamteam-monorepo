import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@dreamteam/database/server"

// GET /api/projects/[id]/milestones - List all milestones for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    const { data: milestones, error } = await adminSupabase
      .from("milestones")
      .select(`
        *,
        milestone_tasks(
          task:tasks(id, title, status)
        )
      `)
      .eq("project_id", projectId)
      .order("target_date", { ascending: true })

    if (error) {
      console.error("Error fetching milestones:", error)
      return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 })
    }

    // Calculate completion status for each milestone
    const milestonesWithProgress = milestones?.map((milestone: { 
      milestone_tasks?: { task: { status: string } | null }[] 
      [key: string]: unknown 
    }) => {
      const tasks = milestone.milestone_tasks?.map((mt: { task: { status: string } | null }) => mt.task) || []
      const completedTasks = tasks.filter((t: { status: string } | null) => t?.status === "done").length
      const totalTasks = tasks.length
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      return {
        ...milestone,
        progress,
        completedTasks,
        totalTasks,
        tasks,
      }
    })

    return NextResponse.json({ milestones: milestonesWithProgress })
  } catch (error) {
    console.error("Error in GET /api/projects/[id]/milestones:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/projects/[id]/milestones - Create a new milestone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, target_date, tasks } = body

    if (!name || !target_date) {
      return NextResponse.json({ error: "Name and target date are required" }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    // Create the milestone
    const { data: milestone, error: milestoneError } = await adminSupabase
      .from("milestones")
      .insert({
        project_id: projectId,
        name,
        description,
        target_date,
        status: "upcoming",
      })
      .select()
      .single()

    if (milestoneError) {
      console.error("Error creating milestone:", milestoneError)
      return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 })
    }

    // Link tasks if provided
    if (tasks && tasks.length > 0) {
      const taskLinks = tasks.map((taskId: string) => ({
        milestone_id: milestone.id,
        task_id: taskId,
      }))
      await adminSupabase.from("milestone_tasks").insert(taskLinks)
    }

    // Log activity
    await adminSupabase
      .from("project_activity")
      .insert({
        project_id: projectId,
        user_id: user.id,
        action: "created",
        entity_type: "milestone",
        entity_id: milestone.id,
        metadata: { name },
      })

    return NextResponse.json({ milestone }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/projects/[id]/milestones:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


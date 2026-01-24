import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@dreamteam/database/server"

// GET /api/projects/[id]/tasks/[taskId]/comments - List comments on a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { taskId } = await params
    const supabase = await createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    const { data: comments, error } = await adminSupabase
      .from("task_comments")
      .select(`
        id,
        content,
        parent_id,
        created_at,
        updated_at,
        user:profiles(id, name, avatar_url)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching comments:", error)
      return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
    }

    // Organize comments into threads
    type Comment = { id: string; parent_id: string | null; [key: string]: unknown }
    const topLevelComments = comments?.filter((c: Comment) => !c.parent_id) || []
    const replies = comments?.filter((c: Comment) => c.parent_id) || []

    const threaded = topLevelComments.map((comment: Comment) => ({
      ...comment,
      replies: replies.filter((r: Comment) => r.parent_id === comment.id),
    }))

    return NextResponse.json({ comments: threaded })
  } catch (error) {
    console.error("Error in GET /api/projects/[id]/tasks/[taskId]/comments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/projects/[id]/tasks/[taskId]/comments - Add a comment to a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params
    const supabase = await createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    const body = await request.json()
    const { content, parent_id } = body

    if (!content) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 })
    }

    const { data: comment, error } = await adminSupabase
      .from("task_comments")
      .insert({
        task_id: taskId,
        user_id: user.id,
        content,
        parent_id,
      })
      .select(`
        id,
        content,
        parent_id,
        created_at,
        user:profiles(id, name, avatar_url)
      `)
      .single()

    if (error) {
      console.error("Error creating comment:", error)
      return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
    }

    // Log activity
    await adminSupabase
      .from("project_activity")
      .insert({
        project_id: projectId,
        user_id: user.id,
        action: "commented",
        entity_type: "task",
        entity_id: taskId,
      })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/projects/[id]/tasks/[taskId]/comments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


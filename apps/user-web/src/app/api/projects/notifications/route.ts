import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@dreamteam/database/server"

// GET /api/projects/notifications - Get user's project notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("project_notifications")
      .select(`
        id,
        type,
        title,
        message,
        read_at,
        created_at,
        project:projects(id, name, color),
        task:tasks(id, title),
        milestone:milestones(id, name),
        actor:profiles!project_notifications_actor_id_fkey(id, full_name, avatar_url)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.is("read_at", null)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error("Error fetching notifications:", error)
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("project_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)

    return NextResponse.json({ 
      notifications,
      unreadCount: unreadCount || 0,
    })
  } catch (error) {
    console.error("Error in GET /api/projects/notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/projects/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      // Mark all unread notifications as read
      const { error } = await supabase
        .from("project_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null)

      if (error) {
        console.error("Error marking all as read:", error)
        return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 })
      }
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from("project_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("id", notificationIds)

      if (error) {
        console.error("Error marking as read:", error)
        return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in PATCH /api/projects/notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


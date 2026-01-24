import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@dreamteam/database/server"

// GET /api/projects/[id]/members - List all members of a project
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
    
    const { data: members, error } = await adminSupabase
      .from("project_members")
      .select(`
        id,
        role,
        hours_per_week,
        created_at,
        user:profiles(id, name, avatar_url, email)
      `)
      .eq("project_id", projectId)

    if (error) {
      console.error("Error fetching members:", error)
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
    }

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Error in GET /api/projects/[id]/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/projects/[id]/members - Add a member to the project
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
    const { user_id, role, hours_per_week } = body

    if (!user_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    // Check if user is already a member
    const { data: existing } = await adminSupabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 })
    }

    const { data: member, error } = await adminSupabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id,
        role: role || "member",
        hours_per_week: hours_per_week || 40,
      })
      .select(`
        id,
        role,
        hours_per_week,
        user:profiles(id, name, avatar_url, email)
      `)
      .single()

    if (error) {
      console.error("Error adding member:", error)
      return NextResponse.json({ error: "Failed to add member" }, { status: 500 })
    }

    // Log activity
    await adminSupabase
      .from("project_activity")
      .insert({
        project_id: projectId,
        user_id: user.id,
        action: "added_member",
        entity_type: "project",
        entity_id: projectId,
        metadata: { added_user_id: user_id },
      })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/projects/[id]/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/members - Remove a member from the project
export async function DELETE(
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

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId")
    const userId = searchParams.get("userId")

    if (!memberId && !userId) {
      return NextResponse.json({ error: "Member ID or User ID is required" }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    let query = adminSupabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)

    if (memberId) {
      query = query.eq("id", memberId)
    } else if (userId) {
      query = query.eq("user_id", userId)
    }

    const { error } = await query

    if (error) {
      console.error("Error removing member:", error)
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/projects/[id]/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


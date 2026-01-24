import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"

/**
 * GET /api/make/projects
 *
 * List all projects in the workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")
    const status = searchParams.get("status")

    let query = supabase
      .from("projects")
      .select(`
        id, name, description, status, priority, color, icon,
        start_date, target_end_date, actual_end_date, budget,
        owner_id, created_at, updated_at,
        owner:profiles!projects_owner_id_fkey(id, name)
      `)
      .eq("workspace_id", auth.workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching projects:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in projects GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/make/projects
 *
 * Create a new project.
 * Fires project.created webhook on success.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      status,
      priority,
      color,
      icon,
      start_date,
      target_end_date,
      budget,
      owner_id,
    } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify owner_id if provided
    if (owner_id) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", auth.workspaceId)
        .eq("profile_id", owner_id)
        .single()

      if (!member) {
        return NextResponse.json({ error: "Owner must be a workspace member" }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        workspace_id: auth.workspaceId,
        name,
        description,
        status: status || "active",
        priority: priority || "medium",
        color: color || "#6366f1",
        icon: icon || "folder",
        start_date,
        target_end_date,
        budget,
        owner_id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating project:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add owner as project member if specified
    if (owner_id) {
      await supabase.from("project_members").insert({
        project_id: data.id,
        user_id: owner_id,
        role: "owner",
      })
    }

    // Fire webhook
    await fireWebhooks("project.created", data, auth.workspaceId)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in projects POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { name, color } = body

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "Tag name cannot be empty" }, { status: 400 })
      }
      if (name.length > 50) {
        return NextResponse.json({ error: "Tag name must be 50 characters or less" }, { status: 400 })
      }
    }

    const supabase = createAdminClient()

    // Build update object with only provided fields
    const updateData: { name?: string; color?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updateData.name = name.trim()
    if (color !== undefined) updateData.color = color

    const { data, error } = await supabase
      .from("lead_tags")
      .update(updateData)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 })
      }
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 })
      }
      console.error("Error updating lead tag:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead tags PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const { id } = await context.params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("lead_tags")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId)

    if (error) {
      console.error("Error deleting lead tag:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in lead tags DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

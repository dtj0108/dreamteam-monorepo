import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("sms_templates")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single()

    if (error) {
      console.error("Error fetching SMS template:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "SMS template not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in SMS template GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, body: smsBody, description, category, is_active } = body

    // Validate name if provided
    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updateData.name = name.trim()
    if (smsBody !== undefined) updateData.body = smsBody
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabase
      .from("sms_templates")
      .update(updateData)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single()

    if (error) {
      console.error("Error updating SMS template:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in SMS template PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("sms_templates")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId)

    if (error) {
      console.error("Error deleting SMS template:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in SMS template DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

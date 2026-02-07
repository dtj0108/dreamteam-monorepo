import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get("entity_type") || "lead"

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("custom_fields")
      .select("*")
      .eq("user_id", session.id)
      .eq("workspace_id", workspaceId)
      .eq("entity_type", entityType)
      .order("position", { ascending: true })

    if (error) {
      console.error("Error fetching custom fields:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[custom-fields/list] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const body = await request.json()
    const { name, field_type, entity_type = "lead", options = [], is_required = false } = body

    if (!name || !field_type) {
      return NextResponse.json({ error: "Name and field_type are required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the highest position
    const { data: existing } = await supabase
      .from("custom_fields")
      .select("position")
      .eq("user_id", session.id)
      .eq("workspace_id", workspaceId)
      .eq("entity_type", entity_type)
      .order("position", { ascending: false })
      .limit(1)

    const position = existing && existing.length > 0 ? existing[0].position + 1 : 0

    const { data, error } = await supabase
      .from("custom_fields")
      .insert({
        user_id: session.id,
        workspace_id: workspaceId,
        name,
        field_type,
        entity_type,
        options,
        is_required,
        position,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating custom field:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[custom-fields/create] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}

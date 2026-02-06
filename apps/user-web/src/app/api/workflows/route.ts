import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", session.id)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching workflows:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[workflows/list] Error [${errorId}]:`, error)
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
    const { name, description, trigger_type, trigger_config, is_active, actions } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!trigger_type) {
      return NextResponse.json({ error: "Trigger type is required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("workflows")
      .insert({
        user_id: session.id,
        workspace_id: workspaceId,
        name,
        description,
        trigger_type,
        trigger_config: trigger_config || {},
        is_active: is_active || false,
        actions: actions || [],
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating workflow:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[workflows/create] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}

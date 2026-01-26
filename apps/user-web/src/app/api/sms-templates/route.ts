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

    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const activeOnly = searchParams.get("active_only") === "true"

    let query = supabase
      .from("sms_templates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (category) {
      query = query.eq("category", category)
    }

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching SMS templates:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in SMS templates GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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
    const { name, body: smsBody, description, category, is_active } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("sms_templates")
      .insert({
        workspace_id: workspaceId,
        user_id: session.id,
        name,
        body: smsBody || "",
        description,
        category,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating SMS template:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in SMS templates POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

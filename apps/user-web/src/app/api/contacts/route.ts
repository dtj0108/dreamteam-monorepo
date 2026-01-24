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
    const leadId = searchParams.get("lead_id")
    const search = searchParams.get("search")

    let query = supabase
      .from("contacts")
      .select(`
        *,
        lead:leads!inner(id, name, user_id, workspace_id)
      `)
      .eq("lead.user_id", session.id)
      .eq("lead.workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (leadId) {
      query = query.eq("lead_id", leadId)
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching contacts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in contacts GET:", error)
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
    const { lead_id, first_name, last_name, email, phone, title, notes } = body

    if (!lead_id || !first_name) {
      return NextResponse.json(
        { error: "Lead ID and first name are required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify the lead belongs to the user and workspace
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", lead_id)
      .eq("user_id", session.id)
      .eq("workspace_id", workspaceId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        lead_id,
        first_name,
        last_name,
        email,
        phone,
        title,
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating contact:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in contacts POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


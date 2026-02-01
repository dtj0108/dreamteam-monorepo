import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId, validateWorkspaceAccess } from "@/lib/workspace-auth"
import { triggerLeadStatusChanged } from "@/lib/workflow-trigger-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check query param first (mobile), then fallback to cookie (web)
    const queryWorkspaceId = request.nextUrl.searchParams.get('workspaceId')
    let workspaceId = queryWorkspaceId

    if (!workspaceId) {
      workspaceId = await getCurrentWorkspaceId(session.id)
    } else {
      // Validate user has access to the requested workspace
      const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
      if (!isValid) {
        return NextResponse.json({ error: "Workspace access denied" }, { status: 403 })
      }
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("leads")
      .select(`
        *,
        contacts(*),
        stage:lead_pipeline_stages(id, name, color, position, pipeline_id)
      `)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single()

    if (error) {
      console.error("Error fetching lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Fetch activities for all contacts in this lead
    let activities: unknown[] = []
    if (data.contacts && data.contacts.length > 0) {
      const contactIds = data.contacts.map((c: { id: string }) => c.id)
      const { data: activitiesData } = await supabase
        .from("activities")
        .select(`
          *,
          contact:contacts(id, first_name, last_name)
        `)
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false })

      activities = activitiesData || []
    }

    // Fetch tasks for this lead
    const { data: tasks } = await supabase
      .from("lead_tasks")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })

    // Fetch opportunities for this lead
    const { data: opportunities } = await supabase
      .from("lead_opportunities")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })

    // Fetch tags assigned to this lead
    const { data: tagAssignments } = await supabase
      .from("lead_tag_assignments")
      .select(`
        tag:lead_tags(id, name, color)
      `)
      .eq("lead_id", id)

    const tags = tagAssignments
      ?.map((assignment: { tag: { id: string; name: string; color: string } | null }) => assignment.tag)
      .filter(Boolean) || []

    return NextResponse.json({
      ...data,
      activities,
      tasks: tasks || [],
      opportunities: opportunities || [],
      tags,
    })
  } catch (error) {
    console.error("Error in lead GET:", error)
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
    const { name, website, industry, status, notes, address, city, state, country, postal_code } = body

    const supabase = createAdminClient()

    // Fetch current lead to detect status changes
    const { data: currentLead } = await supabase
      .from("leads")
      .select("status")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single()

    const previousStatus = currentLead?.status

    const { data, error } = await supabase
      .from("leads")
      .update({
        name,
        website,
        industry,
        status,
        notes,
        address,
        city,
        state,
        country,
        postal_code,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single()

    if (error) {
      console.error("Error updating lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger lead_status_changed workflows if status changed (non-blocking)
    if (status && previousStatus && status !== previousStatus) {
      triggerLeadStatusChanged(data, previousStatus).catch((err) => {
        console.error("Error triggering lead_status_changed workflows:", err)
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in lead PATCH:", error)
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
      .from("leads")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId)

    if (error) {
      console.error("Error deleting lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in lead DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

interface RouteContext {
  params: Promise<{ id: string }>
}

interface LeadTag {
  id: string
  name: string
  color: string
}

interface TagAssignment {
  tag_id?: string
  created_at?: string
  tag: LeadTag | null
}

// GET: Fetch all tags assigned to a lead
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: leadId } = await context.params
    const supabase = createAdminClient()

    // Verify lead ownership
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("user_id", session.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Get all tags assigned to this lead
    const { data, error } = await supabase
      .from("lead_tag_assignments")
      .select(`
        tag_id,
        created_at,
        tag:lead_tags(id, name, color)
      `)
      .eq("lead_id", leadId)

    if (error) {
      console.error("Error fetching lead tags:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten the response to just return tags
    const tags = data?.map((assignment: TagAssignment) => assignment.tag).filter(Boolean) || []

    return NextResponse.json(tags)
  } catch (error) {
    console.error("Error in lead tags GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST: Assign a tag to a lead
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: leadId } = await context.params
    const body = await request.json()
    const { tag_id } = body

    if (!tag_id) {
      return NextResponse.json({ error: "tag_id is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify lead ownership
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("user_id", session.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Assign the tag
    const { data, error } = await supabase
      .from("lead_tag_assignments")
      .insert({
        lead_id: leadId,
        tag_id: tag_id,
      })
      .select(`
        tag_id,
        tag:lead_tags(id, name, color)
      `)
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Tag is already assigned to this lead" }, { status: 409 })
      }
      if (error.code === "23503") {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 })
      }
      console.error("Error assigning tag to lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data?.tag, { status: 201 })
  } catch (error) {
    console.error("Error in lead tags POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE: Remove a tag from a lead
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: leadId } = await context.params
    const searchParams = request.nextUrl.searchParams
    const tagId = searchParams.get("tag_id")

    if (!tagId) {
      return NextResponse.json({ error: "tag_id query parameter is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify lead ownership
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("user_id", session.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Remove the tag assignment
    const { error } = await supabase
      .from("lead_tag_assignments")
      .delete()
      .eq("lead_id", leadId)
      .eq("tag_id", tagId)

    if (error) {
      console.error("Error removing tag from lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in lead tags DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT: Replace all tags on a lead (bulk update)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: leadId } = await context.params
    const body = await request.json()
    const { tag_ids } = body

    if (!Array.isArray(tag_ids)) {
      return NextResponse.json({ error: "tag_ids must be an array" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify lead ownership
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("user_id", session.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Delete all existing assignments
    const { error: deleteError } = await supabase
      .from("lead_tag_assignments")
      .delete()
      .eq("lead_id", leadId)

    if (deleteError) {
      console.error("Error removing existing tags:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Insert new assignments (if any)
    if (tag_ids.length > 0) {
      const assignments = tag_ids.map((tagId: string) => ({
        lead_id: leadId,
        tag_id: tagId,
      }))

      const { error: insertError } = await supabase
        .from("lead_tag_assignments")
        .insert(assignments)

      if (insertError) {
        console.error("Error assigning tags:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // Fetch and return updated tags
    const { data, error } = await supabase
      .from("lead_tag_assignments")
      .select(`
        tag:lead_tags(id, name, color)
      `)
      .eq("lead_id", leadId)

    if (error) {
      console.error("Error fetching updated tags:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tags = data?.map((assignment: TagAssignment) => assignment.tag).filter(Boolean) || []

    return NextResponse.json(tags)
  } catch (error) {
    console.error("Error in lead tags PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

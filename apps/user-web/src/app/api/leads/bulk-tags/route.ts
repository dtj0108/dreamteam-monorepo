import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

interface BulkTagsRequest {
  lead_ids: string[]
  action: "add" | "remove" | "replace"
  tag_ids: string[]
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const body: BulkTagsRequest = await request.json()

    if (!body.lead_ids || !Array.isArray(body.lead_ids) || body.lead_ids.length === 0) {
      return NextResponse.json(
        { error: "At least one lead ID is required" },
        { status: 400 }
      )
    }

    if (body.lead_ids.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 leads can be updated at once" },
        { status: 400 }
      )
    }

    if (!["add", "remove", "replace"].includes(body.action)) {
      return NextResponse.json(
        { error: "Action must be 'add', 'remove', or 'replace'" },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.tag_ids)) {
      return NextResponse.json(
        { error: "tag_ids must be an array" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify all leads belong to this workspace
    const { data: validLeads, error: verifyError } = await supabase
      .from("leads")
      .select("id")
      .in("id", body.lead_ids)
      .eq("workspace_id", workspaceId)

    if (verifyError) {
      console.error("Error verifying leads:", verifyError)
      return NextResponse.json(
        { error: "Failed to verify leads" },
        { status: 500 }
      )
    }

    const validLeadIds = validLeads?.map((l: { id: string }) => l.id) || []
    if (validLeadIds.length === 0) {
      return NextResponse.json(
        { error: "No valid leads found" },
        { status: 404 }
      )
    }

    let affectedCount = 0

    if (body.action === "add" && body.tag_ids.length > 0) {
      // Add tags to leads (ignore duplicates)
      const assignments = validLeadIds.flatMap((leadId: string) =>
        body.tag_ids.map((tagId: string) => ({
          lead_id: leadId,
          tag_id: tagId,
        }))
      )

      const { error } = await supabase
        .from("lead_tag_assignments")
        .upsert(assignments, { onConflict: "lead_id,tag_id", ignoreDuplicates: true })

      if (error) {
        console.error("Error adding tags:", error)
        return NextResponse.json(
          { error: "Failed to add tags" },
          { status: 500 }
        )
      }
      affectedCount = validLeadIds.length
    } else if (body.action === "remove" && body.tag_ids.length > 0) {
      // Remove specific tags from leads
      const { error, count } = await supabase
        .from("lead_tag_assignments")
        .delete()
        .in("lead_id", validLeadIds)
        .in("tag_id", body.tag_ids)

      if (error) {
        console.error("Error removing tags:", error)
        return NextResponse.json(
          { error: "Failed to remove tags" },
          { status: 500 }
        )
      }
      affectedCount = count || 0
    } else if (body.action === "replace") {
      // Replace all tags on leads with the new set
      // First delete all existing assignments
      const { error: deleteError } = await supabase
        .from("lead_tag_assignments")
        .delete()
        .in("lead_id", validLeadIds)

      if (deleteError) {
        console.error("Error removing existing tags:", deleteError)
        return NextResponse.json(
          { error: "Failed to replace tags" },
          { status: 500 }
        )
      }

      // Then insert new assignments if any
      if (body.tag_ids.length > 0) {
        const assignments = validLeadIds.flatMap((leadId: string) =>
          body.tag_ids.map((tagId: string) => ({
            lead_id: leadId,
            tag_id: tagId,
          }))
        )

        const { error: insertError } = await supabase
          .from("lead_tag_assignments")
          .insert(assignments)

        if (insertError) {
          console.error("Error inserting new tags:", insertError)
          return NextResponse.json(
            { error: "Failed to replace tags" },
            { status: 500 }
          )
        }
      }
      affectedCount = validLeadIds.length
    }

    // Update the updated_at timestamp on all leads
    await supabase
      .from("leads")
      .update({ updated_at: new Date().toISOString() })
      .in("id", validLeadIds)

    return NextResponse.json({
      success: true,
      affected: affectedCount,
    })
  } catch (error) {
    console.error("Bulk tags error:", error)
    return NextResponse.json(
      { error: "Failed to update tags" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// DELETE /api/integrations/crm/disconnect/[id] - Disconnect a CRM integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // First, get the integration to check workspace membership
  const { data: integration, error: fetchError } = await supabase
    .from("crm_integrations")
    .select("id, workspace_id")
    .eq("id", id)
    .single()

  if (fetchError || !integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 })
  }

  // Verify user is an admin/owner of the workspace
  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", integration.workspace_id)
    .eq("profile_id", user.id)
    .single()

  if (memberError || !membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can disconnect integrations" }, { status: 403 })
  }

  // Delete the integration (RLS will also enforce access)
  const { error } = await supabase
    .from("crm_integrations")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

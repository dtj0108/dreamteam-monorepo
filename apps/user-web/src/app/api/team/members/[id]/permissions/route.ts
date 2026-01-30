import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import type { PermissionKey } from "@/types/team-settings"

// All valid permission keys
const VALID_PERMISSION_KEYS: PermissionKey[] = [
  // Member Management
  "can_invite", "can_remove_members", "can_change_roles", "can_manage_product_access",
  // Workspace Settings
  "can_edit_workspace", "can_manage_integrations", "can_manage_billing",
  // Content & Data
  "can_delete_content", "can_export_data", "can_import_data",
  // Finance
  "can_view_transactions", "can_create_transactions", "can_edit_transactions",
  "can_delete_transactions", "can_manage_budgets", "can_manage_accounts",
  // CRM/Sales
  "can_view_leads", "can_create_leads", "can_edit_leads",
  "can_delete_leads", "can_assign_leads", "can_manage_deals",
  // Content/Messaging
  "can_create_channels", "can_delete_channels", "can_pin_messages",
  "can_delete_messages", "can_manage_documents",
  // Analytics
  "can_view_analytics", "can_create_reports", "can_view_all_data",
  // Projects
  "can_view_projects", "can_create_projects", "can_edit_projects",
  "can_delete_projects", "can_manage_tasks", "can_assign_tasks",
  // Knowledge
  "can_view_knowledge", "can_create_pages", "can_edit_pages",
  "can_delete_pages", "can_manage_categories",
  // Agents
  "can_view_agents", "can_create_agents", "can_edit_agents",
  "can_delete_agents", "can_run_agents",
]

// GET /api/team/members/[id]/permissions - Get merged permissions for a specific member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id: memberId } = await params

    // Get the member and their workspace/role
    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("id, workspace_id, role, profile_id")
      .eq("id", memberId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Verify requesting user is a member of this workspace
    const { data: requesterMembership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", member.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (!requesterMembership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
    }

    // Get role-based default permissions
    const { data: rolePermissions } = await supabase
      .from("workspace_permissions")
      .select("permission_key, is_enabled")
      .eq("workspace_id", member.workspace_id)
      .eq("role", member.role)

    // Get per-user permission overrides
    const { data: userOverrides } = await supabase
      .from("member_permission_overrides")
      .select("permission_key, is_enabled")
      .eq("member_id", memberId)

    // Build role defaults map
    const roleDefaults: Record<string, boolean> = {}
    rolePermissions?.forEach((p: { permission_key: string; is_enabled: boolean }) => {
      roleDefaults[p.permission_key] = p.is_enabled
    })

    // Build overrides map
    const overrides: Record<string, boolean> = {}
    userOverrides?.forEach((o: { permission_key: string; is_enabled: boolean }) => {
      overrides[o.permission_key] = o.is_enabled
    })

    // Merge: override takes precedence, otherwise use role default
    const permissions = VALID_PERMISSION_KEYS.map((key) => {
      const hasOverride = key in overrides
      const isEnabled = hasOverride ? overrides[key] : (roleDefaults[key] ?? false)
      const roleDefault = roleDefaults[key] ?? false

      return {
        permission_key: key,
        is_enabled: isEnabled,
        is_override: hasOverride,
        role_default: roleDefault,
      }
    })

    return NextResponse.json({
      member_id: memberId,
      role: member.role,
      permissions,
    })
  } catch (error) {
    console.error("Error in GET /api/team/members/[id]/permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/team/members/[id]/permissions - Update a specific member's permission
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id: memberId } = await params
    const body = await request.json()
    const { permission_key, is_enabled } = body

    if (!permission_key || is_enabled === undefined) {
      return NextResponse.json(
        { error: "permission_key and is_enabled are required" },
        { status: 400 }
      )
    }

    if (!VALID_PERMISSION_KEYS.includes(permission_key)) {
      return NextResponse.json({ error: "Invalid permission key" }, { status: 400 })
    }

    // Get the member and their workspace
    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("id, workspace_id, role")
      .eq("id", memberId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Can't modify owner's permissions
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot modify owner's permissions" },
        { status: 403 }
      )
    }

    // Verify requesting user is owner or admin of this workspace
    const { data: requesterMembership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", member.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (!requesterMembership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
    }

    const isOwnerOrAdmin = requesterMembership.role === "owner" || requesterMembership.role === "admin"
    if (!isOwnerOrAdmin) {
      return NextResponse.json(
        { error: "Only owners and admins can modify permissions" },
        { status: 403 }
      )
    }

    // Upsert the permission override
    const { data: updated, error: upsertError } = await supabase
      .from("member_permission_overrides")
      .upsert(
        {
          workspace_id: member.workspace_id,
          member_id: memberId,
          permission_key,
          is_enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "member_id,permission_key" }
      )
      .select()
      .single()

    if (upsertError) {
      console.error("Error upserting permission override:", upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      permission_key,
      is_enabled,
      is_override: true,
    })
  } catch (error) {
    console.error("Error in PUT /api/team/members/[id]/permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/members/[id]/permissions - Remove a permission override (revert to role default)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id: memberId } = await params
    const { searchParams } = new URL(request.url)
    const permission_key = searchParams.get("permission_key")

    if (!permission_key) {
      return NextResponse.json({ error: "permission_key is required" }, { status: 400 })
    }

    // Get the member
    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("id, workspace_id, role")
      .eq("id", memberId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Verify requesting user is owner or admin
    const { data: requesterMembership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", member.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (!requesterMembership) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
    }

    const isOwnerOrAdmin = requesterMembership.role === "owner" || requesterMembership.role === "admin"
    if (!isOwnerOrAdmin) {
      return NextResponse.json(
        { error: "Only owners and admins can modify permissions" },
        { status: 403 }
      )
    }

    // Delete the override
    const { error: deleteError } = await supabase
      .from("member_permission_overrides")
      .delete()
      .eq("member_id", memberId)
      .eq("permission_key", permission_key)

    if (deleteError) {
      console.error("Error deleting permission override:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, reverted_to_role_default: true })
  } catch (error) {
    console.error("Error in DELETE /api/team/members/[id]/permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

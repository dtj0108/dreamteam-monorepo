import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import type { PermissionKey } from "@/types/team-settings"

const VALID_PERMISSION_KEYS: PermissionKey[] = [
  // Member Management
  "can_invite",
  "can_remove_members",
  "can_change_roles",
  "can_manage_product_access",
  // Workspace Settings
  "can_edit_workspace",
  "can_manage_integrations",
  // Content & Data
  "can_delete_content",
  "can_export_data",
  "can_import_data",
  // Finance
  "can_view_transactions",
  "can_create_transactions",
  "can_edit_transactions",
  "can_delete_transactions",
  "can_manage_budgets",
  "can_manage_accounts",
  // CRM/Sales
  "can_view_leads",
  "can_create_leads",
  "can_edit_leads",
  "can_delete_leads",
  "can_assign_leads",
  "can_manage_deals",
  // Content/Messaging
  "can_create_channels",
  "can_delete_channels",
  "can_pin_messages",
  "can_delete_messages",
  "can_manage_documents",
  // Analytics
  "can_view_analytics",
  "can_create_reports",
  "can_view_all_data",
  // Projects
  "can_view_projects",
  "can_create_projects",
  "can_edit_projects",
  "can_delete_projects",
  "can_manage_tasks",
  "can_assign_tasks",
  // Knowledge
  "can_view_knowledge",
  "can_create_pages",
  "can_edit_pages",
  "can_delete_pages",
  "can_manage_categories",
  // Agents
  "can_view_agents",
  "can_create_agents",
  "can_edit_agents",
  "can_delete_agents",
  "can_run_agents",
]

// Default permissions enabled for admin role
const DEFAULT_ADMIN_PERMISSIONS: PermissionKey[] = [
  // Member Management
  "can_invite",
  "can_remove_members",
  "can_manage_product_access",
  // Workspace
  "can_delete_content",
  "can_export_data",
  // Finance - all enabled
  "can_view_transactions",
  "can_create_transactions",
  "can_edit_transactions",
  "can_delete_transactions",
  "can_manage_budgets",
  "can_manage_accounts",
  // CRM - all enabled
  "can_view_leads",
  "can_create_leads",
  "can_edit_leads",
  "can_delete_leads",
  "can_assign_leads",
  "can_manage_deals",
  // Content - some enabled
  "can_create_channels",
  "can_pin_messages",
  // Analytics - some enabled
  "can_view_analytics",
  "can_create_reports",
  // Projects - all enabled for admins
  "can_view_projects",
  "can_create_projects",
  "can_edit_projects",
  "can_delete_projects",
  "can_manage_tasks",
  "can_assign_tasks",
  // Knowledge - all enabled for admins
  "can_view_knowledge",
  "can_create_pages",
  "can_edit_pages",
  "can_delete_pages",
  "can_manage_categories",
  // Agents - all enabled for admins
  "can_view_agents",
  "can_create_agents",
  "can_edit_agents",
  "can_delete_agents",
  "can_run_agents",
]

// Default permissions enabled for member role
const DEFAULT_MEMBER_PERMISSIONS: PermissionKey[] = [
  // Finance - view only
  "can_view_transactions",
  // CRM - view and create
  "can_view_leads",
  "can_create_leads",
  // Analytics - view only
  "can_view_analytics",
  // Projects - view and basic access
  "can_view_projects",
  "can_manage_tasks",
  // Knowledge - view and create
  "can_view_knowledge",
  "can_create_pages",
  // Agents - view and run only
  "can_view_agents",
  "can_run_agents",
]

// GET /api/team/permissions - Get all workspace permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is a member
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Get existing permissions
    const { data: existingPermissions, error } = await supabase
      .from("workspace_permissions")
      .select("*")
      .eq("workspace_id", workspaceId)

    if (error) {
      console.error("Error fetching permissions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Build a set of existing permission keys by role for quick lookup
    const existingKeys = new Set(
      existingPermissions?.map((p: { role: string; permission_key: string }) => `${p.role}:${p.permission_key}`) || []
    )

    // Find missing permissions and create them with defaults
    const missingPermissions: {
      workspace_id: string
      role: "admin" | "member"
      permission_key: PermissionKey
      is_enabled: boolean
    }[] = []

    for (const role of ["admin", "member"] as const) {
      for (const key of VALID_PERMISSION_KEYS) {
        if (!existingKeys.has(`${role}:${key}`)) {
          const isEnabled =
            role === "admin"
              ? DEFAULT_ADMIN_PERMISSIONS.includes(key)
              : DEFAULT_MEMBER_PERMISSIONS.includes(key)
          missingPermissions.push({
            workspace_id: workspaceId,
            role,
            permission_key: key,
            is_enabled: isEnabled,
          })
        }
      }
    }

    // Insert any missing permissions
    if (missingPermissions.length > 0) {
      const { error: insertError } = await supabase
        .from("workspace_permissions")
        .insert(missingPermissions)

      if (insertError) {
        console.error("Error inserting missing permissions:", insertError)
        // Don't fail the request, just log the error
      }
    }

    // Fetch and return all permissions (existing + newly inserted)
    const { data: allPermissions, error: fetchError } = await supabase
      .from("workspace_permissions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("role")
      .order("permission_key")

    if (fetchError) {
      console.error("Error fetching all permissions:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json(allPermissions || [])
  } catch (error) {
    console.error("Error in GET /api/team/permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/team/permissions - Update permissions
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const body = await request.json()
    const { workspaceId, role, permission_key, is_enabled } = body

    if (!workspaceId || !role || !permission_key || is_enabled === undefined) {
      return NextResponse.json(
        { error: "workspaceId, role, permission_key, and is_enabled are required" },
        { status: 400 }
      )
    }

    if (!["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    if (!VALID_PERMISSION_KEYS.includes(permission_key)) {
      return NextResponse.json({ error: "Invalid permission key" }, { status: 400 })
    }

    // Verify user is workspace owner or admin
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    const isOwnerOrAdmin = membership.role === "owner" || membership.role === "admin"
    if (!isOwnerOrAdmin) {
      return NextResponse.json(
        { error: "Only owners and admins can modify permissions" },
        { status: 403 }
      )
    }

    // Upsert the permission
    const { data: updated, error } = await supabase
      .from("workspace_permissions")
      .upsert(
        {
          workspace_id: workspaceId,
          role,
          permission_key,
          is_enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,role,permission_key" }
      )
      .select()
      .single()

    if (error) {
      console.error("Error updating permission:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error in PUT /api/team/permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

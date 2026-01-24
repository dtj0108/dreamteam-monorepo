import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// PUT /api/team/members/[id] - Update member status or role
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
    const { status, statusText, displayName, role, allowedProducts } = body

    // Get the member record with their current role
    const { data: member, error: fetchError } = await supabase
      .from("workspace_members")
      .select("workspace_id, profile_id, role")
      .eq("id", memberId)
      .single()

    if (fetchError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Check permissions
    const { data: currentUserMembership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", member.workspace_id)
      .eq("profile_id", session.id)
      .single()

    const isSelf = member.profile_id === session.id
    const currentRole = currentUserMembership?.role
    const isOwner = currentRole === "owner"
    const isAdmin = currentRole === "admin" || isOwner

    // Users can update their own status, admins can update roles
    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { error: "Not authorized to update this member" },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {}

    // Self-editable fields
    if (status !== undefined) updateData.status = status
    if (statusText !== undefined) updateData.status_text = statusText
    if (displayName !== undefined) updateData.display_name = displayName

    // Role update permission checks
    if (role !== undefined) {
      // Can't change owner's role
      if (member.role === "owner") {
        return NextResponse.json(
          { error: "Cannot change owner's role" },
          { status: 403 }
        )
      }

      // Can't promote to owner
      if (role === "owner") {
        return NextResponse.json(
          { error: "Cannot promote to owner" },
          { status: 403 }
        )
      }

      // Admins can change other admin roles (but only owner can remove admins - see DELETE)
      if (isAdmin) {
        updateData.role = role
      }
    }

    // Product access update (admins/owners only, can't change owner's access)
    if (allowedProducts !== undefined && isAdmin) {
      if (member.role === "owner") {
        return NextResponse.json(
          { error: "Cannot change owner's product access" },
          { status: 403 }
        )
      }
      // Validate products array
      const validProducts = ['finance', 'sales', 'team', 'projects', 'knowledge', 'agents']
      const filteredProducts = allowedProducts.filter((p: string) => validProducts.includes(p))
      updateData.allowed_products = filteredProducts
    }

    const { data: updated, error: updateError } = await supabase
      .from("workspace_members")
      .update(updateData)
      .eq("id", memberId)
      .select(`
        id,
        role,
        display_name,
        status,
        status_text,
        joined_at,
        allowed_products,
        profile:profile_id(id, name, avatar_url, email)
      `)
      .single()

    if (updateError) {
      console.error("Error updating member:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error in PUT /api/team/members/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/members/[id] - Remove a member from workspace
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

    // Get the member record
    const { data: member, error: fetchError } = await supabase
      .from("workspace_members")
      .select("workspace_id, profile_id, role")
      .eq("id", memberId)
      .single()

    if (fetchError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Check permissions
    const { data: currentUserMembership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", member.workspace_id)
      .eq("profile_id", session.id)
      .single()

    const isSelf = member.profile_id === session.id
    const currentRole = currentUserMembership?.role
    const isOwner = currentRole === "owner"
    const isAdmin = currentRole === "admin" || isOwner

    // Can't remove owners
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove workspace owner" },
        { status: 403 }
      )
    }

    // Only owner can remove admins
    if (member.role === "admin" && !isOwner) {
      return NextResponse.json(
        { error: "Only owner can remove admins" },
        { status: 403 }
      )
    }

    // Users can leave, admins can remove members
    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { error: "Not authorized to remove this member" },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from("workspace_members")
      .delete()
      .eq("id", memberId)

    if (deleteError) {
      console.error("Error removing member:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/team/members/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// PATCH /api/knowledge/categories/[id] - Update a category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()
    const { name, color, icon, position } = body

    // Get the current category
    const { data: existing, error: fetchError } = await supabase
      .from("knowledge_categories")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (name !== undefined) {
      updates.name = name.trim()
      // Update slug if name changed
      updates.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    }

    if (color !== undefined) {
      updates.color = color
    }

    if (icon !== undefined) {
      updates.icon = icon
    }

    if (position !== undefined) {
      updates.position = position
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    // Check for slug conflict if name was updated
    if (updates.slug && updates.slug !== existing.slug) {
      const { data: conflict } = await supabase
        .from("knowledge_categories")
        .select("id")
        .eq("workspace_id", existing.workspace_id)
        .eq("slug", updates.slug)
        .neq("id", id)
        .single()

      if (conflict) {
        return NextResponse.json(
          { error: "A category with this name already exists" },
          { status: 409 }
        )
      }
    }

    // Update the category
    const { data: category, error } = await supabase
      .from("knowledge_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating category:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to camelCase
    const result = {
      id: category.id,
      workspaceId: category.workspace_id,
      name: category.name,
      slug: category.slug,
      color: category.color,
      icon: category.icon,
      isSystem: category.is_system,
      position: category.position,
      createdBy: category.created_by,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in PATCH /api/knowledge/categories/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/knowledge/categories/[id] - Delete a category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Delete the category (page associations will cascade)
    const { error } = await supabase
      .from("knowledge_categories")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting category:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/knowledge/categories/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

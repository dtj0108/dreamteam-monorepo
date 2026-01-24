import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/knowledge/categories - Get all categories for the workspace
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

    // Fetch categories with page counts
    const { data: categories, error } = await supabase
      .from("knowledge_categories")
      .select(`
        *,
        knowledge_page_categories(count)
      `)
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching categories:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to include page count
    const categoriesWithCounts = (categories || []).map((cat: Record<string, unknown> & { knowledge_page_categories?: Array<{ count: number }> }) => ({
      id: cat.id,
      workspaceId: cat.workspace_id,
      name: cat.name,
      slug: cat.slug,
      color: cat.color,
      icon: cat.icon,
      isSystem: cat.is_system,
      position: cat.position,
      createdBy: cat.created_by,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at,
      pageCount: cat.knowledge_page_categories?.[0]?.count || 0,
    }))

    return NextResponse.json(categoriesWithCounts)
  } catch (error) {
    console.error("Error in GET /api/knowledge/categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/knowledge/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { workspaceId, name, color, icon } = body

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Category name required" }, { status: 400 })
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("knowledge_categories")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("slug", slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      )
    }

    // Get max position for ordering
    const { data: maxPosData } = await supabase
      .from("knowledge_categories")
      .select("position")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: false })
      .limit(1)

    const maxPosition = maxPosData?.[0]?.position ?? -1

    // Create the category
    const { data: category, error } = await supabase
      .from("knowledge_categories")
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        slug,
        color: color || "#6b7280", // Default gray
        icon: icon || "tag",
        is_system: false,
        position: maxPosition + 1,
        created_by: session.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating category:", error)
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
      pageCount: 0,
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/knowledge/categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

interface RouteParams {
  params: Promise<{ id: string }>
}

interface PageCategoryJoin {
  category_id: string
  knowledge_categories: Record<string, unknown> | null
}

// GET /api/knowledge/pages/[id]/categories - Get categories for a page
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get page categories with full category data
    const { data, error } = await supabase
      .from("knowledge_page_categories")
      .select(`
        category_id,
        knowledge_categories (
          id,
          workspace_id,
          name,
          slug,
          color,
          icon,
          is_system,
          position,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq("page_id", id)

    if (error) {
      console.error("Error fetching page categories:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to camelCase
    const categories = (data as PageCategoryJoin[] || [])
      .filter((item: PageCategoryJoin) => item.knowledge_categories)
      .map((item: PageCategoryJoin) => {
        const cat = item.knowledge_categories as Record<string, unknown>
        return {
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
        }
      })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error in GET /api/knowledge/pages/[id]/categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/knowledge/pages/[id]/categories - Set all categories for a page
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()
    const { categoryIds } = body

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        { error: "categoryIds must be an array" },
        { status: 400 }
      )
    }

    // Verify the page exists
    const { data: page, error: pageError } = await supabase
      .from("knowledge_pages")
      .select("id")
      .eq("id", id)
      .single()

    if (pageError || !page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Delete existing category associations
    const { error: deleteError } = await supabase
      .from("knowledge_page_categories")
      .delete()
      .eq("page_id", id)

    if (deleteError) {
      console.error("Error deleting page categories:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Insert new category associations
    if (categoryIds.length > 0) {
      const insertData = categoryIds.map((categoryId: string) => ({
        page_id: id,
        category_id: categoryId,
      }))

      const { error: insertError } = await supabase
        .from("knowledge_page_categories")
        .insert(insertData)

      if (insertError) {
        console.error("Error inserting page categories:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // Fetch the updated categories
    const { data, error } = await supabase
      .from("knowledge_page_categories")
      .select(`
        category_id,
        knowledge_categories (
          id,
          workspace_id,
          name,
          slug,
          color,
          icon,
          is_system,
          position,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq("page_id", id)

    if (error) {
      console.error("Error fetching updated page categories:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to camelCase
    const categories = (data as PageCategoryJoin[] || [])
      .filter((item: PageCategoryJoin) => item.knowledge_categories)
      .map((item: PageCategoryJoin) => {
        const cat = item.knowledge_categories as Record<string, unknown>
        return {
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
        }
      })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error in PUT /api/knowledge/pages/[id]/categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

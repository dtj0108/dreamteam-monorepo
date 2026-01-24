import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/knowledge/pages - Get all pages for the workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const parentId = searchParams.get("parentId")
    const archived = searchParams.get("archived") === "true"
    const categoryId = searchParams.get("categoryId")

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // If filtering by category, get page IDs first
    let pageIdsInCategory: string[] | null = null
    if (categoryId) {
      const { data: pageCats, error: catError } = await supabase
        .from("knowledge_page_categories")
        .select("page_id")
        .eq("category_id", categoryId)

      if (catError) {
        console.error("Error fetching category pages:", catError)
        return NextResponse.json({ error: catError.message }, { status: 500 })
      }

      const ids = (pageCats || []).map((pc: { page_id: string }) => pc.page_id)

      // If no pages in this category, return empty array
      if (ids.length === 0) {
        return NextResponse.json([])
      }

      pageIdsInCategory = ids
    }

    // Build query with category join
    let query = supabase
      .from("knowledge_pages")
      .select(`
        *,
        knowledge_page_categories (
          category_id,
          knowledge_categories (
            id,
            name,
            slug,
            color,
            icon,
            is_system,
            position
          )
        )
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_archived", archived)
      .eq("is_template", false)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })

    // Filter by parent if specified
    if (parentId) {
      query = query.eq("parent_id", parentId)
    }

    // Filter by category if specified
    if (pageIdsInCategory !== null) {
      query = query.in("id", pageIdsInCategory)
    }

    const { data: pages, error } = await query

    if (error) {
      console.error("Error fetching pages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform pages to include isFavorite flag and categories
    const pagesWithExtras = (pages || []).map((page: { is_favorited_by?: string[]; knowledge_page_categories?: Array<{ category_id: string; knowledge_categories: Record<string, unknown> | null }> } & Record<string, unknown>) => {
      // Extract categories from the join
      const categories = (page.knowledge_page_categories || [])
        .filter((pc) => pc.knowledge_categories)
        .map((pc) => {
          const cat = pc.knowledge_categories as Record<string, unknown>
          return {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            color: cat.color,
            icon: cat.icon,
            isSystem: cat.is_system,
            position: cat.position,
          }
        })

      const categoryIds = categories.map((c) => c.id)

      // Remove the raw join data and add transformed data
      const { knowledge_page_categories, ...pageData } = page

      return {
        ...pageData,
        isFavorite: Array.isArray(page.is_favorited_by)
          ? page.is_favorited_by.includes(session.id)
          : false,
        categoryIds,
        categories,
      }
    })

    return NextResponse.json(pagesWithExtras)
  } catch (error) {
    console.error("Error in GET /api/knowledge/pages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/knowledge/pages - Create a new page
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { workspaceId, title, parentId, templateId, icon, content } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID required" },
        { status: 400 }
      )
    }

    // If using a template, get template content
    let pageContent = content || []
    let pageTitle = title || "Untitled"
    let pageIcon = icon

    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from("knowledge_templates")
        .select("content, name, icon")
        .eq("id", templateId)
        .single()

      if (templateError) {
        console.error("Error fetching template:", templateError)
      } else if (template) {
        pageContent = template.content
        pageTitle = title || template.name
        pageIcon = icon || template.icon

        // Increment template usage count
        await supabase
          .from("knowledge_templates")
          .update({ usage_count: supabase.rpc("increment_usage_count", { row_id: templateId }) })
          .eq("id", templateId)
      }
    }

    // Get max position for ordering
    const { data: maxPosData } = await supabase
      .from("knowledge_pages")
      .select("position")
      .eq("workspace_id", workspaceId)
      .eq("parent_id", parentId || null)
      .order("position", { ascending: false })
      .limit(1)

    const maxPosition = maxPosData?.[0]?.position ?? -1

    // Create the page
    const { data: page, error: pageError } = await supabase
      .from("knowledge_pages")
      .insert({
        workspace_id: workspaceId,
        parent_id: parentId || null,
        title: pageTitle,
        icon: pageIcon,
        content: pageContent,
        position: maxPosition + 1,
        created_by: session.id,
        last_edited_by: session.id,
      })
      .select()
      .single()

    if (pageError) {
      console.error("Error creating page:", pageError)
      return NextResponse.json({ error: pageError.message }, { status: 500 })
    }

    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/knowledge/pages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

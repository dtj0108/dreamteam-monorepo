import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/knowledge/templates - Get all templates
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const category = searchParams.get("category")

    // Get system templates and workspace templates
    let query = supabase
      .from("knowledge_templates")
      .select("*")
      .order("usage_count", { ascending: false })

    // Filter: system templates OR workspace templates for this workspace
    if (workspaceId) {
      query = query.or(`is_system.eq.true,workspace_id.eq.${workspaceId}`)
    } else {
      query = query.eq("is_system", true)
    }

    if (category) {
      query = query.eq("category", category)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error("Error fetching templates:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(templates || [])
  } catch (error) {
    console.error("Error in GET /api/knowledge/templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/knowledge/templates - Create a custom template
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { workspaceId, name, description, icon, category, content } = body

    if (!name || !content) {
      return NextResponse.json(
        { error: "Name and content are required" },
        { status: 400 }
      )
    }

    const { data: template, error } = await supabase
      .from("knowledge_templates")
      .insert({
        workspace_id: workspaceId || null,
        name,
        description,
        icon,
        category: category || "general",
        content,
        is_system: false,
        created_by: session.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating template:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/knowledge/templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

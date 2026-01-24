import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/knowledge/pages/[id]/favorite - Toggle favorite status
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get current page
    const { data: page, error: fetchError } = await supabase
      .from("knowledge_pages")
      .select("is_favorited_by")
      .eq("id", id)
      .single()

    if (fetchError || !page) {
      console.error("Error fetching page:", fetchError)
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Toggle favorite
    const currentFavorites: string[] = Array.isArray(page.is_favorited_by)
      ? page.is_favorited_by
      : []
    const isFavorited = currentFavorites.includes(session.id)

    const newFavorites = isFavorited
      ? currentFavorites.filter((userId) => userId !== session.id)
      : [...currentFavorites, session.id]

    // Update page
    const { error: updateError } = await supabase
      .from("knowledge_pages")
      .update({ is_favorited_by: newFavorites })
      .eq("id", id)

    if (updateError) {
      console.error("Error updating favorite:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ isFavorite: !isFavorited })
  } catch (error) {
    console.error("Error in POST /api/knowledge/pages/[id]/favorite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

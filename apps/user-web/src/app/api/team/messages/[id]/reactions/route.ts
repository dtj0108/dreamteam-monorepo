import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// POST /api/team/messages/[id]/reactions - Add a reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { id: messageId } = await params
    const body = await request.json()
    const { emoji } = body

    if (!emoji) {
      return NextResponse.json({ error: "Emoji required" }, { status: 400 })
    }

    // Verify message exists
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .select("id")
      .eq("id", messageId)
      .single()

    if (msgError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    // Add reaction (upsert to handle duplicates)
    const { data: reaction, error: insertError } = await supabase
      .from("message_reactions")
      .upsert(
        {
          message_id: messageId,
          profile_id: session.id,
          emoji,
        },
        { onConflict: "message_id,profile_id,emoji" }
      )
      .select()
      .single()

    if (insertError) {
      console.error("Error adding reaction:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(reaction, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/team/messages/[id]/reactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/messages/[id]/reactions - Remove a reaction
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
    const { id: messageId } = await params
    const { searchParams } = new URL(request.url)
    const emoji = searchParams.get("emoji")

    if (!emoji) {
      return NextResponse.json({ error: "Emoji required" }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("profile_id", session.id)
      .eq("emoji", emoji)

    if (deleteError) {
      console.error("Error removing reaction:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/team/messages/[id]/reactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

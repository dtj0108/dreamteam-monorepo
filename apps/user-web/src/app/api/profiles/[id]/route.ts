import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"
import { getCurrentWorkspaceId } from "@/lib/workspace-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Verify the target profile belongs to the same workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("profile_id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[profiles/get] Error [${errorId}]:`, error)
    return NextResponse.json({ error: "Internal server error", errorId }, { status: 500 })
  }
}

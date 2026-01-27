import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// GET /api/workspace-members - Get all workspace members for current user's workspace
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user's workspace membership
    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("profile_id", user.id)
      .single()

    if (membershipError || !membership) {
      // If no workspace, return empty array
      return NextResponse.json({ members: [], currentUserId: user.id })
    }

    // Get all members of the workspace (excluding placeholder profiles and agents)
    const { data: members, error: membersError } = await supabase
      .from("workspace_members")
      .select(`
        id,
        role,
        display_name,
        profile:profile_id!inner(id, name, avatar_url, email, is_placeholder, is_agent)
      `)
      .eq("workspace_id", membership.workspace_id)
      .eq("profile.is_placeholder", false)
      .order("joined_at", { ascending: true })

    if (membersError) {
      console.error("Error fetching members:", membersError)
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    // Filter out agents and transform to the expected format
    interface ProfileData {
      id: string
      name: string | null
      avatar_url: string | null
      email: string | null
      is_placeholder?: boolean
      is_agent?: boolean
    }

    interface MemberRow {
      id: string
      role: string
      display_name: string | null
      profile: ProfileData | ProfileData[]
    }

    const filteredMembers = (members as unknown as MemberRow[])
      ?.filter((m) => {
        const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile
        return !profile?.is_agent
      })
      .map((m) => {
        const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile
        return {
          id: m.id,
          profileId: profile.id,
          name: profile.name || "Unknown",
          displayName: m.display_name || profile.name,
          avatarUrl: profile.avatar_url,
          email: profile.email || "",
        }
      })

    return NextResponse.json({
      members: filteredMembers || [],
      currentUserId: user.id,
    })
  } catch (error) {
    console.error("Error in GET /api/workspace-members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

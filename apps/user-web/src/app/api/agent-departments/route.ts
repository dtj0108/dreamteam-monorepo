import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database"
import { getSession } from "@dreamteam/auth/session"
import type { AgentDepartment } from "@/lib/types/agents"

// GET /api/agent-departments - List all agent departments
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: departments, error } = await supabase
      .from("agent_departments")
      .select("id, name, description, icon")
      .order("name", { ascending: true })

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === "42P01") {
        return NextResponse.json({ departments: [] })
      }
      console.error("Error fetching agent departments:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ departments: departments as AgentDepartment[] })
  } catch (error) {
    console.error("Error in GET /api/agent-departments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

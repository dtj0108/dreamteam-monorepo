import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", session.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching workflows:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in workflows GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, trigger_type, trigger_config, is_active, nodes, edges } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!trigger_type) {
      return NextResponse.json({ error: "Trigger type is required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("workflows")
      .insert({
        user_id: session.id,
        name,
        description,
        trigger_type,
        trigger_config: trigger_config || {},
        is_active: is_active || false,
        nodes: nodes || [],
        edges: edges || [],
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating workflow:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in workflows POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

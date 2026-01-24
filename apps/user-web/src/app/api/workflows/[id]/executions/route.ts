import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: workflowId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const supabase = createAdminClient()

    // First verify the workflow belongs to this user
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("id")
      .eq("id", workflowId)
      .eq("user_id", session.id)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    // Fetch executions for this workflow
    const { data: executions, error, count } = await supabase
      .from("workflow_executions")
      .select("*", { count: "exact" })
      .eq("workflow_id", workflowId)
      .eq("user_id", session.id)
      .order("started_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching workflow executions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      executions: executions || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error in workflow executions GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

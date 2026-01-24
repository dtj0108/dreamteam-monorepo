import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/transactions/[id]
 *
 * Get a single transaction by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        account:accounts!inner(id, name, type, workspace_id),
        category:categories(id, name, type, icon, color)
      `)
      .eq("id", id)
      .eq("account.workspace_id", auth.workspaceId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
      }
      console.error("Error fetching transaction:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in transaction GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/make/transactions/[id]
 *
 * Update a transaction.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    // First verify the transaction belongs to an account in this workspace
    const { data: txn } = await supabase
      .from("transactions")
      .select(`account:accounts!inner(workspace_id)`)
      .eq("id", id)
      .eq("account.workspace_id", auth.workspaceId)
      .single()

    if (!txn) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Build update object with allowed fields
    const allowedFields = ["category_id", "amount", "date", "description", "notes"]
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const { data, error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        account:accounts(id, name, type),
        category:categories(id, name, type)
      `)
      .single()

    if (error) {
      console.error("Error updating transaction:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in transaction PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/make/transactions/[id]
 *
 * Delete a transaction.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // First verify the transaction belongs to an account in this workspace
    const { data: txn } = await supabase
      .from("transactions")
      .select(`account:accounts!inner(workspace_id)`)
      .eq("id", id)
      .eq("account.workspace_id", auth.workspaceId)
      .single()

    if (!txn) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const { error } = await supabase.from("transactions").delete().eq("id", id)

    if (error) {
      console.error("Error deleting transaction:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in transaction DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"
import { fireWebhooks } from "@/lib/make-webhooks"
import { checkBudgetAlerts } from "@/lib/budget-alerts"

/**
 * GET /api/make/transactions
 *
 * List transactions in the workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")
    const accountId = searchParams.get("account_id")
    const categoryId = searchParams.get("category_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    // First get accounts in this workspace
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("workspace_id", auth.workspaceId)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const accountIds = accounts.map((a: { id: string }) => a.id)

    let query = supabase
      .from("transactions")
      .select(`
        id, amount, date, description, notes, is_transfer, created_at,
        account:accounts!inner(id, name, type),
        category:categories(id, name, type, icon, color)
      `)
      .in("account_id", accountIds)
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1)

    if (accountId) {
      query = query.eq("account_id", accountId)
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    if (startDate) {
      query = query.gte("date", startDate)
    }

    if (endDate) {
      query = query.lte("date", endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching transactions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in transactions GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/make/transactions
 *
 * Create a new transaction.
 * Fires transaction.created webhook on success.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isApiKeyAuth(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { account_id, category_id, amount, date, description, notes } = body

    if (!account_id) {
      return NextResponse.json({ error: "account_id is required" }, { status: 400 })
    }

    if (amount === undefined) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the account belongs to this workspace
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", account_id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        account_id,
        category_id: category_id || null,
        amount,
        date,
        description,
        notes,
      })
      .select(`
        id, amount, date, description, notes, is_transfer, created_at,
        account:accounts(id, name, type),
        category:categories(id, name, type)
      `)
      .single()

    if (error) {
      console.error("Error creating transaction:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire webhook
    await fireWebhooks("transaction.created", data, auth.workspaceId)

    // Check budget alerts (non-blocking)
    checkBudgetAlerts({
      amount: data.amount,
      category_id: category_id || null,
      date: date,
    }, auth.workspaceId)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in transactions POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

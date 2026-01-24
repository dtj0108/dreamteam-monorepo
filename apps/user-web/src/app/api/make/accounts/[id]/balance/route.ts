import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getAuthContext, isApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/make/accounts/[id]/balance
 *
 * Get the current balance for an account.
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
      .from("accounts")
      .select("id, name, balance, currency")
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }
      console.error("Error fetching account balance:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      balance: data.balance,
      currency: data.currency,
    })
  } catch (error) {
    console.error("Error in account balance GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

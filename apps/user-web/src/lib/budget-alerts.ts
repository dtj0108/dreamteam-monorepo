import { createAdminClient } from "@/lib/supabase-server"
import { fireWebhooks } from "@/lib/make-webhooks"

interface Budget {
  id: string
  profile_id: string
  category_id: string
  amount: number
  period: string
}

interface TransactionData {
  amount: number
  category_id: string | null
  date: string
}

/**
 * Check budget alerts after a transaction is created.
 * This is non-blocking - fires webhooks asynchronously.
 *
 * @param transaction - The transaction data
 * @param workspaceId - The workspace ID for webhook routing
 */
export async function checkBudgetAlerts(
  transaction: TransactionData,
  workspaceId: string
): Promise<void> {
  // Only check expenses (negative amounts or expense categories)
  // Skip if no category - we need it to match budgets
  if (!transaction.category_id) {
    return
  }

  const supabase = createAdminClient()

  // Get the category to check if it's an expense type
  const { data: category } = await supabase
    .from("categories")
    .select("id, type")
    .eq("id", transaction.category_id)
    .single()

  // Only check expense categories
  if (!category || category.type !== "expense") {
    return
  }

  // Get workspace members to find profile_ids
  const { data: members } = await supabase
    .from("workspace_members")
    .select("profile_id")
    .eq("workspace_id", workspaceId)

  if (!members?.length) {
    return
  }

  const profileIds = members.map((m: { profile_id: string }) => m.profile_id)

  // Get budgets for these profiles that match this category
  const { data: budgets, error } = await supabase
    .from("budgets")
    .select("*")
    .in("profile_id", profileIds)
    .eq("category_id", transaction.category_id)
    .eq("is_active", true)

  if (error || !budgets?.length) {
    return
  }

  // Check each budget
  for (const budget of budgets as Budget[]) {
    const periodStart = getPeriodStart(budget.period, transaction.date)

    // Get total spending for this category in this period
    // First get accounts in the workspace
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("workspace_id", workspaceId)

    if (!accounts?.length) continue

    const accountIds = accounts.map((a: { id: string }) => a.id)

    // Sum transactions for this category in the period
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .in("account_id", accountIds)
      .eq("category_id", transaction.category_id)
      .gte("date", periodStart)
      .lte("date", transaction.date)

    const totalSpending = (transactions || []).reduce(
      (sum: number, t: { amount: number }) => sum + Math.abs(Number(t.amount)),
      0
    )

    const percentUsed = (totalSpending / budget.amount) * 100
    const threshold = 80 // Default 80% threshold

    if (percentUsed >= threshold) {
      fireWebhooks("budget.alert", {
        budget_id: budget.id,
        budget_amount: budget.amount,
        current_spending: totalSpending,
        percent_used: Math.round(percentUsed),
        threshold: threshold,
        period: budget.period,
        category_id: budget.category_id,
        exceeded: percentUsed >= 100,
      }, workspaceId)
    }
  }
}

/**
 * Get the start date for a budget period.
 */
function getPeriodStart(period: string, currentDate: string): string {
  const date = new Date(currentDate)

  switch (period) {
    case "daily":
      return currentDate
    case "weekly":
      const dayOfWeek = date.getDay()
      date.setDate(date.getDate() - dayOfWeek)
      break
    case "biweekly":
      // Approximate - start from beginning of current 2-week period
      const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
      const biweekStart = Math.floor(dayOfYear / 14) * 14
      date.setMonth(0, biweekStart + 1)
      break
    case "monthly":
      date.setDate(1)
      break
    case "yearly":
      date.setMonth(0, 1)
      break
    default:
      date.setDate(1) // Default to monthly
  }

  return date.toISOString().split("T")[0]
}

import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, BudgetsResult } from "../types"
import { getJoinedField } from "@/lib/supabase-utils"

export const budgetsSchema = z.object({
  action: z.enum(["query", "create", "update"]).default("query").describe("Action to perform: query budgets, create a new budget, or update budget amount"),
  // Query params
  includeSpending: z.boolean().optional().default(true).describe("Include current spending amounts (for query)"),
  // Create params
  categoryId: z.string().optional().describe("Category ID to budget for (required for create)"),
  amount: z.number().optional().describe("Budget amount (required for create, optional for update)"),
  period: z.enum(["weekly", "biweekly", "monthly", "yearly"]).optional().describe("Budget period (for create)"),
  // Update params
  budgetId: z.string().optional().describe("Budget ID to update (required for update)"),
})

export function createBudgetsTool(context: ToolContext) {
  return tool({
    description: "Manage budgets. Query budgets with spending status, create new budgets for categories, or adjust budget amounts.",
    inputSchema: budgetsSchema,
    execute: async (params: z.infer<typeof budgetsSchema>): Promise<BudgetsResult | { success: boolean; message: string; budget?: Record<string, unknown> }> => {
      const { supabase, userId } = context
      const { action } = params

      // CREATE: Add a new budget
      if (action === "create") {
        const { categoryId, amount, period } = params

        if (!categoryId) {
          throw new Error("Category ID is required to create a budget")
        }
        if (amount === undefined) {
          throw new Error("Amount is required to create a budget")
        }

        const { data: budget, error } = await supabase
          .from("budgets")
          .insert({
            profile_id: userId,
            category_id: categoryId,
            amount,
            period: period || "monthly",
            start_date: new Date().toISOString().split("T")[0],
            is_active: true,
          })
          .select(`
            id,
            amount,
            period,
            category:categories(id, name)
          `)
          .single()

        if (error) {
          throw new Error(`Failed to create budget: ${error.message}`)
        }

        const categoryName = getJoinedField<string>(budget.category, 'name') || 'category'
        return {
          success: true,
          message: `Budget of $${amount.toLocaleString()} created for ${categoryName || "category"}`,
          budget,
        }
      }

      // UPDATE: Adjust budget amount
      if (action === "update") {
        const { budgetId, amount } = params

        if (!budgetId) {
          throw new Error("Budget ID is required to update")
        }
        if (amount === undefined) {
          throw new Error("New amount is required")
        }

        const { data: budget, error } = await supabase
          .from("budgets")
          .update({ amount })
          .eq("id", budgetId)
          .eq("profile_id", userId)
          .select(`
            id,
            amount,
            period,
            category:categories(id, name)
          `)
          .single()

        if (error) {
          throw new Error(`Failed to update budget: ${error.message}`)
        }

        return {
          success: true,
          message: `Budget updated to $${amount.toLocaleString()}`,
          budget,
        }
      }

      // QUERY: Get budgets (default)
      const { includeSpending = true } = params

      const { data: budgets, error } = await supabase
        .from("budgets")
        .select(`
          id,
          amount,
          period,
          start_date,
          category:categories(id, name)
        `)
        .eq("profile_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch budgets: ${error.message}`)
      }

      let totalBudgeted = 0
      let totalSpent = 0
      let overBudgetCount = 0

      const formattedBudgets = await Promise.all(
        (budgets || []).map(async (budget: any) => {
          totalBudgeted += budget.amount

          let spent = 0
          let remaining = budget.amount
          let percentUsed = 0

          if (includeSpending && budget.category?.id) {
            const periodDates = getBudgetPeriodDates(budget.period, budget.start_date)

            const { data: transactions } = await supabase
              .from("transactions")
              .select("amount")
              .eq("category_id", budget.category.id)
              .eq("user_id", userId)
              .gte("date", periodDates.start)
              .lt("date", periodDates.end)
              .lt("amount", 0)

            spent = Math.abs(
              (transactions || []).reduce((sum: number, tx: any) => sum + tx.amount, 0)
            )
            remaining = Math.max(0, budget.amount - spent)
            percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
            totalSpent += spent

            if (percentUsed > 100) {
              overBudgetCount++
            }
          }

          return {
            id: budget.id,
            category: budget.category?.name || "Unknown",
            categoryId: budget.category?.id || null,
            amount: budget.amount,
            spent,
            remaining,
            percentUsed: Math.round(percentUsed * 10) / 10,
            period: budget.period,
          }
        })
      )

      return {
        budgets: formattedBudgets,
        summary: {
          totalBudgeted,
          totalSpent,
          overBudgetCount,
        },
      }
    },
  })
}

function getBudgetPeriodDates(period: string, startDate: string): { start: string; end: string } {
  const now = new Date()
  const budgetStart = new Date(startDate)
  let periodStart = new Date(budgetStart)
  let periodEnd = new Date(budgetStart)

  switch (period) {
    case "weekly":
      while (periodEnd <= now) {
        periodStart = new Date(periodEnd)
        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodEnd.getDate() + 7)
      }
      break
    case "biweekly":
      while (periodEnd <= now) {
        periodStart = new Date(periodEnd)
        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodEnd.getDate() + 14)
      }
      break
    case "monthly":
      periodStart = new Date(now.getFullYear(), now.getMonth(), budgetStart.getDate())
      if (periodStart > now) {
        periodStart.setMonth(periodStart.getMonth() - 1)
      }
      periodEnd = new Date(periodStart)
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      break
    case "yearly":
      periodStart = new Date(now.getFullYear(), budgetStart.getMonth(), budgetStart.getDate())
      if (periodStart > now) {
        periodStart.setFullYear(periodStart.getFullYear() - 1)
      }
      periodEnd = new Date(periodStart)
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      break
  }

  return {
    start: periodStart.toISOString().split("T")[0],
    end: periodEnd.toISOString().split("T")[0],
  }
}

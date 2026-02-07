import { z } from "zod"
import type { MCPToolContext, MCPToolResponse, ResponseFormat } from "./types"
import { formatActionableError, formatCurrency, truncateText } from "./types"
import { conciseFormatters } from "./adapters/tool-adapter"
import { getJoinedField } from "@/lib/supabase-utils"

// ============================================================================
// TRANSACTIONS TOOL
// ============================================================================

const transactionsSchema = z.object({
  action: z.enum(["query", "categorize", "addNote"]).default("query"),
  responseFormat: z.enum(["concise", "detailed"]).default("concise"),
  // Query params
  limit: z.number().optional().default(20),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  // Update params
  transactionId: z.string().optional(),
  categoryId: z.string().optional(),
  note: z.string().optional(),
})

type TransactionsInput = z.infer<typeof transactionsSchema>

async function executeTransactions(
  input: TransactionsInput,
  context: MCPToolContext
): Promise<MCPToolResponse> {
  const { supabase, userId } = context
  const { action, responseFormat } = input

  try {
    // CATEGORIZE
    if (action === "categorize") {
      const { transactionId, categoryId } = input
      if (!transactionId) {
        return { success: false, error: "Transaction ID is required. List transactions first to get IDs." }
      }
      if (!categoryId) {
        return { success: false, error: "Category ID is required. Query categories to get available IDs." }
      }

      const { data: transaction, error } = await supabase
        .from("transactions")
        .update({ category_id: categoryId })
        .eq("id", transactionId)
        .eq("user_id", userId)
        .select(`id, description, amount, category:categories(name)`)
        .single()

      if (error) throw new Error(error.message)

      const categoryName = getJoinedField<string>(transaction.category, 'name')
      return {
        success: true,
        data: { message: `Categorized as "${categoryName}"`, transaction },
      }
    }

    // ADD NOTE
    if (action === "addNote") {
      const { transactionId, note } = input
      if (!transactionId) {
        return { success: false, error: "Transaction ID is required." }
      }
      if (!note) {
        return { success: false, error: "Note content is required." }
      }

      const { error } = await supabase
        .from("transactions")
        .update({ notes: note })
        .eq("id", transactionId)
        .eq("user_id", userId)

      if (error) throw new Error(error.message)

      return { success: true, data: { message: "Note added successfully." } }
    }

    // QUERY (default)
    const { limit = 20, category, startDate, endDate, search } = input

    let query = supabase
      .from("transactions")
      .select(`id, date, description, amount, notes, category:categories(id, name)`)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit)

    if (startDate) query = query.gte("date", startDate)
    if (endDate) query = query.lte("date", endDate)
    if (search) query = query.ilike("description", `%${search}%`)

    if (category) {
      const { data: categoryData } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", category)
        .single()

      if (categoryData) query = query.eq("category_id", categoryData.id)
    }

    const { data: transactions, error } = await query
    if (error) throw new Error(error.message)

    let totalIncome = 0
    let totalExpenses = 0

    interface TransactionRow {
      id: string; date: string; description: string; amount: number;
      notes: string | null; category: { id: string; name: string }[] | { id: string; name: string } | null;
    }
    const formatted = (transactions || []).map((tx: TransactionRow) => {
      const cat = Array.isArray(tx.category) ? tx.category[0] : tx.category
      if (tx.amount > 0) totalIncome += tx.amount
      else totalExpenses += Math.abs(tx.amount)

      return {
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        category: cat?.name || null,
        categoryId: cat?.id || null,
      }
    })

    const result = {
      transactions: formatted,
      summary: {
        count: formatted.length,
        totalIncome,
        totalExpenses,
        netChange: totalIncome - totalExpenses,
      },
    }

    // Concise format
    if (responseFormat === "concise") {
      const lines = formatted.slice(0, 5).map(
        (tx) => `${tx.date} | ${truncateText(tx.description, 30)} | ${formatCurrency(tx.amount)}`
      )
      const summary = `${formatted.length} transactions | Income: ${formatCurrency(totalIncome)} | Expenses: ${formatCurrency(totalExpenses)}`
      return {
        success: true,
        data: { summary, preview: lines.join("\n"), hasMore: formatted.length > 5 },
      }
    }

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// BUDGETS TOOL
// ============================================================================

const budgetsSchema = z.object({
  action: z.enum(["query", "create", "update"]).default("query"),
  responseFormat: z.enum(["concise", "detailed"]).default("concise"),
  includeSpending: z.boolean().optional().default(true),
  categoryId: z.string().optional(),
  amount: z.number().optional(),
  period: z.enum(["weekly", "biweekly", "monthly", "yearly"]).optional(),
  budgetId: z.string().optional(),
})

type BudgetsInput = z.infer<typeof budgetsSchema>

function getBudgetPeriodDates(period: string, startDate: string): { start: string; end: string } {
  const now = new Date()
  const budgetStart = new Date(startDate)
  let periodStart = new Date(budgetStart)
  let periodEnd = new Date(budgetStart)

  switch (period) {
    case "weekly":
      while (periodEnd <= now) {
        periodStart = new Date(periodEnd)
        periodEnd.setDate(periodEnd.getDate() + 7)
      }
      break
    case "biweekly":
      while (periodEnd <= now) {
        periodStart = new Date(periodEnd)
        periodEnd.setDate(periodEnd.getDate() + 14)
      }
      break
    case "monthly":
      periodStart = new Date(now.getFullYear(), now.getMonth(), budgetStart.getDate())
      if (periodStart > now) periodStart.setMonth(periodStart.getMonth() - 1)
      periodEnd = new Date(periodStart)
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      break
    case "yearly":
      periodStart = new Date(now.getFullYear(), budgetStart.getMonth(), budgetStart.getDate())
      if (periodStart > now) periodStart.setFullYear(periodStart.getFullYear() - 1)
      periodEnd = new Date(periodStart)
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      break
  }

  return {
    start: periodStart.toISOString().split("T")[0],
    end: periodEnd.toISOString().split("T")[0],
  }
}

async function executeBudgets(
  input: BudgetsInput,
  context: MCPToolContext
): Promise<MCPToolResponse> {
  const { supabase, userId } = context
  const { action, responseFormat } = input

  try {
    // CREATE
    if (action === "create") {
      const { categoryId, amount, period } = input
      if (!categoryId) {
        return { success: false, error: "Category ID is required. Query categories first to get IDs." }
      }
      if (amount === undefined) {
        return { success: false, error: "Amount is required (e.g., 500 for $500 budget)." }
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
        .select(`id, amount, period, category:categories(name)`)
        .single()

      if (error) throw new Error(error.message)

      const categoryName = getJoinedField<string>(budget.category, 'name')
      return {
        success: true,
        data: { message: `Budget of ${formatCurrency(amount)} created for ${categoryName}` },
      }
    }

    // UPDATE
    if (action === "update") {
      const { budgetId, amount } = input
      if (!budgetId) {
        return { success: false, error: "Budget ID is required. List budgets first to get IDs." }
      }
      if (amount === undefined) {
        return { success: false, error: "New amount is required." }
      }

      const { error } = await supabase
        .from("budgets")
        .update({ amount })
        .eq("id", budgetId)
        .eq("profile_id", userId)

      if (error) throw new Error(error.message)

      return { success: true, data: { message: `Budget updated to ${formatCurrency(amount)}` } }
    }

    // QUERY (default)
    const { includeSpending = true } = input

    const { data: budgets, error } = await supabase
      .from("budgets")
      .select(`id, amount, period, start_date, category:categories(id, name)`)
      .eq("profile_id", userId)
      .eq("is_active", true)

    if (error) throw new Error(error.message)

    let totalBudgeted = 0
    let totalSpent = 0
    let overBudgetCount = 0

    const formatted = await Promise.all(
      (budgets || []).map(async (budget: any) => {
        totalBudgeted += budget.amount

        let spent = 0
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

          spent = Math.abs((transactions || []).reduce((sum: number, tx: any) => sum + tx.amount, 0))
          totalSpent += spent
          if (spent > budget.amount) overBudgetCount++
        }

        const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
        const status = percentUsed > 100 ? "OVER" : percentUsed > 80 ? "WARNING" : "OK"

        return {
          id: budget.id,
          category: budget.category?.name || "Unknown",
          amount: budget.amount,
          spent,
          remaining: Math.max(0, budget.amount - spent),
          percentUsed: Math.round(percentUsed),
          status,
          period: budget.period,
        }
      })
    )

    // Concise format
    if (responseFormat === "concise") {
      const lines = formatted.map(
        (b) => `${b.category}: ${formatCurrency(b.spent)}/${formatCurrency(b.amount)} (${b.percentUsed}%) ${b.status === "OVER" ? "⚠️ OVER" : ""}`
      )
      const summary = `${formatted.length} budgets | Spent: ${formatCurrency(totalSpent)}/${formatCurrency(totalBudgeted)} | ${overBudgetCount} over budget`
      return { success: true, data: { summary, budgets: lines.join("\n") } }
    }

    return {
      success: true,
      data: { budgets: formatted, summary: { totalBudgeted, totalSpent, overBudgetCount } },
    }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// ACCOUNTS TOOL
// ============================================================================

const accountsSchema = z.object({
  action: z.enum(["query", "updateBalance"]).default("query"),
  responseFormat: z.enum(["concise", "detailed"]).default("concise"),
  type: z.enum(["all", "checking", "savings", "credit", "investment"]).optional().default("all"),
  accountId: z.string().optional(),
  balance: z.number().optional(),
})

type AccountsInput = z.infer<typeof accountsSchema>

async function executeAccounts(
  input: AccountsInput,
  context: MCPToolContext
): Promise<MCPToolResponse> {
  const { supabase, userId } = context
  const { action, responseFormat } = input

  try {
    // UPDATE BALANCE
    if (action === "updateBalance") {
      const { accountId, balance } = input
      if (!accountId) {
        return { success: false, error: "Account ID is required. List accounts first to get IDs." }
      }
      if (balance === undefined) {
        return { success: false, error: "New balance is required." }
      }

      const { data: account, error } = await supabase
        .from("accounts")
        .update({ balance })
        .eq("id", accountId)
        .eq("user_id", userId)
        .select("name")
        .single()

      if (error) throw new Error(error.message)

      return {
        success: true,
        data: { message: `${account.name} balance updated to ${formatCurrency(balance)}` },
      }
    }

    // QUERY (default)
    const { type = "all" } = input

    let query = supabase
      .from("accounts")
      .select("id, name, type, balance, institution")
      .eq("user_id", userId)

    if (type !== "all") query = query.eq("type", type)

    const { data: accounts, error } = await query
    if (error) throw new Error(error.message)

    let totalAssets = 0
    let totalLiabilities = 0

    const formatted = (accounts || []).map((account: any) => {
      if (account.type === "credit") {
        totalLiabilities += Math.abs(account.balance)
      } else {
        totalAssets += account.balance
      }
      return {
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        institution: account.institution,
      }
    })

    // Concise format
    if (responseFormat === "concise") {
      const lines = formatted.map((a) => `${a.name} (${a.type}): ${formatCurrency(a.balance)}`)
      const summary = `Net Worth: ${formatCurrency(totalAssets - totalLiabilities)} | Assets: ${formatCurrency(totalAssets)} | Liabilities: ${formatCurrency(totalLiabilities)}`
      return { success: true, data: { summary, accounts: lines.join("\n") } }
    }

    return {
      success: true,
      data: { accounts: formatted, summary: { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities } },
    }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// GOALS TOOL
// ============================================================================

const goalsSchema = z.object({
  action: z.enum(["query", "create", "updateProgress"]).default("query"),
  responseFormat: z.enum(["concise", "detailed"]).default("concise"),
  status: z.enum(["all", "active", "completed"]).optional().default("active"),
  name: z.string().optional(),
  targetAmount: z.number().optional(),
  deadline: z.string().optional(),
  goalId: z.string().optional(),
  currentAmount: z.number().optional(),
})

type GoalsInput = z.infer<typeof goalsSchema>

async function executeGoals(
  input: GoalsInput,
  context: MCPToolContext
): Promise<MCPToolResponse> {
  const { supabase, userId } = context
  const { action, responseFormat } = input

  try {
    // CREATE
    if (action === "create") {
      const { name, targetAmount, deadline } = input
      if (!name) {
        return { success: false, error: "Goal name is required (e.g., 'Emergency Fund', 'Vacation')." }
      }
      if (targetAmount === undefined) {
        return { success: false, error: "Target amount is required (e.g., 10000 for $10,000)." }
      }

      const { error } = await supabase
        .from("goals")
        .insert({
          user_id: userId,
          name,
          target_amount: targetAmount,
          current_amount: 0,
          end_date: deadline || null,
          is_achieved: false,
        })

      if (error) throw new Error(error.message)

      return {
        success: true,
        data: { message: `Goal "${name}" created with target of ${formatCurrency(targetAmount)}` },
      }
    }

    // UPDATE PROGRESS
    if (action === "updateProgress") {
      const { goalId, currentAmount } = input
      if (!goalId) {
        return { success: false, error: "Goal ID is required. List goals first to get IDs." }
      }
      if (currentAmount === undefined) {
        return { success: false, error: "Current amount is required." }
      }

      const { data: existingGoal } = await supabase
        .from("goals")
        .select("target_amount, name")
        .eq("id", goalId)
        .eq("user_id", userId)
        .single()

      const isAchieved = existingGoal && currentAmount >= existingGoal.target_amount

      const { error } = await supabase
        .from("goals")
        .update({ current_amount: currentAmount, is_achieved: isAchieved })
        .eq("id", goalId)
        .eq("user_id", userId)

      if (error) throw new Error(error.message)

      const message = isAchieved
        ? `Goal "${existingGoal?.name}" achieved! ${formatCurrency(currentAmount)}`
        : `Progress updated to ${formatCurrency(currentAmount)}`

      return { success: true, data: { message, isAchieved } }
    }

    // QUERY (default)
    const { status = "active" } = input

    let query = supabase
      .from("goals")
      .select("id, name, target_amount, current_amount, end_date, is_achieved")
      .eq("user_id", userId)
      .order("end_date", { ascending: true })

    if (status === "active") query = query.eq("is_achieved", false)
    else if (status === "completed") query = query.eq("is_achieved", true)

    const { data: goals, error } = await query
    if (error) throw new Error(error.message)

    let totalTargeted = 0
    let totalSaved = 0

    const formatted = (goals || []).map((goal: any) => {
      totalTargeted += goal.target_amount
      totalSaved += goal.current_amount

      const progress = goal.target_amount > 0
        ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
        : 0

      return {
        id: goal.id,
        name: goal.name,
        targetAmount: goal.target_amount,
        currentAmount: goal.current_amount,
        progress: Math.round(progress),
        deadline: goal.end_date,
        isAchieved: goal.is_achieved,
      }
    })

    // Concise format
    if (responseFormat === "concise") {
      const lines = formatted.map(
        (g) => `${g.name}: ${formatCurrency(g.currentAmount)}/${formatCurrency(g.targetAmount)} (${g.progress}%)${g.isAchieved ? " ✓" : ""}`
      )
      const summary = `${formatted.length} goals | Saved: ${formatCurrency(totalSaved)}/${formatCurrency(totalTargeted)}`
      return { success: true, data: { summary, goals: lines.join("\n") } }
    }

    return {
      success: true,
      data: { goals: formatted, summary: { activeCount: formatted.filter((g) => !g.isAchieved).length, completedCount: formatted.filter((g) => g.isAchieved).length, totalTargeted, totalSaved } },
    }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// DATA EXPORT TOOL
// ============================================================================

const dataExportSchema = z.object({
  dataType: z.enum(["transactions", "budgets", "accounts", "goals", "all"]).default("transactions"),
  format: z.enum(["csv", "json"]).default("csv"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

type DataExportInput = z.infer<typeof dataExportSchema>

async function executeDataExport(
  input: DataExportInput,
  context: MCPToolContext
): Promise<MCPToolResponse> {
  const { supabase, userId } = context
  const { dataType, format, startDate, endDate } = input

  try {
    const exports: Record<string, any[]> = {}

    // Fetch requested data
    if (dataType === "transactions" || dataType === "all") {
      let query = supabase
        .from("transactions")
        .select("date, description, amount, category:categories(name)")
        .eq("user_id", userId)
        .order("date", { ascending: false })

      if (startDate) query = query.gte("date", startDate)
      if (endDate) query = query.lte("date", endDate)

      const { data } = await query
      exports.transactions = (data || []).map((tx: any) => ({
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        category: tx.category?.name || "",
      }))
    }

    if (dataType === "budgets" || dataType === "all") {
      const { data } = await supabase
        .from("budgets")
        .select("amount, period, category:categories(name)")
        .eq("profile_id", userId)
        .eq("is_active", true)

      exports.budgets = (data || []).map((b: any) => ({
        category: b.category?.name || "",
        amount: b.amount,
        period: b.period,
      }))
    }

    if (dataType === "accounts" || dataType === "all") {
      const { data } = await supabase
        .from("accounts")
        .select("name, type, balance, institution")
        .eq("user_id", userId)

      exports.accounts = data || []
    }

    if (dataType === "goals" || dataType === "all") {
      const { data } = await supabase
        .from("goals")
        .select("name, target_amount, current_amount, end_date, is_achieved")
        .eq("user_id", userId)

      exports.goals = (data || []).map((g: any) => ({
        name: g.name,
        targetAmount: g.target_amount,
        currentAmount: g.current_amount,
        deadline: g.end_date,
        isAchieved: g.is_achieved,
      }))
    }

    // Format output
    const result = dataType === "all" ? exports : exports[dataType]
    const recordCount = Array.isArray(result)
      ? result.length
      : Object.values(exports).reduce((sum, arr) => sum + arr.length, 0)

    if (format === "json") {
      return {
        success: true,
        data: {
          format: "json",
          recordCount,
          content: result,
        },
      }
    }

    // CSV format
    const toCSV = (data: any[]): string => {
      if (data.length === 0) return ""
      const headers = Object.keys(data[0])
      const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","))
      return [headers.join(","), ...rows].join("\n")
    }

    const csvContent = Array.isArray(result)
      ? toCSV(result)
      : Object.entries(exports)
          .map(([key, data]) => `=== ${key.toUpperCase()} ===\n${toCSV(data)}`)
          .join("\n\n")

    return {
      success: true,
      data: {
        format: "csv",
        recordCount,
        content: csvContent,
        hint: "Copy the content above or save to a .csv file",
      },
    }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// TOOL DEFINITIONS EXPORT
// ============================================================================

export const financeToolDefinitions = {
  manageTransactions: {
    name: "manageTransactions",
    description: "Query, categorize, or annotate financial transactions. Use 'query' to search transactions, 'categorize' to assign categories, or 'addNote' to add notes.",
    schema: transactionsSchema,
    execute: executeTransactions,
  },
  manageBudgets: {
    name: "manageBudgets",
    description: "Query budget status with spending, create new budgets for categories, or update budget amounts.",
    schema: budgetsSchema,
    execute: executeBudgets,
  },
  manageAccounts: {
    name: "manageAccounts",
    description: "Query financial accounts and net worth, or update account balances manually.",
    schema: accountsSchema,
    execute: executeAccounts,
  },
  manageGoals: {
    name: "manageGoals",
    description: "Query financial goals, create new savings goals, or update progress toward goals.",
    schema: goalsSchema,
    execute: executeGoals,
  },
  exportData: {
    name: "exportData",
    description: "Export financial data (transactions, budgets, accounts, goals) as CSV or JSON format.",
    schema: dataExportSchema,
    execute: executeDataExport,
  },
}

export type FinanceToolName = keyof typeof financeToolDefinitions

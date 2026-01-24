import { z } from "zod"

// Tool schemas for AI agents (AI SDK v6 compatible)
// Note: Execute functions are handled in the API route

export const transactionsSchema = z.object({
  limit: z.number().describe("Maximum number of transactions to return (default 20)").optional(),
  category: z.string().describe("Filter by category name").optional(),
  startDate: z.string().describe("Start date in ISO format (YYYY-MM-DD)").optional(),
  endDate: z.string().describe("End date in ISO format (YYYY-MM-DD)").optional(),
  search: z.string().describe("Search term for transaction description").optional(),
})

export const budgetsSchema = z.object({
  includeSpending: z.boolean().describe("Include current spending amounts (default true)").optional(),
})

export const accountsSchema = z.object({
  type: z.enum(["all", "checking", "savings", "credit", "investment"]).describe("Filter by account type (default all)").optional(),
})

export const goalsSchema = z.object({
  status: z.enum(["all", "active", "completed"]).describe("Filter by goal status (default active)").optional(),
})

// Tool definitions for AI agents - returns schemas only for v6 compatibility
export function getAgentTools(enabledTools: string[]) {
  const tools: Record<string, { description: string; parameters: z.ZodObject<z.ZodRawShape> }> = {}

  if (enabledTools.includes("transactions")) {
    tools.getTransactions = {
      description: "Get the user's recent transactions. Can filter by category, date range, or search term.",
      parameters: transactionsSchema,
    }
  }

  if (enabledTools.includes("budgets")) {
    tools.getBudgets = {
      description: "Get the user's budgets and their current spending status.",
      parameters: budgetsSchema,
    }
  }

  if (enabledTools.includes("accounts")) {
    tools.getAccounts = {
      description: "Get the user's financial accounts and their current balances.",
      parameters: accountsSchema,
    }
  }

  if (enabledTools.includes("goals")) {
    tools.getGoals = {
      description: "Get the user's financial goals and their progress.",
      parameters: goalsSchema,
    }
  }

  return tools
}

// Get tool descriptions for displaying in UI
export const toolDescriptions = {
  transactions: {
    id: "transactions",
    name: "Transactions",
    description: "Access and analyze transaction history",
    icon: "Receipt",
  },
  budgets: {
    id: "budgets",
    name: "Budgets",
    description: "View budget status and spending",
    icon: "PieChart",
  },
  accounts: {
    id: "accounts",
    name: "Accounts",
    description: "Access account balances and info",
    icon: "Wallet",
  },
  goals: {
    id: "goals",
    name: "Goals",
    description: "Track financial goal progress",
    icon: "Target",
  },
}

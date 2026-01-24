import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, AccountsResult } from "../types"

export const accountsSchema = z.object({
  action: z.enum(["query", "updateBalance"]).default("query").describe("Action to perform: query accounts or update an account balance"),
  // Query params
  type: z.enum(["all", "checking", "savings", "credit", "investment"]).optional().default("all").describe("Filter by account type (for query)"),
  // Update params
  accountId: z.string().optional().describe("Account ID to update (required for updateBalance)"),
  balance: z.number().optional().describe("New balance amount (required for updateBalance)"),
})

export function createAccountsTool(context: ToolContext) {
  return tool({
    description: "Manage financial accounts. Query account balances and net worth, or manually update account balances.",
    inputSchema: accountsSchema,
    execute: async (params: z.infer<typeof accountsSchema>): Promise<AccountsResult | { success: boolean; message: string; account?: any }> => {
      const { supabase, userId } = context
      const { action } = params

      // UPDATE BALANCE: Manually adjust account balance
      if (action === "updateBalance") {
        const { accountId, balance } = params

        if (!accountId) {
          throw new Error("Account ID is required to update balance")
        }
        if (balance === undefined) {
          throw new Error("New balance is required")
        }

        const { data: account, error } = await supabase
          .from("accounts")
          .update({ balance })
          .eq("id", accountId)
          .eq("user_id", userId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update account balance: ${error.message}`)
        }

        return {
          success: true,
          message: `${account.name} balance updated to $${balance.toLocaleString()}`,
          account,
        }
      }

      // QUERY: Get accounts (default)
      const { type = "all" } = params

      let query = supabase
        .from("accounts")
        .select("id, name, type, balance, institution")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })

      if (type !== "all") {
        query = query.eq("type", type)
      }

      const { data: accounts, error } = await query

      if (error) {
        throw new Error(`Failed to fetch accounts: ${error.message}`)
      }

      let totalAssets = 0
      let totalLiabilities = 0

      const formattedAccounts = (accounts || []).map((account: any) => {
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

      return {
        accounts: formattedAccounts,
        summary: {
          totalAssets,
          totalLiabilities,
          netWorth: totalAssets - totalLiabilities,
        },
      }
    },
  })
}

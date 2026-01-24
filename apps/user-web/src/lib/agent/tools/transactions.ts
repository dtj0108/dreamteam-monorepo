import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, TransactionsResult } from "../types"

export const transactionsSchema = z.object({
  action: z.enum(["query", "categorize", "addNote"]).default("query").describe("Action to perform: query transactions, categorize a transaction, or add a note"),
  // Query params
  limit: z.number().optional().default(20).describe("Maximum number of transactions to return (for query)"),
  category: z.string().optional().describe("Filter by category name (for query)"),
  startDate: z.string().optional().describe("Start date in ISO format (for query)"),
  endDate: z.string().optional().describe("End date in ISO format (for query)"),
  search: z.string().optional().describe("Search term for transaction description (for query)"),
  // Update params
  transactionId: z.string().optional().describe("Transaction ID to update (required for categorize/addNote)"),
  categoryId: z.string().optional().describe("Category ID to assign (required for categorize)"),
  note: z.string().optional().describe("Note to add to transaction (required for addNote)"),
})

export function createTransactionsTool(context: ToolContext) {
  return tool({
    description: "Manage transactions. Query transactions with filters, categorize transactions, or add notes.",
    inputSchema: transactionsSchema,
    execute: async (params: z.infer<typeof transactionsSchema>): Promise<TransactionsResult | { success: boolean; message: string; transaction?: any }> => {
      const { supabase, userId } = context
      const { action } = params

      // CATEGORIZE: Update transaction category
      if (action === "categorize") {
        const { transactionId, categoryId } = params

        if (!transactionId) {
          throw new Error("Transaction ID is required to categorize")
        }
        if (!categoryId) {
          throw new Error("Category ID is required")
        }

        const { data: transaction, error } = await supabase
          .from("transactions")
          .update({ category_id: categoryId })
          .eq("id", transactionId)
          .eq("user_id", userId)
          .select(`
            id,
            description,
            amount,
            category:categories(name)
          `)
          .single()

        if (error) {
          throw new Error(`Failed to categorize transaction: ${error.message}`)
        }

        const categoryName = (transaction.category as any)?.name || (transaction.category as any)?.[0]?.name
        return {
          success: true,
          message: `Transaction categorized as "${categoryName || "Unknown"}"`,
          transaction,
        }
      }

      // ADD NOTE: Add a note to a transaction
      if (action === "addNote") {
        const { transactionId, note } = params

        if (!transactionId) {
          throw new Error("Transaction ID is required to add a note")
        }
        if (!note) {
          throw new Error("Note content is required")
        }

        const { data: transaction, error } = await supabase
          .from("transactions")
          .update({ notes: note })
          .eq("id", transactionId)
          .eq("user_id", userId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to add note: ${error.message}`)
        }

        return {
          success: true,
          message: "Note added to transaction",
          transaction,
        }
      }

      // QUERY: Get transactions (default)
      const { limit = 20, category, startDate, endDate, search } = params

      let query = supabase
        .from("transactions")
        .select(`
          id,
          date,
          description,
          amount,
          notes,
          category:categories(id, name)
        `)
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(limit)

      if (startDate) {
        query = query.gte("date", startDate)
      }
      if (endDate) {
        query = query.lte("date", endDate)
      }
      if (search) {
        query = query.ilike("description", `%${search}%`)
      }

      if (category) {
        const { data: categoryData } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", userId)
          .ilike("name", category)
          .single()

        if (categoryData) {
          query = query.eq("category_id", categoryData.id)
        }
      }

      const { data: transactions, error } = await query

      if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`)
      }

      let totalIncome = 0
      let totalExpenses = 0

      const formattedTransactions = (transactions || []).map((tx: any) => {
        if (tx.amount > 0) {
          totalIncome += tx.amount
        } else {
          totalExpenses += Math.abs(tx.amount)
        }

        return {
          id: tx.id,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          category: tx.category?.name || null,
          categoryId: tx.category?.id || null,
          notes: tx.notes || null,
        }
      })

      return {
        transactions: formattedTransactions,
        summary: {
          count: formattedTransactions.length,
          totalIncome,
          totalExpenses,
          netChange: totalIncome - totalExpenses,
        },
      }
    },
  })
}

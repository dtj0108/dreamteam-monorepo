import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, DataExportResult } from "../types"

export const dataExportSchema = z.object({
  type: z
    .enum(["transactions", "budgets", "accounts", "summary"])
    .describe("Type of data to export"),
  format: z.enum(["csv", "json"]).default("csv").describe("Export format"),
  startDate: z.string().optional().describe("Start date for transactions (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("End date for transactions (YYYY-MM-DD)"),
})

export function createDataExportTool(context: ToolContext) {
  return tool({
    description:
      "Export financial data as CSV or JSON. Can export transactions, budgets, accounts, or a financial summary.",
    inputSchema: dataExportSchema,
    execute: async (params: z.infer<typeof dataExportSchema>): Promise<DataExportResult> => {
      const { supabase, userId } = context
      const { type, format = "csv", startDate, endDate } = params

      let data: any[] = []
      let filename = ""

      switch (type) {
        case "transactions": {
          let query = supabase
            .from("transactions")
            .select(`
              id,
              date,
              description,
              amount,
              category:categories(name),
              account:accounts(name)
            `)
            .eq("user_id", userId)
            .order("date", { ascending: false })

          if (startDate) query = query.gte("date", startDate)
          if (endDate) query = query.lte("date", endDate)

          const { data: transactions, error } = await query.limit(1000)
          if (error) throw new Error(`Failed to export transactions: ${error.message}`)

          data = (transactions || []).map((tx: any) => ({
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            category: tx.category?.name || "",
            account: tx.account?.name || "",
          }))
          filename = `transactions_${new Date().toISOString().split("T")[0]}`
          break
        }

        case "budgets": {
          const { data: budgets, error } = await supabase
            .from("budgets")
            .select(`
              id,
              amount,
              period,
              category:categories(name)
            `)
            .eq("profile_id", userId)
            .eq("is_active", true)

          if (error) throw new Error(`Failed to export budgets: ${error.message}`)

          data = (budgets || []).map((budget: any) => ({
            category: budget.category?.name || "",
            budget_amount: budget.amount,
            period: budget.period,
          }))
          filename = `budgets_${new Date().toISOString().split("T")[0]}`
          break
        }

        case "accounts": {
          const { data: accounts, error } = await supabase
            .from("accounts")
            .select("id, name, type, balance, institution")
            .eq("user_id", userId)

          if (error) throw new Error(`Failed to export accounts: ${error.message}`)

          data = (accounts || []).map((account: any) => ({
            name: account.name,
            type: account.type,
            balance: account.balance,
            institution: account.institution || "",
          }))
          filename = `accounts_${new Date().toISOString().split("T")[0]}`
          break
        }

        case "summary": {
          // Get accounts summary
          const { data: accounts } = await supabase
            .from("accounts")
            .select("type, balance")
            .eq("user_id", userId)

          let totalAssets = 0
          let totalLiabilities = 0
          for (const acc of accounts || []) {
            if (acc.type === "credit") {
              totalLiabilities += Math.abs(acc.balance)
            } else {
              totalAssets += acc.balance
            }
          }

          // Get this month's transactions
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          const startDateStr = startOfMonth.toISOString().split("T")[0]

          const { data: monthTransactions } = await supabase
            .from("transactions")
            .select("amount")
            .eq("user_id", userId)
            .gte("date", startDateStr)

          let monthIncome = 0
          let monthExpenses = 0
          for (const tx of monthTransactions || []) {
            if (tx.amount > 0) {
              monthIncome += tx.amount
            } else {
              monthExpenses += Math.abs(tx.amount)
            }
          }

          data = [
            {
              metric: "Total Assets",
              value: totalAssets,
            },
            {
              metric: "Total Liabilities",
              value: totalLiabilities,
            },
            {
              metric: "Net Worth",
              value: totalAssets - totalLiabilities,
            },
            {
              metric: "This Month Income",
              value: monthIncome,
            },
            {
              metric: "This Month Expenses",
              value: monthExpenses,
            },
            {
              metric: "This Month Net",
              value: monthIncome - monthExpenses,
            },
          ]
          filename = `financial_summary_${new Date().toISOString().split("T")[0]}`
          break
        }
      }

      // Generate content based on format
      let content: string
      let mimeType: string

      if (format === "csv") {
        if (data.length === 0) {
          content = ""
        } else {
          const headers = Object.keys(data[0])
          const rows = data.map((row) =>
            headers.map((h) => {
              const val = row[h]
              // Escape commas and quotes in CSV
              if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
                return `"${val.replace(/"/g, '""')}"`
              }
              return val
            }).join(",")
          )
          content = [headers.join(","), ...rows].join("\n")
        }
        mimeType = "text/csv"
        filename += ".csv"
      } else {
        content = JSON.stringify(data, null, 2)
        mimeType = "application/json"
        filename += ".json"
      }

      // Upload to Supabase storage
      const filePath = `exports/${userId}/${filename}`

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(filePath, content, {
          contentType: mimeType,
          upsert: true,
        })

      if (uploadError) {
        // If storage isn't configured, return the data inline
        return {
          success: true,
          downloadUrl: `data:${mimeType};base64,${Buffer.from(content).toString("base64")}`,
          filename,
          recordCount: data.length,
        }
      }

      // Get signed URL for download
      const { data: signedUrl } = await supabase.storage
        .from("user-files")
        .createSignedUrl(filePath, 3600) // 1 hour expiry

      return {
        success: true,
        downloadUrl: signedUrl?.signedUrl || "",
        filename,
        recordCount: data.length,
      }
    },
  })
}

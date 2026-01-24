/**
 * Analytics MCP Tool
 *
 * Provides analytics reports: P&L, cash flow, budget vs actual, KPIs, and sales pipeline
 */

import { z } from "zod"
import type { MCPToolContext, MCPToolResponse } from "../types"
import { formatActionableError, formatCurrency } from "../types"

// ============================================================================
// SCHEMA
// ============================================================================

export const analyticsSchema = z.object({
  report: z
    .enum([
      "profitLoss",
      "cashFlow",
      "budgetVsActual",
      "kpis",
      "dealsPipeline",
      "salesForecast",
      "overview",
    ])
    .describe("The type of report to generate"),
  period: z.enum(["week", "month", "quarter", "year", "all"]).default("month").describe("Time period for the report"),
  startDate: z.string().optional().describe("Custom start date (ISO format)"),
  endDate: z.string().optional().describe("Custom end date (ISO format)"),
  pipelineId: z.string().optional().describe("Pipeline ID for deals reports"),
  responseFormat: z.enum(["concise", "detailed"]).default("concise"),
})

type AnalyticsInput = z.infer<typeof analyticsSchema>

// ============================================================================
// HELPERS
// ============================================================================

function getPeriodDates(period: string, startDate?: string, endDate?: string): { start: string; end: string } {
  if (startDate && endDate) {
    return { start: startDate, end: endDate }
  }

  const now = new Date()
  let start: Date
  let end = new Date(now)

  switch (period) {
    case "week":
      start = new Date(now)
      start.setDate(now.getDate() - 7)
      break
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    case "quarter":
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1)
      end = new Date(now.getFullYear(), quarter * 3 + 3, 0)
      break
    case "year":
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31)
      break
    default:
      // All time - go back 5 years
      start = new Date(now.getFullYear() - 5, 0, 1)
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

// ============================================================================
// EXECUTE
// ============================================================================

export async function executeAnalytics(
  input: AnalyticsInput,
  context: MCPToolContext
): Promise<MCPToolResponse> {
  const { supabase, userId } = context
  const { report, period, startDate, endDate, pipelineId, responseFormat } = input
  const dates = getPeriodDates(period, startDate, endDate)

  try {
    // Get user's accounts for finance queries
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)

    const accountIds = (accounts || []).map((a: any) => a.id)

    // ========================================================================
    // PROFIT & LOSS REPORT
    // ========================================================================
    if (report === "profitLoss") {
      if (accountIds.length === 0) {
        return {
          success: true,
          data: {
            summary: "No accounts found. Add accounts to see profit/loss data.",
            totalIncome: 0,
            totalExpenses: 0,
            netProfit: 0,
          },
        }
      }

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(`amount, date, categories(name, type, color)`)
        .in("account_id", accountIds)
        .gte("date", dates.start)
        .lte("date", dates.end)

      if (error) throw new Error(error.message)

      let totalIncome = 0
      let totalExpenses = 0
      const incomeByCategory: Record<string, number> = {}
      const expensesByCategory: Record<string, number> = {}

      for (const tx of transactions || []) {
        const category = tx.categories as any
        const amount = Math.abs(tx.amount)
        const catName = category?.name || "Uncategorized"

        if (category?.type === "income" || tx.amount > 0) {
          totalIncome += amount
          incomeByCategory[catName] = (incomeByCategory[catName] || 0) + amount
        } else {
          totalExpenses += amount
          expensesByCategory[catName] = (expensesByCategory[catName] || 0) + amount
        }
      }

      const netProfit = totalIncome - totalExpenses
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

      if (responseFormat === "concise") {
        const topExpenses = Object.entries(expensesByCategory)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([cat, amt]) => `${cat}: ${formatCurrency(amt)}`)
          .join(", ")

        return {
          success: true,
          data: {
            summary: `P&L for ${dates.start} to ${dates.end}`,
            income: formatCurrency(totalIncome),
            expenses: formatCurrency(totalExpenses),
            netProfit: formatCurrency(netProfit),
            profitMargin: `${profitMargin.toFixed(1)}%`,
            topExpenses: topExpenses || "None",
          },
        }
      }

      return {
        success: true,
        data: {
          period: dates,
          totalIncome,
          totalExpenses,
          netProfit,
          profitMargin,
          incomeByCategory,
          expensesByCategory,
        },
      }
    }

    // ========================================================================
    // CASH FLOW REPORT
    // ========================================================================
    if (report === "cashFlow") {
      if (accountIds.length === 0) {
        return {
          success: true,
          data: {
            summary: "No accounts found. Add accounts to see cash flow data.",
            totalInflow: 0,
            totalOutflow: 0,
            netCashFlow: 0,
          },
        }
      }

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("amount, date")
        .in("account_id", accountIds)
        .gte("date", dates.start)
        .lte("date", dates.end)
        .order("date", { ascending: true })

      if (error) throw new Error(error.message)

      let totalInflow = 0
      let totalOutflow = 0
      const monthlyData: Record<string, { inflow: number; outflow: number }> = {}

      for (const tx of transactions || []) {
        const monthKey = tx.date.substring(0, 7) // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { inflow: 0, outflow: 0 }
        }

        if (tx.amount > 0) {
          totalInflow += tx.amount
          monthlyData[monthKey].inflow += tx.amount
        } else {
          totalOutflow += Math.abs(tx.amount)
          monthlyData[monthKey].outflow += Math.abs(tx.amount)
        }
      }

      const netCashFlow = totalInflow - totalOutflow
      const monthCount = Object.keys(monthlyData).length || 1

      if (responseFormat === "concise") {
        return {
          success: true,
          data: {
            summary: `Cash Flow for ${dates.start} to ${dates.end}`,
            inflow: formatCurrency(totalInflow),
            outflow: formatCurrency(totalOutflow),
            netFlow: formatCurrency(netCashFlow),
            avgMonthlyInflow: formatCurrency(totalInflow / monthCount),
            avgMonthlyOutflow: formatCurrency(totalOutflow / monthCount),
          },
        }
      }

      return {
        success: true,
        data: {
          period: dates,
          totalInflow,
          totalOutflow,
          netCashFlow,
          monthlyTrend: monthlyData,
        },
      }
    }

    // ========================================================================
    // BUDGET VS ACTUAL
    // ========================================================================
    if (report === "budgetVsActual") {
      // Get budgets
      const { data: budgets, error: budgetError } = await supabase
        .from("budgets")
        .select(`
          id, name, amount, period, spent,
          category:category_id(id, name, type, color)
        `)
        .eq("user_id", userId)

      if (budgetError) throw new Error(budgetError.message)

      if (!budgets || budgets.length === 0) {
        return {
          success: true,
          data: {
            summary: "No budgets found. Create budgets to track spending.",
          },
        }
      }

      const formatted = (budgets || []).map((b: any) => {
        const spent = b.spent || 0
        const remaining = b.amount - spent
        const utilization = b.amount > 0 ? (spent / b.amount) * 100 : 0
        const status = utilization >= 100 ? "over" : utilization >= 80 ? "warning" : "ok"

        return {
          name: b.name,
          category: b.category?.name || "General",
          budget: b.amount,
          spent,
          remaining,
          utilization,
          status,
        }
      })

      const totalBudget = formatted.reduce((sum, b) => sum + b.budget, 0)
      const totalSpent = formatted.reduce((sum, b) => sum + b.spent, 0)
      const overBudgetCount = formatted.filter((b) => b.status === "over").length

      if (responseFormat === "concise") {
        const lines = formatted.map((b) => {
          const icon = b.status === "over" ? "!" : b.status === "warning" ? "~" : "+"
          return `${icon} ${b.name}: ${formatCurrency(b.spent)}/${formatCurrency(b.budget)} (${b.utilization.toFixed(0)}%)`
        })

        return {
          success: true,
          data: {
            summary: `${budgets.length} budgets, ${overBudgetCount} over budget`,
            totalBudget: formatCurrency(totalBudget),
            totalSpent: formatCurrency(totalSpent),
            utilization: `${((totalSpent / totalBudget) * 100).toFixed(1)}%`,
            budgets: lines.join("\n"),
          },
        }
      }

      return { success: true, data: { budgets: formatted, totalBudget, totalSpent } }
    }

    // ========================================================================
    // KPIs
    // ========================================================================
    if (report === "kpis") {
      // Get profile for industry type
      const { data: profile } = await supabase
        .from("profiles")
        .select("industry_type")
        .eq("id", userId)
        .single()

      const industryType = profile?.industry_type || "general"

      // Calculate basic KPIs from transactions
      const { data: currentMonthTx } = await supabase
        .from("transactions")
        .select("amount")
        .in("account_id", accountIds)
        .gte("date", dates.start)
        .lte("date", dates.end)

      let income = 0
      let expenses = 0
      for (const tx of currentMonthTx || []) {
        if (tx.amount > 0) income += tx.amount
        else expenses += Math.abs(tx.amount)
      }

      const netProfit = income - expenses
      const profitMargin = income > 0 ? (netProfit / income) * 100 : 0

      // Get MRR from subscriptions for SaaS
      let mrr = 0
      if (industryType === "saas") {
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("amount, frequency")
          .eq("user_id", userId)
          .eq("is_active", true)

        const freqMultiplier: Record<string, number> = {
          monthly: 1,
          yearly: 1 / 12,
          quarterly: 1 / 3,
          weekly: 4.33,
        }

        for (const sub of subs || []) {
          mrr += Math.abs(sub.amount) * (freqMultiplier[sub.frequency] || 1)
        }
      }

      // Get deal metrics for pipeline KPIs
      const { data: deals } = await supabase
        .from("deals")
        .select("value, status, stage:pipeline_stages(win_probability)")
        .eq("profile_id", userId)
        .eq("status", "open")

      const openDeals = deals || []
      const totalPipelineValue = openDeals.reduce((sum, d: any) => sum + (d.value || 0), 0)
      const weightedPipeline = openDeals.reduce((sum, d: any) => {
        const prob = d.stage?.win_probability || 0
        return sum + (d.value || 0) * (prob / 100)
      }, 0)

      if (responseFormat === "concise") {
        const kpis: string[] = [
          `Revenue: ${formatCurrency(income)}`,
          `Expenses: ${formatCurrency(expenses)}`,
          `Net Profit: ${formatCurrency(netProfit)}`,
          `Profit Margin: ${profitMargin.toFixed(1)}%`,
        ]

        if (industryType === "saas" && mrr > 0) {
          kpis.push(`MRR: ${formatCurrency(mrr)}`)
          kpis.push(`ARR: ${formatCurrency(mrr * 12)}`)
        }

        if (totalPipelineValue > 0) {
          kpis.push(`Pipeline Value: ${formatCurrency(totalPipelineValue)}`)
          kpis.push(`Weighted Pipeline: ${formatCurrency(weightedPipeline)}`)
        }

        return {
          success: true,
          data: {
            summary: `KPIs for ${period} (${industryType} industry)`,
            kpis: kpis.join("\n"),
          },
        }
      }

      return {
        success: true,
        data: {
          period: dates,
          industryType,
          revenue: income,
          expenses,
          netProfit,
          profitMargin,
          mrr: industryType === "saas" ? mrr : undefined,
          arr: industryType === "saas" ? mrr * 12 : undefined,
          pipelineValue: totalPipelineValue,
          weightedPipeline,
        },
      }
    }

    // ========================================================================
    // DEALS PIPELINE
    // ========================================================================
    if (report === "dealsPipeline") {
      let pipelineQuery = supabase
        .from("pipelines")
        .select(`
          id, name, is_default,
          stages:pipeline_stages(
            id, name, position, win_probability
          )
        `)
        .eq("profile_id", userId)

      if (pipelineId) {
        pipelineQuery = pipelineQuery.eq("id", pipelineId)
      }

      const { data: pipelines, error: pipelineError } = await pipelineQuery

      if (pipelineError) throw new Error(pipelineError.message)

      if (!pipelines || pipelines.length === 0) {
        return {
          success: true,
          data: { summary: "No pipelines found. Create a pipeline to track deals." },
        }
      }

      // Get all open deals
      const { data: deals } = await supabase
        .from("deals")
        .select("id, name, value, stage_id, pipeline_id, status")
        .eq("profile_id", userId)
        .eq("status", "open")

      const pipelineStats = (pipelines || []).map((p: any) => {
        const pipelineDeals = (deals || []).filter((d: any) => d.pipeline_id === p.id)
        const stages = (p.stages || []).sort((a: any, b: any) => a.position - b.position)

        const stageStats = stages.map((stage: any) => {
          const stageDeals = pipelineDeals.filter((d: any) => d.stage_id === stage.id)
          const totalValue = stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
          const weightedValue = totalValue * (stage.win_probability / 100)

          return {
            name: stage.name,
            dealCount: stageDeals.length,
            totalValue,
            weightedValue,
            winProbability: stage.win_probability,
          }
        })

        const totalDeals = pipelineDeals.length
        const totalValue = pipelineDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
        const weightedTotal = stageStats.reduce((sum: number, s: any) => sum + s.weightedValue, 0)

        return {
          id: p.id,
          name: p.name,
          isDefault: p.is_default,
          totalDeals,
          totalValue,
          weightedTotal,
          stages: stageStats,
        }
      })

      if (responseFormat === "concise") {
        const lines = pipelineStats.flatMap((p) => {
          const header = `${p.name}: ${p.totalDeals} deals (${formatCurrency(p.totalValue)})`
          const stages = p.stages
            .filter((s: any) => s.dealCount > 0)
            .map((s: any) => `  - ${s.name}: ${s.dealCount} (${formatCurrency(s.totalValue)})`)
          return [header, ...stages]
        })

        return {
          success: true,
          data: {
            summary: `${pipelineStats.length} pipeline(s)`,
            totalDeals: pipelineStats.reduce((sum, p) => sum + p.totalDeals, 0),
            totalValue: formatCurrency(pipelineStats.reduce((sum, p) => sum + p.totalValue, 0)),
            weightedValue: formatCurrency(pipelineStats.reduce((sum, p) => sum + p.weightedTotal, 0)),
            breakdown: lines.join("\n"),
          },
        }
      }

      return { success: true, data: { pipelines: pipelineStats } }
    }

    // ========================================================================
    // SALES FORECAST
    // ========================================================================
    if (report === "salesForecast") {
      // Get open deals with stages
      const { data: deals, error } = await supabase
        .from("deals")
        .select(`
          id, name, value, expected_close_date, probability,
          stage:pipeline_stages(name, win_probability)
        `)
        .eq("profile_id", userId)
        .eq("status", "open")
        .order("expected_close_date", { ascending: true })

      if (error) throw new Error(error.message)

      const now = new Date()
      const thisMonth = now.toISOString().substring(0, 7)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().substring(0, 7)
      const nextQuarter = new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString().substring(0, 7)

      const forecast = {
        thisMonth: { count: 0, value: 0, weighted: 0 },
        nextMonth: { count: 0, value: 0, weighted: 0 },
        thisQuarter: { count: 0, value: 0, weighted: 0 },
        total: { count: 0, value: 0, weighted: 0 },
      }

      for (const deal of deals || []) {
        const d = deal as any
        const value = d.value || 0
        const prob = d.probability || d.stage?.win_probability || 0
        const weighted = value * (prob / 100)
        const closeMonth = d.expected_close_date?.substring(0, 7)

        forecast.total.count++
        forecast.total.value += value
        forecast.total.weighted += weighted

        if (closeMonth === thisMonth) {
          forecast.thisMonth.count++
          forecast.thisMonth.value += value
          forecast.thisMonth.weighted += weighted
        } else if (closeMonth === nextMonth) {
          forecast.nextMonth.count++
          forecast.nextMonth.value += value
          forecast.nextMonth.weighted += weighted
        }

        if (closeMonth && closeMonth < nextQuarter) {
          forecast.thisQuarter.count++
          forecast.thisQuarter.value += value
          forecast.thisQuarter.weighted += weighted
        }
      }

      if (responseFormat === "concise") {
        return {
          success: true,
          data: {
            summary: `Sales forecast based on ${forecast.total.count} open deals`,
            thisMonth: `${forecast.thisMonth.count} deals, ${formatCurrency(forecast.thisMonth.weighted)} weighted`,
            nextMonth: `${forecast.nextMonth.count} deals, ${formatCurrency(forecast.nextMonth.weighted)} weighted`,
            thisQuarter: `${forecast.thisQuarter.count} deals, ${formatCurrency(forecast.thisQuarter.weighted)} weighted`,
            totalPipeline: formatCurrency(forecast.total.value),
            weightedForecast: formatCurrency(forecast.total.weighted),
          },
        }
      }

      return { success: true, data: { forecast } }
    }

    // ========================================================================
    // OVERVIEW (General dashboard)
    // ========================================================================
    if (report === "overview") {
      // Quick stats from multiple sources
      const [transactionsResult, dealsResult, budgetsResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount")
          .in("account_id", accountIds)
          .gte("date", dates.start)
          .lte("date", dates.end),
        supabase
          .from("deals")
          .select("value, status")
          .eq("profile_id", userId),
        supabase
          .from("budgets")
          .select("amount, spent")
          .eq("user_id", userId),
      ])

      let income = 0
      let expenses = 0
      for (const tx of transactionsResult.data || []) {
        if (tx.amount > 0) income += tx.amount
        else expenses += Math.abs(tx.amount)
      }

      const openDeals = (dealsResult.data || []).filter((d: any) => d.status === "open")
      const wonDeals = (dealsResult.data || []).filter((d: any) => d.status === "won")
      const pipelineValue = openDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
      const wonValue = wonDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)

      const totalBudget = (budgetsResult.data || []).reduce((sum: number, b: any) => sum + (b.amount || 0), 0)
      const totalSpent = (budgetsResult.data || []).reduce((sum: number, b: any) => sum + (b.spent || 0), 0)

      if (responseFormat === "concise") {
        return {
          success: true,
          data: {
            summary: `Overview for ${period}`,
            finance: `Income: ${formatCurrency(income)} | Expenses: ${formatCurrency(expenses)} | Net: ${formatCurrency(income - expenses)}`,
            sales: `Pipeline: ${formatCurrency(pipelineValue)} (${openDeals.length} deals) | Won: ${formatCurrency(wonValue)}`,
            budgets: totalBudget > 0
              ? `${formatCurrency(totalSpent)}/${formatCurrency(totalBudget)} (${((totalSpent / totalBudget) * 100).toFixed(0)}%)`
              : "No budgets",
          },
        }
      }

      return {
        success: true,
        data: {
          period: dates,
          finance: { income, expenses, netProfit: income - expenses },
          sales: { openDeals: openDeals.length, pipelineValue, wonDeals: wonDeals.length, wonValue },
          budgets: { totalBudget, totalSpent, utilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0 },
        },
      }
    }

    return { success: false, error: `Unknown report type: ${report}` }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const analyticsToolDefinition = {
  name: "queryAnalytics",
  description:
    "Generate financial and sales analytics reports. Get profit/loss statements, cash flow analysis, budget tracking, KPIs, sales pipeline summaries, and forecasts.",
  schema: analyticsSchema,
  execute: executeAnalytics,
}

export type AnalyticsToolName = "queryAnalytics"

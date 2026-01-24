import { getSupabaseClient } from '@dreamteam/database/client'
import type {
  IndustryType,
  KPIMetric,
  KPIDashboardData,
  KPIInput,
} from '@dreamteam/database/types'

/**
 * Get the current period (month) boundaries
 */
function getCurrentPeriod(): { start: string; end: string; label: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  }
}

/**
 * Get previous period for comparison
 */
function getPreviousPeriod(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 0)
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

/**
 * Calculate percentage change between two values
 */
function calculateChange(current: number, previous: number): { change: number; percent: number; trend: 'up' | 'down' | 'neutral' } {
  const change = current - previous
  const percent = previous !== 0 ? (change / previous) * 100 : 0
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  return { change, percent, trend }
}

/**
 * Calculate SaaS-specific KPIs
 */
async function calculateSaaSKPIs(
  profileId: string,
  period: { start: string; end: string },
  previousPeriod: { start: string; end: string },
  manualInputs: KPIInput | null
): Promise<KPIMetric[]> {
  const supabase = getSupabaseClient()
  const metrics: KPIMetric[] = []

  // Get active subscriptions for MRR calculation
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('amount, frequency')
    .eq('user_id', profileId)
    .eq('is_active', true)

  // Calculate MRR from subscriptions
  const frequencyToMonthly: Record<string, number> = {
    daily: 30,
    weekly: 4.33,
    biweekly: 2.17,
    monthly: 1,
    quarterly: 0.33,
    yearly: 0.083,
  }

  let mrr = 0
  for (const sub of subscriptions || []) {
    mrr += Math.abs(sub.amount) * (frequencyToMonthly[sub.frequency] || 1)
  }

  // Get previous month's income for comparison
  const { data: prevIncome } = await supabase
    .from('transactions')
    .select('amount')
    .gt('amount', 0)
    .gte('date', previousPeriod.start)
    .lte('date', previousPeriod.end)

  const prevMrr = (prevIncome || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0) / 1 // Simplified

  const mrrChange = calculateChange(mrr, prevMrr)

  metrics.push({
    id: 'mrr',
    name: 'Monthly Recurring Revenue',
    value: mrr,
    previousValue: prevMrr,
    change: mrrChange.change,
    changePercent: mrrChange.percent,
    format: 'currency',
    trend: mrrChange.trend,
    isManualInput: false,
    description: 'Total monthly recurring revenue from all active subscriptions',
  })

  // ARR (Annual Recurring Revenue)
  const arr = mrr * 12
  metrics.push({
    id: 'arr',
    name: 'Annual Recurring Revenue',
    value: arr,
    format: 'currency',
    isManualInput: false,
    description: 'Projected annual revenue based on current MRR',
  })

  // Customer Count (manual input)
  metrics.push({
    id: 'customer_count',
    name: 'Total Customers',
    value: manualInputs?.customer_count ?? null,
    format: 'number',
    isManualInput: true,
    description: 'Total number of paying customers',
  })

  // Churn Rate (calculated from churned customers if provided)
  const churnedCustomers = manualInputs?.churned_customers ?? 0
  const customerCount = manualInputs?.customer_count ?? 0
  const churnRate = customerCount > 0 ? (churnedCustomers / customerCount) * 100 : null

  metrics.push({
    id: 'churn_rate',
    name: 'Monthly Churn Rate',
    value: churnRate,
    format: 'percent',
    isManualInput: true,
    trend: churnRate !== null ? (churnRate > 5 ? 'down' : 'up') : undefined,
    description: 'Percentage of customers lost this month',
  })

  // LTV (manual input)
  metrics.push({
    id: 'ltv',
    name: 'Customer Lifetime Value',
    value: manualInputs?.lifetime_value ?? null,
    format: 'currency',
    isManualInput: true,
    description: 'Average revenue per customer over their lifetime',
  })

  // CAC (manual input)
  metrics.push({
    id: 'cac',
    name: 'Customer Acquisition Cost',
    value: manualInputs?.customer_acquisition_cost ?? null,
    format: 'currency',
    isManualInput: true,
    description: 'Average cost to acquire a new customer',
  })

  // LTV:CAC Ratio (calculated if both are available)
  const ltv = manualInputs?.lifetime_value
  const cac = manualInputs?.customer_acquisition_cost
  const ltvCacRatio = ltv && cac && cac > 0 ? ltv / cac : null

  metrics.push({
    id: 'ltv_cac_ratio',
    name: 'LTV:CAC Ratio',
    value: ltvCacRatio,
    format: 'number',
    isManualInput: false,
    trend: ltvCacRatio !== null ? (ltvCacRatio >= 3 ? 'up' : 'down') : undefined,
    description: 'Ratio of customer value to acquisition cost (3:1 is healthy)',
  })

  return metrics
}

/**
 * Calculate Retail-specific KPIs
 */
async function calculateRetailKPIs(
  profileId: string,
  period: { start: string; end: string },
  previousPeriod: { start: string; end: string },
  manualInputs: KPIInput | null
): Promise<KPIMetric[]> {
  const supabase = getSupabaseClient()
  const metrics: KPIMetric[] = []

  // Get revenue (positive transactions)
  const { data: revenue } = await supabase
    .from('transactions')
    .select('amount')
    .gt('amount', 0)
    .gte('date', period.start)
    .lte('date', period.end)

  const totalRevenue = (revenue || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)

  // Get COGS (negative transactions, typically categorized as cost of goods)
  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount')
    .lt('amount', 0)
    .gte('date', period.start)
    .lte('date', period.end)

  const totalExpenses = Math.abs((expenses || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0))

  // Previous period for comparison
  const { data: prevRevenue } = await supabase
    .from('transactions')
    .select('amount')
    .gt('amount', 0)
    .gte('date', previousPeriod.start)
    .lte('date', previousPeriod.end)

  const prevTotalRevenue = (prevRevenue || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)
  const revenueChange = calculateChange(totalRevenue, prevTotalRevenue)

  metrics.push({
    id: 'revenue',
    name: 'Total Revenue',
    value: totalRevenue,
    previousValue: prevTotalRevenue,
    change: revenueChange.change,
    changePercent: revenueChange.percent,
    format: 'currency',
    trend: revenueChange.trend,
    isManualInput: false,
  })

  // Gross Margin
  const grossProfit = totalRevenue - totalExpenses
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  metrics.push({
    id: 'gross_margin',
    name: 'Gross Margin',
    value: grossMargin,
    format: 'percent',
    isManualInput: false,
    trend: grossMargin >= 30 ? 'up' : 'down',
    description: 'Revenue minus cost of goods sold as a percentage',
  })

  // COGS
  metrics.push({
    id: 'cogs',
    name: 'Cost of Goods Sold',
    value: totalExpenses,
    format: 'currency',
    isManualInput: false,
  })

  // Inventory Value (manual input)
  metrics.push({
    id: 'inventory_value',
    name: 'Inventory Value',
    value: manualInputs?.inventory_value ?? null,
    format: 'currency',
    isManualInput: true,
    description: 'Current value of inventory on hand',
  })

  // Units Sold (manual input)
  metrics.push({
    id: 'units_sold',
    name: 'Units Sold',
    value: manualInputs?.units_sold ?? null,
    format: 'number',
    isManualInput: true,
  })

  // Average Order Value
  const unitsSold = manualInputs?.units_sold
  const aov = unitsSold && unitsSold > 0 ? totalRevenue / unitsSold : null

  metrics.push({
    id: 'aov',
    name: 'Average Order Value',
    value: aov,
    format: 'currency',
    isManualInput: false,
    description: 'Average revenue per transaction',
  })

  // Inventory Turnover
  const inventoryValue = manualInputs?.inventory_value
  const inventoryTurnover = inventoryValue && inventoryValue > 0 
    ? totalExpenses / inventoryValue 
    : null

  metrics.push({
    id: 'inventory_turnover',
    name: 'Inventory Turnover',
    value: inventoryTurnover,
    format: 'number',
    isManualInput: false,
    description: 'How many times inventory is sold and replaced',
  })

  return metrics
}

/**
 * Calculate Service-specific KPIs
 */
async function calculateServiceKPIs(
  profileId: string,
  period: { start: string; end: string },
  previousPeriod: { start: string; end: string },
  manualInputs: KPIInput | null
): Promise<KPIMetric[]> {
  const supabase = getSupabaseClient()
  const metrics: KPIMetric[] = []

  // Get revenue
  const { data: revenue } = await supabase
    .from('transactions')
    .select('amount')
    .gt('amount', 0)
    .gte('date', period.start)
    .lte('date', period.end)

  const totalRevenue = (revenue || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)
  const projectCount = revenue?.length || 0

  // Previous period
  const { data: prevRevenue } = await supabase
    .from('transactions')
    .select('amount')
    .gt('amount', 0)
    .gte('date', previousPeriod.start)
    .lte('date', previousPeriod.end)

  const prevTotalRevenue = (prevRevenue || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)
  const revenueChange = calculateChange(totalRevenue, prevTotalRevenue)

  metrics.push({
    id: 'revenue',
    name: 'Total Revenue',
    value: totalRevenue,
    previousValue: prevTotalRevenue,
    change: revenueChange.change,
    changePercent: revenueChange.percent,
    format: 'currency',
    trend: revenueChange.trend,
    isManualInput: false,
  })

  // Average Project Value
  const avgProjectValue = projectCount > 0 ? totalRevenue / projectCount : 0

  metrics.push({
    id: 'avg_project_value',
    name: 'Avg Project Value',
    value: avgProjectValue,
    format: 'currency',
    isManualInput: false,
    description: 'Average revenue per project/engagement',
  })

  // Billable Hours (manual input)
  metrics.push({
    id: 'billable_hours',
    name: 'Billable Hours',
    value: manualInputs?.billable_hours ?? null,
    format: 'number',
    isManualInput: true,
  })

  // Employee Count (manual input)
  metrics.push({
    id: 'employee_count',
    name: 'Team Size',
    value: manualInputs?.employee_count ?? null,
    format: 'number',
    isManualInput: true,
  })

  // Revenue per Employee
  const employeeCount = manualInputs?.employee_count
  const revenuePerEmployee = employeeCount && employeeCount > 0 
    ? totalRevenue / employeeCount 
    : null

  metrics.push({
    id: 'revenue_per_employee',
    name: 'Revenue per Employee',
    value: revenuePerEmployee,
    format: 'currency',
    isManualInput: false,
  })

  // Utilization Rate
  const billableHours = manualInputs?.billable_hours
  const utilizationTarget = manualInputs?.utilization_target ?? 80 // Default 80%
  const availableHours = employeeCount ? employeeCount * 160 : null // 160 hours/month per person
  const utilizationRate = billableHours && availableHours && availableHours > 0
    ? (billableHours / availableHours) * 100
    : null

  metrics.push({
    id: 'utilization_rate',
    name: 'Utilization Rate',
    value: utilizationRate,
    format: 'percent',
    isManualInput: false,
    trend: utilizationRate !== null 
      ? (utilizationRate >= utilizationTarget ? 'up' : 'down') 
      : undefined,
    description: `Billable hours vs available hours (target: ${utilizationTarget}%)`,
  })

  // Effective Hourly Rate
  const effectiveRate = billableHours && billableHours > 0 
    ? totalRevenue / billableHours 
    : null

  metrics.push({
    id: 'effective_hourly_rate',
    name: 'Effective Hourly Rate',
    value: effectiveRate,
    format: 'currency',
    isManualInput: false,
    description: 'Revenue divided by billable hours',
  })

  return metrics
}

/**
 * Calculate General KPIs (basic metrics for any business)
 */
async function calculateGeneralKPIs(
  profileId: string,
  period: { start: string; end: string },
  previousPeriod: { start: string; end: string }
): Promise<KPIMetric[]> {
  const supabase = getSupabaseClient()
  const metrics: KPIMetric[] = []

  // Get income
  const { data: income } = await supabase
    .from('transactions')
    .select('amount')
    .gt('amount', 0)
    .gte('date', period.start)
    .lte('date', period.end)

  const totalIncome = (income || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)

  // Get expenses
  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount')
    .lt('amount', 0)
    .gte('date', period.start)
    .lte('date', period.end)

  const totalExpenses = Math.abs((expenses || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0))

  // Previous period
  const { data: prevIncome } = await supabase
    .from('transactions')
    .select('amount')
    .gt('amount', 0)
    .gte('date', previousPeriod.start)
    .lte('date', previousPeriod.end)

  const prevTotalIncome = (prevIncome || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)
  const incomeChange = calculateChange(totalIncome, prevTotalIncome)

  metrics.push({
    id: 'income',
    name: 'Total Income',
    value: totalIncome,
    previousValue: prevTotalIncome,
    change: incomeChange.change,
    changePercent: incomeChange.percent,
    format: 'currency',
    trend: incomeChange.trend,
    isManualInput: false,
  })

  metrics.push({
    id: 'expenses',
    name: 'Total Expenses',
    value: totalExpenses,
    format: 'currency',
    isManualInput: false,
  })

  const netProfit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

  metrics.push({
    id: 'net_profit',
    name: 'Net Profit',
    value: netProfit,
    format: 'currency',
    trend: netProfit >= 0 ? 'up' : 'down',
    isManualInput: false,
  })

  metrics.push({
    id: 'profit_margin',
    name: 'Profit Margin',
    value: profitMargin,
    format: 'percent',
    trend: profitMargin >= 10 ? 'up' : 'down',
    isManualInput: false,
  })

  return metrics
}

/**
 * Main function to get KPI dashboard data
 */
export async function getKPIDashboardData(profileId: string): Promise<KPIDashboardData> {
  const supabase = getSupabaseClient()
  
  // Get user's industry type
  const { data: profile } = await supabase
    .from('profiles')
    .select('industry_type')
    .eq('id', profileId)
    .single()

  const industryType: IndustryType = profile?.industry_type || 'general'
  const period = getCurrentPeriod()
  const previousPeriod = getPreviousPeriod()

  // Get manual inputs for this period
  const { data: manualInputs } = await supabase
    .from('kpi_inputs')
    .select('*')
    .eq('profile_id', profileId)
    .eq('period_start', period.start)
    .eq('period_end', period.end)
    .single()

  let metrics: KPIMetric[]

  switch (industryType) {
    case 'saas':
      metrics = await calculateSaaSKPIs(profileId, period, previousPeriod, manualInputs)
      break
    case 'retail':
      metrics = await calculateRetailKPIs(profileId, period, previousPeriod, manualInputs)
      break
    case 'service':
      metrics = await calculateServiceKPIs(profileId, period, previousPeriod, manualInputs)
      break
    default:
      metrics = await calculateGeneralKPIs(profileId, period, previousPeriod)
  }

  // Get MRR/Revenue trend for the last 6 months
  const trends: { label: string; value: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    const { data: monthRevenue } = await supabase
      .from('transactions')
      .select('amount')
      .gt('amount', 0)
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', monthEnd.toISOString().split('T')[0])

    trends.push({
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      value: (monthRevenue || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0),
    })
  }

  return {
    industryType,
    period,
    metrics,
    trends,
    manualInputs,
  }
}


import { z } from 'zod'
import { getSupabase } from '../../auth.js'
import {
  paginationSchema,
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Profile ID schema for user-scoped tools
const profileIdSchema = z.object({
  profile_id: z.string().uuid().describe('The user profile ID'),
})

// Industry type enum
const industrySchema = z.enum(['saas', 'retail', 'service']).optional()

// Tool definitions for KPIs
export const kpiTools = {
  kpi_list: {
    description: 'List KPI inputs for a user',
    inputSchema: profileIdSchema.merge(paginationSchema).extend({
      industry: industrySchema.describe('Filter by industry type'),
      period: z.string().optional().describe('Filter by period (YYYY-MM format)'),
    }),
    handler: kpiList,
  },

  kpi_get: {
    description: 'Get a specific KPI input record',
    inputSchema: profileIdSchema.extend({
      kpi_id: z.string().uuid().describe('The KPI input ID'),
    }),
    handler: kpiGet,
  },

  kpi_record: {
    description: 'Record a new KPI input for a period',
    inputSchema: profileIdSchema.extend({
      period_start: z.string().describe('Period start date (YYYY-MM-DD)'),
      period_end: z.string().describe('Period end date (YYYY-MM-DD)'),
      revenue: z.number().optional().describe('Revenue for the period'),
      expenses: z.number().optional().describe('Expenses for the period'),
      // SaaS metrics
      customer_count: z.number().int().optional().describe('Total active customers (SaaS)'),
      customer_acquisition_cost: z.number().optional().describe('CAC - Cost per new customer (SaaS)'),
      lifetime_value: z.number().optional().describe('LTV - Customer lifetime value (SaaS)'),
      churned_customers: z.number().int().optional().describe('Customers churned this period (SaaS)'),
      // Retail metrics
      inventory_value: z.number().optional().describe('Total inventory value (Retail)'),
      units_sold: z.number().int().optional().describe('Units sold this period (Retail)'),
      // Service metrics
      billable_hours: z.number().optional().describe('Billable hours this period (Service)'),
      employee_count: z.number().int().optional().describe('Total employees (Service)'),
      utilization_target: z.number().optional().describe('Target utilization percentage (Service)'),
    }),
    handler: kpiRecord,
  },

  kpi_update: {
    description: 'Update a KPI input record',
    inputSchema: profileIdSchema.extend({
      kpi_id: z.string().uuid().describe('The KPI input ID'),
      revenue: z.number().optional().describe('Revenue for the period'),
      expenses: z.number().optional().describe('Expenses for the period'),
      customer_count: z.number().int().optional().describe('Total active customers'),
      customer_acquisition_cost: z.number().optional().describe('CAC'),
      lifetime_value: z.number().optional().describe('LTV'),
      churned_customers: z.number().int().optional().describe('Customers churned'),
      inventory_value: z.number().optional().describe('Inventory value'),
      units_sold: z.number().int().optional().describe('Units sold'),
      billable_hours: z.number().optional().describe('Billable hours'),
      employee_count: z.number().int().optional().describe('Employee count'),
      utilization_target: z.number().optional().describe('Utilization target'),
    }),
    handler: kpiUpdate,
  },

  kpi_delete: {
    description: 'Delete a KPI input record',
    inputSchema: profileIdSchema.extend({
      kpi_id: z.string().uuid().describe('The KPI input ID to delete'),
    }),
    handler: kpiDelete,
  },

  kpi_get_trends: {
    description: 'Get KPI trends over time',
    inputSchema: profileIdSchema.extend({
      metric_name: z.string().describe('The metric to track (e.g., revenue, customer_count)'),
      periods: z.number().int().positive().default(6).describe('Number of periods to include'),
    }),
    handler: kpiGetTrends,
  },

  kpi_get_saas_metrics: {
    description: 'Get calculated SaaS metrics (MRR, churn rate, LTV/CAC ratio)',
    inputSchema: profileIdSchema,
    handler: kpiGetSaasMetrics,
  },

  kpi_get_retail_metrics: {
    description: 'Get calculated Retail metrics (inventory turnover, avg sale value)',
    inputSchema: profileIdSchema,
    handler: kpiGetRetailMetrics,
  },

  kpi_get_service_metrics: {
    description: 'Get calculated Service metrics (utilization rate, revenue per employee)',
    inputSchema: profileIdSchema,
    handler: kpiGetServiceMetrics,
  },
}

// Handler implementations

async function kpiList(params: {
  profile_id: string
  industry?: string
  period?: string
  limit?: number
  offset?: number
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    let query = supabase
      .from('kpi_inputs')
      .select('*')
      .eq('profile_id', params.profile_id)
      .order('period_end', { ascending: false })

    if (params.period) {
      // Filter by period (YYYY-MM format matches period_start)
      query = query.gte('period_start', `${params.period}-01`)
      query = query.lt('period_start', `${params.period}-32`)
    }

    if (params.limit) {
      query = query.limit(params.limit)
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return error(`Database error: ${dbError.message}`)
    }

    return success({
      kpi_inputs: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list KPI inputs: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function kpiGet(params: {
  profile_id: string
  kpi_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('kpi_inputs')
      .select('*')
      .eq('id', params.kpi_id)
      .eq('profile_id', params.profile_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('KPI input not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`)
    }

    return success(data)
  } catch (err) {
    return error(`Failed to get KPI input: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function kpiRecord(params: {
  profile_id: string
  period_start: string
  period_end: string
  revenue?: number
  expenses?: number
  customer_count?: number
  customer_acquisition_cost?: number
  lifetime_value?: number
  churned_customers?: number
  inventory_value?: number
  units_sold?: number
  billable_hours?: number
  employee_count?: number
  utilization_target?: number
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const insertData: Record<string, unknown> = {
      profile_id: params.profile_id,
      period_start: params.period_start,
      period_end: params.period_end,
    }

    // Add optional fields
    if (params.revenue !== undefined) insertData.revenue = params.revenue
    if (params.expenses !== undefined) insertData.expenses = params.expenses
    if (params.customer_count !== undefined) insertData.customer_count = params.customer_count
    if (params.customer_acquisition_cost !== undefined) insertData.customer_acquisition_cost = params.customer_acquisition_cost
    if (params.lifetime_value !== undefined) insertData.lifetime_value = params.lifetime_value
    if (params.churned_customers !== undefined) insertData.churned_customers = params.churned_customers
    if (params.inventory_value !== undefined) insertData.inventory_value = params.inventory_value
    if (params.units_sold !== undefined) insertData.units_sold = params.units_sold
    if (params.billable_hours !== undefined) insertData.billable_hours = params.billable_hours
    if (params.employee_count !== undefined) insertData.employee_count = params.employee_count
    if (params.utilization_target !== undefined) insertData.utilization_target = params.utilization_target

    const { data, error: dbError } = await supabase
      .from('kpi_inputs')
      .insert(insertData)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to record KPI: ${dbError.message}`)
    }

    return success({
      message: 'KPI recorded successfully',
      kpi: data,
    })
  } catch (err) {
    return error(`Failed to record KPI: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function kpiUpdate(params: {
  profile_id: string
  kpi_id: string
  [key: string]: unknown
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Verify KPI belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('kpi_inputs')
      .select('id')
      .eq('id', params.kpi_id)
      .eq('profile_id', params.profile_id)
      .single()

    if (getError || !existing) {
      return error('KPI input not found')
    }

    const updateFields = [
      'revenue', 'expenses', 'customer_count', 'customer_acquisition_cost',
      'lifetime_value', 'churned_customers', 'inventory_value', 'units_sold',
      'billable_hours', 'employee_count', 'utilization_target'
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of updateFields) {
      if (params[field] !== undefined) {
        updateData[field] = params[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update')
    }

    const { data, error: dbError } = await supabase
      .from('kpi_inputs')
      .update(updateData)
      .eq('id', params.kpi_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update KPI: ${dbError.message}`)
    }

    return success({
      message: 'KPI updated successfully',
      kpi: data,
    })
  } catch (err) {
    return error(`Failed to update KPI: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function kpiDelete(params: {
  profile_id: string
  kpi_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Verify KPI belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('kpi_inputs')
      .select('id')
      .eq('id', params.kpi_id)
      .eq('profile_id', params.profile_id)
      .single()

    if (getError || !existing) {
      return error('KPI input not found')
    }

    const { error: dbError } = await supabase
      .from('kpi_inputs')
      .delete()
      .eq('id', params.kpi_id)

    if (dbError) {
      return error(`Failed to delete KPI: ${dbError.message}`)
    }

    return success({
      message: 'KPI deleted successfully',
      kpi_id: params.kpi_id,
    })
  } catch (err) {
    return error(`Failed to delete KPI: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function kpiGetTrends(params: {
  profile_id: string
  metric_name: string
  periods?: number
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()
    const limit = params.periods || 6

    const { data, error: dbError } = await supabase
      .from('kpi_inputs')
      .select('*')
      .eq('profile_id', params.profile_id)
      .order('period_end', { ascending: false })
      .limit(limit)

    if (dbError) {
      return error(`Database error: ${dbError.message}`)
    }

    if (!data || data.length === 0) {
      return success({
        message: 'No KPI data found',
        trends: [],
      })
    }

    // Extract the metric values over time
    const trends = data
      .reverse() // Oldest to newest
      .map(kpi => ({
        period_start: kpi.period_start,
        period_end: kpi.period_end,
        value: kpi[params.metric_name as keyof typeof kpi],
      }))
      .filter(t => t.value !== null && t.value !== undefined)

    // Calculate growth rates
    const withGrowth = trends.map((t, i) => {
      if (i === 0) return { ...t, growth_rate: null }
      const prev = trends[i - 1].value as number
      const curr = t.value as number
      const growthRate = prev > 0 ? ((curr - prev) / prev) * 100 : 0
      return { ...t, growth_rate: Math.round(growthRate * 100) / 100 }
    })

    // Calculate summary stats
    const values = trends.map(t => t.value as number).filter(v => typeof v === 'number')
    const summary = values.length > 0 ? {
      latest: values[values.length - 1],
      earliest: values[0],
      min: Math.min(...values),
      max: Math.max(...values),
      average: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      total_growth_rate: values[0] > 0
        ? Math.round(((values[values.length - 1] - values[0]) / values[0]) * 10000) / 100
        : 0,
    } : null

    return success({
      metric: params.metric_name,
      periods: withGrowth,
      summary,
    })
  } catch (err) {
    return error(`Failed to get KPI trends: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function kpiGetSaasMetrics(params: {
  profile_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Get the latest and previous KPI records
    const { data, error: dbError } = await supabase
      .from('kpi_inputs')
      .select('*')
      .eq('profile_id', params.profile_id)
      .order('period_end', { ascending: false })
      .limit(2)

    if (dbError) {
      return error(`Database error: ${dbError.message}`)
    }

    if (!data || data.length === 0) {
      return success({
        message: 'No KPI data found. Record some metrics first.',
        metrics: null,
      })
    }

    const latest = data[0]
    const previous = data.length > 1 ? data[1] : null

    // Calculate SaaS metrics
    const metrics: Record<string, unknown> = {
      period: {
        start: latest.period_start,
        end: latest.period_end,
      },
    }

    // MRR (if revenue is available)
    if (latest.revenue !== null) {
      metrics.mrr = latest.revenue
      metrics.arr = latest.revenue * 12
    }

    // Customer metrics
    if (latest.customer_count !== null) {
      metrics.total_customers = latest.customer_count

      // Churn rate
      if (latest.churned_customers !== null && previous?.customer_count !== null) {
        const startingCustomers = previous.customer_count
        if (startingCustomers > 0) {
          metrics.churn_rate = `${Math.round((latest.churned_customers / startingCustomers) * 10000) / 100}%`
          metrics.retention_rate = `${Math.round((1 - latest.churned_customers / startingCustomers) * 10000) / 100}%`
        }
      }

      // ARPU (Average Revenue Per User)
      if (latest.revenue !== null && latest.customer_count > 0) {
        metrics.arpu = Math.round((latest.revenue / latest.customer_count) * 100) / 100
      }
    }

    // LTV/CAC ratio
    if (latest.lifetime_value !== null && latest.customer_acquisition_cost !== null && latest.customer_acquisition_cost > 0) {
      metrics.ltv_cac_ratio = Math.round((latest.lifetime_value / latest.customer_acquisition_cost) * 100) / 100
      metrics.cac_payback_months = latest.revenue && latest.customer_count
        ? Math.round((latest.customer_acquisition_cost / (latest.revenue / latest.customer_count)) * 10) / 10
        : null
    }

    // Customer growth
    if (previous?.customer_count !== null && latest.customer_count !== null) {
      const growth = latest.customer_count - previous.customer_count
      metrics.customer_growth = growth
      metrics.customer_growth_rate = previous.customer_count > 0
        ? `${Math.round((growth / previous.customer_count) * 10000) / 100}%`
        : 'N/A'
    }

    return success({
      message: 'SaaS metrics calculated',
      metrics,
    })
  } catch (err) {
    return error(`Failed to get SaaS metrics: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function kpiGetRetailMetrics(params: {
  profile_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Get the latest and previous KPI records
    const { data, error: dbError } = await supabase
      .from('kpi_inputs')
      .select('*')
      .eq('profile_id', params.profile_id)
      .order('period_end', { ascending: false })
      .limit(2)

    if (dbError) {
      return error(`Database error: ${dbError.message}`)
    }

    if (!data || data.length === 0) {
      return success({
        message: 'No KPI data found. Record some metrics first.',
        metrics: null,
      })
    }

    const latest = data[0]

    const metrics: Record<string, unknown> = {
      period: {
        start: latest.period_start,
        end: latest.period_end,
      },
    }

    // Average Sale Value
    if (latest.revenue !== null && latest.units_sold !== null && latest.units_sold > 0) {
      metrics.average_sale_value = Math.round((latest.revenue / latest.units_sold) * 100) / 100
    }

    // Inventory metrics
    if (latest.inventory_value !== null) {
      metrics.inventory_value = latest.inventory_value

      // Inventory turnover (cost of goods sold / average inventory)
      // Using revenue as proxy for COGS
      if (latest.revenue !== null && latest.inventory_value > 0) {
        metrics.inventory_turnover = Math.round((latest.revenue / latest.inventory_value) * 100) / 100
        // Days inventory outstanding
        metrics.days_inventory_outstanding = Math.round((latest.inventory_value / latest.revenue) * 30 * 10) / 10
      }
    }

    // Gross margin (if we have expenses)
    if (latest.revenue !== null && latest.expenses !== null) {
      const grossProfit = latest.revenue - latest.expenses
      metrics.gross_profit = grossProfit
      metrics.gross_margin = `${Math.round((grossProfit / latest.revenue) * 10000) / 100}%`
    }

    // Units metrics
    if (latest.units_sold !== null) {
      metrics.units_sold = latest.units_sold
    }

    return success({
      message: 'Retail metrics calculated',
      metrics,
    })
  } catch (err) {
    return error(`Failed to get Retail metrics: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function kpiGetServiceMetrics(params: {
  profile_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Get the latest KPI record
    const { data, error: dbError } = await supabase
      .from('kpi_inputs')
      .select('*')
      .eq('profile_id', params.profile_id)
      .order('period_end', { ascending: false })
      .limit(1)

    if (dbError) {
      return error(`Database error: ${dbError.message}`)
    }

    if (!data || data.length === 0) {
      return success({
        message: 'No KPI data found. Record some metrics first.',
        metrics: null,
      })
    }

    const latest = data[0]

    const metrics: Record<string, unknown> = {
      period: {
        start: latest.period_start,
        end: latest.period_end,
      },
    }

    // Revenue per employee
    if (latest.revenue !== null && latest.employee_count !== null && latest.employee_count > 0) {
      metrics.revenue_per_employee = Math.round((latest.revenue / latest.employee_count) * 100) / 100
      metrics.annualized_revenue_per_employee = Math.round((latest.revenue * 12 / latest.employee_count) * 100) / 100
    }

    // Utilization rate
    if (latest.billable_hours !== null && latest.employee_count !== null && latest.employee_count > 0) {
      // Assume 160 available hours per employee per month (40 hrs/week * 4 weeks)
      const availableHours = latest.employee_count * 160
      const utilization = (latest.billable_hours / availableHours) * 100
      metrics.utilization_rate = `${Math.round(utilization * 100) / 100}%`
      metrics.billable_hours = latest.billable_hours
      metrics.available_hours = availableHours

      // Compare to target
      if (latest.utilization_target !== null) {
        metrics.utilization_target = `${latest.utilization_target}%`
        metrics.utilization_gap = `${Math.round((utilization - latest.utilization_target) * 100) / 100}%`
        metrics.meets_target = utilization >= latest.utilization_target
      }
    }

    // Effective hourly rate
    if (latest.revenue !== null && latest.billable_hours !== null && latest.billable_hours > 0) {
      metrics.effective_hourly_rate = Math.round((latest.revenue / latest.billable_hours) * 100) / 100
    }

    // Profit metrics
    if (latest.revenue !== null && latest.expenses !== null) {
      const profit = latest.revenue - latest.expenses
      metrics.profit = profit
      metrics.profit_margin = `${Math.round((profit / latest.revenue) * 10000) / 100}%`

      if (latest.employee_count !== null && latest.employee_count > 0) {
        metrics.profit_per_employee = Math.round((profit / latest.employee_count) * 100) / 100
      }
    }

    return success({
      message: 'Service metrics calculated',
      metrics,
    })
  } catch (err) {
    return error(`Failed to get Service metrics: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

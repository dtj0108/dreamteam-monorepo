import { z } from 'zod'
import { getSupabase } from '../../auth.js'
import {
  success,
  error,
  type ToolResult,
} from '../../types.js'

// Profile ID schema for user-scoped tools
const profileIdSchema = z.object({
  profile_id: z.string().uuid().describe('The user profile ID'),
})

// Exit type enum
const exitTypeSchema = z.enum(['acquisition', 'ipo', 'merger', 'liquidation', 'other']).optional()

// Tool definitions for exit plans
export const exitPlanTools = {
  exit_plan_get: {
    description: 'Get the exit plan for a user (each user has one exit plan)',
    inputSchema: profileIdSchema,
    handler: exitPlanGet,
  },

  exit_plan_create: {
    description: 'Create an exit plan',
    inputSchema: profileIdSchema.extend({
      target_valuation: z.number().positive().describe('Target valuation amount'),
      target_date: z.string().describe('Target exit date (YYYY-MM-DD)'),
      exit_type: exitTypeSchema.describe('Type of exit (acquisition, ipo, merger, liquidation, other)'),
      notes: z.string().optional().describe('Additional notes'),
    }),
    handler: exitPlanCreate,
  },

  exit_plan_update: {
    description: 'Update the exit plan',
    inputSchema: profileIdSchema.extend({
      target_valuation: z.number().positive().optional().describe('Target valuation amount'),
      current_valuation: z.number().positive().optional().describe('Current valuation estimate'),
      target_multiple: z.number().positive().optional().describe('Target revenue multiple'),
      target_runway: z.number().int().positive().optional().describe('Target runway in months'),
      target_date: z.string().optional().describe('Target exit date'),
      exit_type: exitTypeSchema.describe('Type of exit'),
      notes: z.string().optional().describe('Additional notes'),
    }),
    handler: exitPlanUpdate,
  },

  exit_plan_delete: {
    description: 'Delete the exit plan',
    inputSchema: profileIdSchema,
    handler: exitPlanDelete,
  },

  exit_plan_get_scenarios: {
    description: 'Get exit scenarios based on current metrics',
    inputSchema: profileIdSchema,
    handler: exitPlanGetScenarios,
  },
}

// Handler implementations

async function exitPlanGet(params: {
  profile_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('exit_plans')
      .select('*')
      .eq('profile_id', params.profile_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return success({
          message: 'No exit plan found',
          exit_plan: null,
        })
      }
      return error(`Database error: ${dbError.message}`)
    }

    // Calculate progress if both target and current valuation exist
    let progressPercent = 0
    if (data.target_valuation && data.current_valuation) {
      progressPercent = Math.round((data.current_valuation / data.target_valuation) * 100)
    }

    // Calculate days until target date
    let daysRemaining = null
    if (data.target_exit_date) {
      const targetDate = new Date(data.target_exit_date)
      const today = new Date()
      daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }

    return success({
      ...data,
      progress_percent: progressPercent,
      days_remaining: daysRemaining,
    })
  } catch (err) {
    return error(`Failed to get exit plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function exitPlanCreate(params: {
  profile_id: string
  target_valuation: number
  target_date: string
  exit_type?: string
  notes?: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Check if exit plan already exists
    const { data: existing } = await supabase
      .from('exit_plans')
      .select('id')
      .eq('profile_id', params.profile_id)
      .single()

    if (existing) {
      return error('Exit plan already exists. Use update to modify it.')
    }

    const { data, error: dbError } = await supabase
      .from('exit_plans')
      .insert({
        profile_id: params.profile_id,
        target_valuation: params.target_valuation,
        target_exit_date: params.target_date,
        notes: params.notes || null,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create exit plan: ${dbError.message}`)
    }

    return success({
      message: 'Exit plan created successfully',
      exit_plan: data,
    })
  } catch (err) {
    return error(`Failed to create exit plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function exitPlanUpdate(params: {
  profile_id: string
  target_valuation?: number
  current_valuation?: number
  target_multiple?: number
  target_runway?: number
  target_date?: string
  exit_type?: string
  notes?: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Verify exit plan exists
    const { data: existing, error: getError } = await supabase
      .from('exit_plans')
      .select('id')
      .eq('profile_id', params.profile_id)
      .single()

    if (getError || !existing) {
      return error('Exit plan not found. Create one first.')
    }

    const updateData: Record<string, unknown> = {}
    if (params.target_valuation !== undefined) updateData.target_valuation = params.target_valuation
    if (params.current_valuation !== undefined) updateData.current_valuation = params.current_valuation
    if (params.target_multiple !== undefined) updateData.target_multiple = params.target_multiple
    if (params.target_runway !== undefined) updateData.target_runway = params.target_runway
    if (params.target_date !== undefined) updateData.target_exit_date = params.target_date
    if (params.notes !== undefined) updateData.notes = params.notes

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update')
    }

    const { data, error: dbError } = await supabase
      .from('exit_plans')
      .update(updateData)
      .eq('profile_id', params.profile_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update exit plan: ${dbError.message}`)
    }

    return success({
      message: 'Exit plan updated successfully',
      exit_plan: data,
    })
  } catch (err) {
    return error(`Failed to update exit plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function exitPlanDelete(params: {
  profile_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const { error: dbError } = await supabase
      .from('exit_plans')
      .delete()
      .eq('profile_id', params.profile_id)

    if (dbError) {
      return error(`Failed to delete exit plan: ${dbError.message}`)
    }

    return success({
      message: 'Exit plan deleted successfully',
    })
  } catch (err) {
    return error(`Failed to delete exit plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function exitPlanGetScenarios(params: {
  profile_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Get exit plan
    const { data: exitPlan, error: exitError } = await supabase
      .from('exit_plans')
      .select('*')
      .eq('profile_id', params.profile_id)
      .single()

    if (exitError || !exitPlan) {
      return success({
        message: 'No exit plan exists yet. Create one first to get scenarios.',
        exit_plan: null,
        revenue_multiples: [],
        runway_analysis: null,
      })
    }

    // Get latest KPI inputs for revenue calculation
    const { data: kpiInputs } = await supabase
      .from('kpi_inputs')
      .select('*')
      .eq('profile_id', params.profile_id)
      .order('period_end', { ascending: false })
      .limit(1)

    // Calculate scenarios based on different multiples
    const scenarios = []
    const multiples = [2, 3, 5, 7, 10]

    // Get annual revenue estimate if available
    const monthlyRevenue = kpiInputs?.[0]?.revenue || 0
    const annualRevenue = monthlyRevenue * 12

    if (annualRevenue > 0) {
      for (const multiple of multiples) {
        const valuation = annualRevenue * multiple
        const gap = exitPlan.target_valuation - valuation
        const achieves_target = valuation >= exitPlan.target_valuation

        scenarios.push({
          multiple,
          annual_revenue: annualRevenue,
          implied_valuation: valuation,
          gap_to_target: gap,
          achieves_target,
        })
      }
    }

    // Calculate runway scenario if current_valuation exists
    let runwayAnalysis = null
    if (exitPlan.current_valuation && exitPlan.target_valuation) {
      const growthNeeded = exitPlan.target_valuation / exitPlan.current_valuation
      const targetDate = new Date(exitPlan.target_exit_date)
      const today = new Date()
      const monthsRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30))

      // Monthly growth rate needed to hit target
      const monthlyGrowthRate = monthsRemaining > 0
        ? (Math.pow(growthNeeded, 1 / monthsRemaining) - 1) * 100
        : 0

      runwayAnalysis = {
        current_valuation: exitPlan.current_valuation,
        target_valuation: exitPlan.target_valuation,
        growth_multiple_needed: growthNeeded.toFixed(2),
        months_remaining: monthsRemaining,
        monthly_growth_rate_needed: `${monthlyGrowthRate.toFixed(2)}%`,
      }
    }

    return success({
      exit_plan: {
        target_valuation: exitPlan.target_valuation,
        target_date: exitPlan.target_exit_date,
        current_valuation: exitPlan.current_valuation,
      },
      revenue_multiples: scenarios.length > 0 ? scenarios : 'No revenue data available for multiple scenarios',
      runway_analysis: runwayAnalysis || 'Set current_valuation to get runway analysis',
    })
  } catch (err) {
    return error(`Failed to get exit scenarios: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

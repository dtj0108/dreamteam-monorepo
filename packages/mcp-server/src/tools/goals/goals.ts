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

// Goal type enum
const goalTypeSchema = z.enum(['revenue', 'profit', 'valuation', 'runway', 'revenue_multiple'])

// Tool definitions for goals
export const goalTools = {
  goal_list: {
    description: 'List all goals for a user',
    inputSchema: profileIdSchema.merge(paginationSchema).extend({
      type: goalTypeSchema.optional().describe('Filter by goal type'),
    }),
    handler: goalList,
  },

  goal_get: {
    description: 'Get a single goal with progress',
    inputSchema: profileIdSchema.extend({
      goal_id: z.string().uuid().describe('The goal ID'),
    }),
    handler: goalGet,
  },

  goal_create: {
    description: 'Create a new goal',
    inputSchema: profileIdSchema.extend({
      name: z.string().min(1).describe('Goal name'),
      type: goalTypeSchema.describe('Goal type'),
      target_amount: z.number().positive().describe('Target amount to achieve'),
      target_date: z.string().describe('Target date (YYYY-MM-DD)'),
      description: z.string().optional().describe('Goal description'),
    }),
    handler: goalCreate,
  },

  goal_update: {
    description: 'Update a goal',
    inputSchema: profileIdSchema.extend({
      goal_id: z.string().uuid().describe('The goal ID'),
      name: z.string().min(1).optional().describe('Goal name'),
      target_amount: z.number().positive().optional().describe('Target amount'),
      target_date: z.string().optional().describe('Target date'),
      description: z.string().optional().describe('Goal description'),
    }),
    handler: goalUpdate,
  },

  goal_delete: {
    description: 'Delete a goal',
    inputSchema: profileIdSchema.extend({
      goal_id: z.string().uuid().describe('The goal ID to delete'),
    }),
    handler: goalDelete,
  },

  goal_get_progress: {
    description: 'Get progress for a specific goal',
    inputSchema: profileIdSchema.extend({
      goal_id: z.string().uuid().describe('The goal ID'),
    }),
    handler: goalGetProgress,
  },

  goal_update_progress: {
    description: 'Manually update progress for a goal',
    inputSchema: profileIdSchema.extend({
      goal_id: z.string().uuid().describe('The goal ID'),
      current_amount: z.number().describe('Current amount achieved'),
    }),
    handler: goalUpdateProgress,
  },
}

// Handler implementations

async function goalList(params: {
  profile_id: string
  type?: 'revenue' | 'profit' | 'valuation' | 'runway' | 'revenue_multiple'
  limit?: number
  offset?: number
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    let query = supabase
      .from('goals')
      .select('*')
      .eq('profile_id', params.profile_id)
      .order('end_date', { ascending: true })

    if (params.type) {
      query = query.eq('type', params.type)
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
      goals: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return error(`Failed to list goals: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function goalGet(params: {
  profile_id: string
  goal_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', params.goal_id)
      .eq('profile_id', params.profile_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Goal not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`)
    }

    // Calculate progress percentage
    const progressPercent = data.target_amount > 0
      ? Math.round((data.current_amount / data.target_amount) * 100)
      : 0

    return success({
      ...data,
      progress_percent: progressPercent,
    })
  } catch (err) {
    return error(`Failed to get goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function goalCreate(params: {
  profile_id: string
  name: string
  type: 'revenue' | 'profit' | 'valuation' | 'runway' | 'revenue_multiple'
  target_amount: number
  target_date: string
  description?: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const { data, error: dbError } = await supabase
      .from('goals')
      .insert({
        profile_id: params.profile_id,
        name: params.name,
        type: params.type,
        target_amount: params.target_amount,
        current_amount: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: params.target_date,
        notes: params.description || null,
        is_achieved: false,
      })
      .select()
      .single()

    if (dbError) {
      return error(`Failed to create goal: ${dbError.message}`)
    }

    return success({
      message: 'Goal created successfully',
      goal: data,
    })
  } catch (err) {
    return error(`Failed to create goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function goalUpdate(params: {
  profile_id: string
  goal_id: string
  name?: string
  target_amount?: number
  target_date?: string
  description?: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Verify goal belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('goals')
      .select('id')
      .eq('id', params.goal_id)
      .eq('profile_id', params.profile_id)
      .single()

    if (getError || !existing) {
      return error('Goal not found')
    }

    const updateData: Record<string, unknown> = {}
    if (params.name !== undefined) updateData.name = params.name
    if (params.target_amount !== undefined) updateData.target_amount = params.target_amount
    if (params.target_date !== undefined) updateData.end_date = params.target_date
    if (params.description !== undefined) updateData.notes = params.description

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update')
    }

    const { data, error: dbError } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', params.goal_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update goal: ${dbError.message}`)
    }

    return success({
      message: 'Goal updated successfully',
      goal: data,
    })
  } catch (err) {
    return error(`Failed to update goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function goalDelete(params: {
  profile_id: string
  goal_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Verify goal belongs to this user
    const { data: existing, error: getError } = await supabase
      .from('goals')
      .select('id')
      .eq('id', params.goal_id)
      .eq('profile_id', params.profile_id)
      .single()

    if (getError || !existing) {
      return error('Goal not found')
    }

    const { error: dbError } = await supabase
      .from('goals')
      .delete()
      .eq('id', params.goal_id)

    if (dbError) {
      return error(`Failed to delete goal: ${dbError.message}`)
    }

    return success({
      message: 'Goal deleted successfully',
      goal_id: params.goal_id,
    })
  } catch (err) {
    return error(`Failed to delete goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function goalGetProgress(params: {
  profile_id: string
  goal_id: string
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    const { data: goal, error: dbError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', params.goal_id)
      .eq('profile_id', params.profile_id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return error('Goal not found', 'not_found')
      }
      return error(`Database error: ${dbError.message}`)
    }

    const progressPercent = goal.target_amount > 0
      ? Math.round((goal.current_amount / goal.target_amount) * 100)
      : 0

    const remainingAmount = Math.max(0, goal.target_amount - goal.current_amount)

    // Calculate days remaining
    const targetDate = new Date(goal.end_date)
    const today = new Date()
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Determine status
    let status = 'on_track'
    if (goal.is_achieved) {
      status = 'achieved'
    } else if (daysRemaining < 0) {
      status = 'overdue'
    } else if (progressPercent < 50 && daysRemaining < 30) {
      status = 'at_risk'
    }

    return success({
      goal_id: goal.id,
      name: goal.name,
      type: goal.type,
      current_amount: goal.current_amount,
      target_amount: goal.target_amount,
      remaining_amount: remainingAmount,
      progress_percent: progressPercent,
      days_remaining: daysRemaining,
      status,
      is_achieved: goal.is_achieved,
    })
  } catch (err) {
    return error(`Failed to get goal progress: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function goalUpdateProgress(params: {
  profile_id: string
  goal_id: string
  current_amount: number
}): Promise<ToolResult> {
  try {
    const supabase = getSupabase()

    // Verify goal belongs to this user and get target
    const { data: existing, error: getError } = await supabase
      .from('goals')
      .select('id, target_amount')
      .eq('id', params.goal_id)
      .eq('profile_id', params.profile_id)
      .single()

    if (getError || !existing) {
      return error('Goal not found', 'not_found')
    }

    // Check if goal is achieved
    const isAchieved = params.current_amount >= existing.target_amount
    const achievedAt = isAchieved ? new Date().toISOString() : null

    const { data, error: dbError } = await supabase
      .from('goals')
      .update({
        current_amount: params.current_amount,
        is_achieved: isAchieved,
        achieved_at: achievedAt,
      })
      .eq('id', params.goal_id)
      .select()
      .single()

    if (dbError) {
      return error(`Failed to update progress: ${dbError.message}`)
    }

    const progressPercent = data.target_amount > 0
      ? Math.round((data.current_amount / data.target_amount) * 100)
      : 0

    return success({
      message: isAchieved ? 'Goal achieved! Congratulations!' : 'Progress updated successfully',
      goal: data,
      progress_percent: progressPercent,
      is_achieved: isAchieved,
    })
  } catch (err) {
    return error(`Failed to update progress: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

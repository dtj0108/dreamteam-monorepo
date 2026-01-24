import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { format } from 'date-fns'

interface GoalInput {
  type: 'revenue' | 'profit' | 'valuation' | 'runway' | 'revenue_multiple'
  name: string
  target_amount: number
  current_amount?: number
  start_date: string
  end_date: string
  notes?: string
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const supabase = createAdminClient()

    // Get all goals for the workspace
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (goalsError) throw goalsError

    // Get workspace's accounts for calculations
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, balance')
      .eq('workspace_id', workspaceId)

    const accountIds = accounts?.map((a: any) => a.id) || []
    const totalBalance = accounts?.reduce((sum: number, a: any) => sum + (a.balance || 0), 0) || 0

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all((goals || []).map(async (goal: any) => {
      let current = 0
      let progress = 0

      if (goal.type === 'revenue' && accountIds.length > 0) {
        const { data: incomeData } = await supabase
          .from('transactions')
          .select('amount')
          .in('account_id', accountIds)
          .gt('amount', 0)
          .gte('date', goal.start_date)
          .lte('date', goal.end_date)

        current = incomeData?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0
        progress = goal.target_amount > 0 ? (current / goal.target_amount) * 100 : 0

      } else if (goal.type === 'profit' && accountIds.length > 0) {
        const { data: txData } = await supabase
          .from('transactions')
          .select('amount')
          .in('account_id', accountIds)
          .gte('date', goal.start_date)
          .lte('date', goal.end_date)

        const income = txData?.filter((tx: any) => tx.amount > 0).reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0
        const expenses = txData?.filter((tx: any) => tx.amount < 0).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0) || 0
        current = income - expenses
        progress = goal.target_amount > 0 ? (current / goal.target_amount) * 100 : 0

      } else if (goal.type === 'runway') {
        current = totalBalance
        progress = goal.target_amount > 0 ? (current / goal.target_amount) * 100 : 0

      } else if (goal.type === 'revenue_multiple' && accountIds.length > 0) {
        const twelveMonthsAgo = new Date()
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

        const { data: revenueData } = await supabase
          .from('transactions')
          .select('amount')
          .in('account_id', accountIds)
          .gt('amount', 0)
          .gte('date', format(twelveMonthsAgo, 'yyyy-MM-dd'))

        const annualRevenue = revenueData?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0
        current = annualRevenue * goal.target_amount
        progress = goal.target_amount > 0 ? Math.min((annualRevenue / (goal.target_amount * 10000)) * 100, 100) : 0

      } else if (goal.type === 'valuation') {
        current = goal.current_amount || 0
        progress = goal.target_amount > 0 ? (current / goal.target_amount) * 100 : 0
      }

      const isAchieved = progress >= 100

      return {
        ...goal,
        current_amount: current,
        progress: Math.min(progress, 100),
        is_achieved: isAchieved,
      }
    }))

    return NextResponse.json({ goals: goalsWithProgress })
  } catch (error) {
    console.error('Goals API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch goals' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const body: GoalInput = await request.json()

    if (!body.type || !body.name || !body.target_amount || !body.start_date || !body.end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        workspace_id: workspaceId,
        profile_id: session.id,
        type: body.type,
        name: body.name,
        target_amount: body.target_amount,
        current_amount: body.current_amount || 0,
        start_date: body.start_date,
        end_date: body.end_date,
        notes: body.notes,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Create goal error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create goal' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@dreamteam/database/server'
import { format, subYears } from 'date-fns'

interface ExitPlanInput {
  target_valuation?: number | null
  current_valuation?: number | null
  target_multiple?: number | null
  target_runway?: number | null
  target_exit_date?: string | null
  notes?: string | null
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('fb_session')

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    const profileId = session.id

    const supabase = createAdminClient()

    // Get exit plan
    const { data: exitPlan } = await supabase
      .from('exit_plans')
      .select('*')
      .eq('profile_id', profileId)
      .single()

    // Get user's accounts for runway calculation
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, balance')
      .eq('user_id', profileId)

    const accountIds = accounts?.map((a: any) => a.id) || []
    const currentRunway = accounts?.reduce((sum: number, a: any) => sum + (a.balance || 0), 0) || 0

    // Calculate ARR (trailing 12 months income)
    let currentArr = 0
    if (accountIds.length > 0) {
      const oneYearAgo = format(subYears(new Date(), 1), 'yyyy-MM-dd')
      
      const { data: incomeData } = await supabase
        .from('transactions')
        .select('amount')
        .in('account_id', accountIds)
        .gt('amount', 0)
        .gte('date', oneYearAgo)

      currentArr = incomeData?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0
    }

    // Calculate implied valuation
    const targetMultiple = exitPlan?.target_multiple || 5
    const impliedValuation = currentArr * targetMultiple

    return NextResponse.json({
      exitPlan: exitPlan ? {
        ...exitPlan,
        current_runway: currentRunway,
        current_arr: currentArr,
        implied_valuation: impliedValuation,
      } : null,
    })
  } catch (error) {
    console.error('Exit plan API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch exit plan' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('fb_session')

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    const profileId = session.id

    const body: ExitPlanInput = await request.json()

    const supabase = createAdminClient()

    // Upsert - create or update
    const { data: existingPlan } = await supabase
      .from('exit_plans')
      .select('id')
      .eq('profile_id', profileId)
      .single()

    let exitPlan
    if (existingPlan) {
      // Update existing
      const { data, error } = await supabase
        .from('exit_plans')
        .update({
          target_valuation: body.target_valuation,
          current_valuation: body.current_valuation,
          target_multiple: body.target_multiple,
          target_runway: body.target_runway,
          target_exit_date: body.target_exit_date,
          notes: body.notes,
        })
        .eq('id', existingPlan.id)
        .select()
        .single()

      if (error) throw error
      exitPlan = data
    } else {
      // Create new
      const { data, error } = await supabase
        .from('exit_plans')
        .insert({
          profile_id: profileId,
          target_valuation: body.target_valuation,
          current_valuation: body.current_valuation,
          target_multiple: body.target_multiple || 5.0,
          target_runway: body.target_runway,
          target_exit_date: body.target_exit_date,
          notes: body.notes,
        })
        .select()
        .single()

      if (error) throw error
      exitPlan = data
    }

    return NextResponse.json({ exitPlan })
  } catch (error) {
    console.error('Save exit plan error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save exit plan' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { createAdminClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import type { CreateKPIInputInput } from '@dreamteam/database/types'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const periodStart = searchParams.get('period_start')
    const periodEnd = searchParams.get('period_end')

    const supabase = createAdminClient()

    let query = supabase
      .from('kpi_inputs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('period_start', { ascending: false })

    if (periodStart && periodEnd) {
      query = query.eq('period_start', periodStart).eq('period_end', periodEnd)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Failed to fetch KPI inputs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KPI inputs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const body: CreateKPIInputInput = await request.json()
    const supabase = createAdminClient()

    // Upsert - update if exists, insert if not
    const { data, error } = await supabase
      .from('kpi_inputs')
      .upsert(
        {
          workspace_id: workspaceId,
          profile_id: session.id,
          period_start: body.period_start,
          period_end: body.period_end,
          customer_count: body.customer_count,
          customer_acquisition_cost: body.customer_acquisition_cost,
          lifetime_value: body.lifetime_value,
          churned_customers: body.churned_customers,
          inventory_value: body.inventory_value,
          units_sold: body.units_sold,
          billable_hours: body.billable_hours,
          employee_count: body.employee_count,
          utilization_target: body.utilization_target,
        },
        {
          onConflict: 'workspace_id,period_start,period_end',
        }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to save KPI inputs:', error)
    return NextResponse.json(
      { error: 'Failed to save KPI inputs' },
      { status: 500 }
    )
  }
}

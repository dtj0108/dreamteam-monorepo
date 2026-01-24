import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@dreamteam/database/server'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'
import {
  getPhoneNumberSubscription,
  getWorkspacePhoneNumbers,
  recalculatePhoneSubscription,
} from '@/lib/addons-queries'

/**
 * GET /api/addons/phone-numbers
 * Get phone number subscription and numbers list
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    // Fetch phone data in parallel
    const [subscription, numbers] = await Promise.all([
      getPhoneNumberSubscription(workspaceId),
      getWorkspacePhoneNumbers(workspaceId),
    ])

    return NextResponse.json({
      subscription,
      numbers,
    })
  } catch (error) {
    console.error('Error fetching phone numbers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch phone numbers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/addons/phone-numbers
 * Trigger recalculation of phone subscription totals
 * (Called after adding/removing phone numbers)
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(user.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    // Recalculate subscription totals
    await recalculatePhoneSubscription(workspaceId)

    // Return updated subscription
    const subscription = await getPhoneNumberSubscription(workspaceId)

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Error recalculating phone subscription:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate subscription' },
      { status: 500 }
    )
  }
}

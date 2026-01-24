import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@dreamteam/database/server'

export type OnboardingGoal = 'finance' | 'team' | 'sales'

export interface ChecklistItem {
  id: string
  label: string
  href: string
  isComplete: boolean
}

export interface OnboardingStatus {
  // Wizard completion status
  onboardingCompleted: boolean
  onboardingGoal: OnboardingGoal | null

  // Legacy checklist fields (for backward compatibility)
  accountCreated: boolean
  hasTransactions: boolean
  hasBudgets: boolean
  hasViewedReports: boolean

  // Goal-aware checklist
  checklistItems: ChecklistItem[]
  completedCount: number
  totalCount: number
  isComplete: boolean
}

// Helper to get goal-specific checklist items
function getChecklistItems(
  goal: OnboardingGoal | null,
  completionData: {
    hasTransactions: boolean
    hasBudgets: boolean
    hasViewedReports: boolean
    hasTeamMembers: boolean
    hasMessages: boolean
    hasProjects: boolean
    hasContacts: boolean
    hasDeals: boolean
  }
): ChecklistItem[] {
  const baseItem: ChecklistItem = {
    id: 'account',
    label: 'Create an account',
    href: '/account',
    isComplete: true, // Always true if logged in
  }

  // Finance-focused checklist
  if (goal === 'finance') {
    return [
      baseItem,
      { id: 'transactions', label: 'Import your first transactions', href: '/transactions/import', isComplete: completionData.hasTransactions },
      { id: 'budgets', label: 'Set up a budget', href: '/budgets', isComplete: completionData.hasBudgets },
      { id: 'reports', label: 'View your analytics dashboard', href: '/analytics', isComplete: completionData.hasViewedReports },
    ]
  }

  // Team-focused checklist
  if (goal === 'team') {
    return [
      baseItem,
      { id: 'invite', label: 'Invite a team member', href: '/account', isComplete: completionData.hasTeamMembers },
      { id: 'message', label: 'Send your first message', href: '/team/chat', isComplete: completionData.hasMessages },
      { id: 'project', label: 'Create a project', href: '/projects', isComplete: completionData.hasProjects },
    ]
  }

  // Sales-focused checklist
  if (goal === 'sales') {
    return [
      baseItem,
      { id: 'contact', label: 'Add your first contact', href: '/crm/contacts', isComplete: completionData.hasContacts },
      { id: 'deal', label: 'Create a deal', href: '/crm/deals', isComplete: completionData.hasDeals },
      { id: 'pipeline', label: 'View your pipeline', href: '/crm', isComplete: completionData.hasDeals },
    ]
  }

  // Default/no goal - generic checklist
  return [
    baseItem,
    { id: 'transactions', label: 'Import transactions', href: '/transactions/import', isComplete: completionData.hasTransactions },
    { id: 'budgets', label: 'Set budgets', href: '/budgets', isComplete: completionData.hasBudgets },
    { id: 'reports', label: 'View reports', href: '/analytics', isComplete: completionData.hasViewedReports },
  ]
}

// GET - Get onboarding status
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

    // Get profile with onboarding fields
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_viewed_reports, onboarding_completed, onboarding_goal, default_workspace_id')
      .eq('id', profileId)
      .single()

    const workspaceId = profile?.default_workspace_id

    // Count transactions
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileId)

    // Count budgets
    const { count: budgetCount } = await supabase
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    // Count team members (if workspace exists)
    let teamMemberCount = 0
    if (workspaceId) {
      const { count } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
      teamMemberCount = count ?? 0
    }

    // Count messages sent by user
    const { count: messageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', profileId)

    // Count projects
    let projectCount = 0
    if (workspaceId) {
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
      projectCount = count ?? 0
    }

    // Count leads/contacts
    let contactCount = 0
    if (workspaceId) {
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
      contactCount = count ?? 0
    }

    // Count deals/opportunities
    let dealCount = 0
    if (workspaceId) {
      const { count } = await supabase
        .from('lead_opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
      dealCount = count ?? 0
    }

    const onboardingGoal = profile?.onboarding_goal as OnboardingGoal | null

    const completionData = {
      hasTransactions: (transactionCount ?? 0) > 0,
      hasBudgets: (budgetCount ?? 0) > 0,
      hasViewedReports: profile?.has_viewed_reports ?? false,
      hasTeamMembers: teamMemberCount > 1, // More than just the owner
      hasMessages: (messageCount ?? 0) > 0,
      hasProjects: projectCount > 0,
      hasContacts: contactCount > 0,
      hasDeals: dealCount > 0,
    }

    const checklistItems = getChecklistItems(onboardingGoal, completionData)
    const completedCount = checklistItems.filter(item => item.isComplete).length

    const status: OnboardingStatus = {
      onboardingCompleted: profile?.onboarding_completed ?? false,
      onboardingGoal,
      accountCreated: true,
      hasTransactions: completionData.hasTransactions,
      hasBudgets: completionData.hasBudgets,
      hasViewedReports: completionData.hasViewedReports,
      checklistItems,
      completedCount,
      totalCount: checklistItems.length,
      isComplete: completedCount === checklistItems.length,
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Onboarding status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Mark a step as complete (for has_viewed_reports)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('fb_session')

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    const profileId = session.id

    const body = await request.json()
    const { step } = body

    if (step !== 'has_viewed_reports') {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update({ has_viewed_reports: true })
      .eq('id', profileId)

    if (error) {
      console.error('Onboarding update error:', error)
      return NextResponse.json({ error: 'Failed to update onboarding status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Save onboarding wizard completion
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('fb_session')

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    const profileId = session.id

    const body = await request.json()
    const { onboardingCompleted, goal, companyName, industryType } = body

    const supabase = createAdminClient()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (typeof onboardingCompleted === 'boolean') {
      updateData.onboarding_completed = onboardingCompleted
    }

    if (goal !== undefined) {
      updateData.onboarding_goal = goal
    }

    if (companyName !== undefined) {
      updateData.company_name = companyName
    }

    if (industryType !== undefined) {
      updateData.industry_type = industryType
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profileId)

    if (error) {
      console.error('Onboarding wizard update error:', error)
      return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding wizard update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


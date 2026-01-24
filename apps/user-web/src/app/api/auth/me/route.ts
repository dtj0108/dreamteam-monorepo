import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient, createAdminClient } from '@dreamteam/database/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Use admin client for queries to avoid RLS recursion issues
    const adminSupabase = createAdminClient()

    // Get profile data including role (role column may not exist yet)
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('name, phone, company_name, industry_type, default_workspace_id, pending_2fa, phone_verified, role')
      .eq('id', user.id)
      .single()

    // If query failed (likely due to missing role column), try without role
    let profileData = profile
    if (profileError && profileError.message?.includes('role')) {
      const { data: fallbackProfile } = await adminSupabase
        .from('profiles')
        .select('name, phone, company_name, industry_type, default_workspace_id, pending_2fa, phone_verified')
        .eq('id', user.id)
        .single()
      profileData = fallbackProfile ? { ...fallbackProfile, role: null } : null
    }

    // Determine current workspace: cookie > default_workspace_id
    const cookieStore = await cookies()
    const cookieWorkspaceId = cookieStore.get('current_workspace_id')?.value
    const currentWorkspaceId = cookieWorkspaceId || profileData?.default_workspace_id

    // Get workspace details and membership
    let workspaceName: string | null = null
    let workspaceRole: string = 'member'
    let allowedProducts: string[] = ['finance', 'sales', 'team', 'projects', 'knowledge', 'agents'] // Default to all

    if (currentWorkspaceId) {
      // Get workspace name (using admin to bypass RLS)
      const { data: workspace } = await adminSupabase
        .from('workspaces')
        .select('name, owner_id')
        .eq('id', currentWorkspaceId)
        .single()

      workspaceName = workspace?.name || null

      // Get membership details including role (using admin to bypass RLS)
      const { data: membership } = await adminSupabase
        .from('workspace_members')
        .select('role, allowed_products')
        .eq('workspace_id', currentWorkspaceId)
        .eq('profile_id', user.id)
        .single()

      if (membership) {
        workspaceRole = membership.role || 'member'

        // Owners always have access to all products
        if (workspaceRole === 'owner') {
          allowedProducts = ['finance', 'sales', 'team', 'projects', 'knowledge', 'agents']
        } else {
          allowedProducts = membership.allowed_products || ['finance', 'sales', 'team', 'projects', 'knowledge', 'agents']
        }
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: profileData?.name || user.user_metadata?.name || '',
        phone: profileData?.phone || '',
        companyName: profileData?.company_name,
        industryType: profileData?.industry_type,
        workspaceId: currentWorkspaceId || null,
        workspaceName: workspaceName,
        workspaceRole: workspaceRole,
        allowedProducts: allowedProducts,
        pending2FA: profileData?.pending_2fa || false,
        phoneVerified: profileData?.phone_verified || false,
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

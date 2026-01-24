import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient, createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'

// GET /api/workspaces - List user's workspaces
export async function GET(request: Request) {
  try {
    // Use getAuthContext to support both cookie sessions and Bearer tokens
    const auth = await getAuthContext(request)

    if (!auth || auth.type === 'api_key') {
      // API keys don't have access to workspace listing - they're already scoped
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = auth.userId
    const supabase = createAdminClient()

    // Get all workspaces the user is a member of
    const { data: memberships, error: membershipError } = await supabase
      .from('workspace_members')
      .select(`
        role,
        workspace:workspaces (
          id,
          name,
          slug,
          avatar_url,
          owner_id
        )
      `)
      .eq('profile_id', userId)

    if (membershipError) {
      console.error('Error fetching workspaces:', membershipError)
      return NextResponse.json(
        { error: 'Failed to fetch workspaces' },
        { status: 500 }
      )
    }

    // Transform data
    interface WorkspaceData {
      id: string
      name: string
      slug: string
      avatar_url: string | null
      owner_id: string
    }

    const workspaces = (memberships || [])
      .filter((m: { workspace: unknown; role: string }) => m.workspace)
      .map((m: { workspace: unknown; role: string }) => {
        // Handle both single object and array return types from Supabase
        const wsData = m.workspace
        const ws: WorkspaceData = Array.isArray(wsData) ? wsData[0] : wsData as WorkspaceData
        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          avatarUrl: ws.avatar_url,
          ownerId: ws.owner_id,
          role: m.role as 'owner' | 'admin' | 'member',
        }
      })

    // Get current workspace from cookie
    const cookieStore = await cookies()
    const currentWorkspaceId = cookieStore.get('current_workspace_id')?.value

    // If no cookie set but user has workspaces, get their default and set the cookie
    let effectiveWorkspaceId = currentWorkspaceId
    if (!effectiveWorkspaceId && workspaces.length > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', userId)
        .single()

      effectiveWorkspaceId = profile?.default_workspace_id || workspaces[0]?.id

      // Set the cookie so subsequent API calls work
      if (effectiveWorkspaceId) {
        cookieStore.set('current_workspace_id', effectiveWorkspaceId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        })
      }
    }

    return NextResponse.json({
      workspaces,
      currentWorkspaceId: effectiveWorkspaceId,
    })
  } catch (error) {
    console.error('Get workspaces error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: Request) {
  try {
    // Use getAuthContext to support both cookie sessions and Bearer tokens
    const auth = await getAuthContext(request)

    if (!auth || auth.type === 'api_key') {
      // API keys can't create workspaces
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = auth.userId
    const supabase = createAdminClient()

    const body = await request.json()
    const { name, slug } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Check if slug is already taken
    const { data: existingWorkspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingWorkspace) {
      return NextResponse.json(
        { error: 'This workspace URL is already taken' },
        { status: 400 }
      )
    }

    // Create workspace
    const { data: workspace, error: createError } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug,
        owner_id: userId,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating workspace:', createError)
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      )
    }

    // Add creator as owner member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        profile_id: userId,
        role: 'owner',
      })

    if (memberError) {
      console.error('Error adding workspace member:', memberError)
      // Cleanup: delete the workspace if member creation fails
      await supabase.from('workspaces').delete().eq('id', workspace.id)
      return NextResponse.json(
        { error: 'Failed to create workspace membership' },
        { status: 500 }
      )
    }

    // Set as current workspace
    const cookieStore = await cookies()
    cookieStore.set('current_workspace_id', workspace.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        avatarUrl: workspace.avatar_url,
        ownerId: workspace.owner_id,
        role: 'owner',
      },
    })
  } catch (error) {
    console.error('Create workspace error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

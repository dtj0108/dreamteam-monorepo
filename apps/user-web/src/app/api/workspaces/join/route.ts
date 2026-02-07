import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@dreamteam/database/server'

// POST /api/workspaces/join - Join a workspace via invite code
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { inviteCode } = body

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Get user's email for invite lookup
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Look up the invite by code
    const { data: invite, error: inviteError } = await supabase
      .from('pending_invites')
      .select('id, workspace_id, email, role')
      .eq('invite_code', inviteCode)
      .is('accepted_at', null)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invite.workspace_id)
      .eq('profile_id', user.id)
      .single()

    if (existingMembership) {
      // User already a member, just set the cookie and return success
      const cookieStore = await cookies()
      cookieStore.set('current_workspace_id', invite.workspace_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      })

      return NextResponse.json({
        message: 'Already a member of this workspace',
        workspaceId: invite.workspace_id,
      })
    }

    // Add user to workspace
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        profile_id: user.id,
        role: invite.role || 'member',
      })

    if (memberError) {
      console.error('Error adding workspace member:', memberError)
      return NextResponse.json(
        { error: 'Failed to join workspace' },
        { status: 500 }
      )
    }

    // Mark invite as accepted
    await supabase
      .from('pending_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    // Set default workspace if missing
    const { data: profileAfterJoin } = await supabase
      .from('profiles')
      .select('default_workspace_id')
      .eq('id', user.id)
      .single()

    if (!profileAfterJoin?.default_workspace_id) {
      await supabase
        .from('profiles')
        .update({ default_workspace_id: invite.workspace_id })
        .eq('id', user.id)
    }

    // Set as current workspace
    const cookieStore = await cookies()
    cookieStore.set('current_workspace_id', invite.workspace_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })

    return NextResponse.json({
      message: 'Successfully joined workspace',
      workspaceId: invite.workspace_id,
    })
  } catch (error) {
    console.error('Join workspace error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

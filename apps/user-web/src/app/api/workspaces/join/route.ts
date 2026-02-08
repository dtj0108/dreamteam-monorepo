import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient, createAdminClient } from '@dreamteam/database/server'

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const maskEmail = (email: string) => {
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return email

  if (localPart.length <= 2) {
    return `${localPart[0] || '*'}***@${domain}`
  }

  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`
}

// POST /api/workspaces/join - Join a workspace via invite link
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const admin = createAdminClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { inviteId } = body

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      )
    }

    // Look up the invite by ID (admin client bypasses RLS)
    const { data: invite, error: inviteError } = await admin
      .from('pending_invites')
      .select('id, workspace_id, email, role, expires_at')
      .eq('id', inviteId)
      .is('accepted_at', null)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 400 }
      )
    }

    if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
      return NextResponse.json(
        {
          code: 'INVITE_EXPIRED',
          error: 'This invite has expired. Ask your team admin to send a new invite.',
        },
        { status: 410 }
      )
    }

    const userEmail = user.email ? normalizeEmail(user.email) : ''
    const inviteEmail = invite.email ? normalizeEmail(invite.email) : ''

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Could not determine authenticated account email. Please sign in again.' },
        { status: 400 }
      )
    }

    if (!inviteEmail || userEmail !== inviteEmail) {
      return NextResponse.json(
        {
          code: 'INVITE_EMAIL_MISMATCH',
          error: 'This invite was sent to a different email than your current signed-in account.',
          inviteEmailMasked: inviteEmail ? maskEmail(inviteEmail) : undefined,
        },
        { status: 409 }
      )
    }

    // Check if user is already a member
    const { data: existingMembership } = await admin
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
    const { error: memberError } = await admin
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
    await admin
      .from('pending_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    // Set default workspace if missing
    const { data: profile } = await admin
      .from('profiles')
      .select('default_workspace_id')
      .eq('id', user.id)
      .single()

    if (!profile?.default_workspace_id) {
      await admin
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

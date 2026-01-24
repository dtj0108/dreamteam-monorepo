import { NextResponse } from 'next/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { generateAuthUrl, isNylasConfigured } from '@/lib/nylas'

/**
 * POST /api/nylas/auth
 *
 * Generate an OAuth URL for connecting a user's email/calendar.
 * User is redirected to this URL to authenticate with Google or Microsoft.
 */
export async function POST(request: Request) {
  try {
    if (!isNylasConfigured()) {
      return NextResponse.json(
        { error: 'Nylas is not configured' },
        { status: 503 }
      )
    }

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

    const body = await request.json()
    const { provider } = body

    if (!provider || !['google', 'microsoft'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "google" or "microsoft".' },
        { status: 400 }
      )
    }

    // Generate OAuth URL with state containing user context
    const result = generateAuthUrl(
      session.id,
      workspaceId,
      provider as 'google' | 'microsoft'
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      authUrl: result.data!.authUrl,
    })
  } catch (error) {
    console.error('Nylas auth error:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}

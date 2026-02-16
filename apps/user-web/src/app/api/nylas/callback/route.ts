import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { parseOAuthState, exchangeCodeForToken, isNylasConfigured } from '@/lib/nylas'
import { encryptToken } from '@/lib/encryption'
import { logNylasEvent } from '@/lib/audit'

function sanitizeReturnUrl(url: string | undefined): string {
  const fallback = '/sales/inbox'
  if (!url || typeof url !== 'string') return fallback
  if (url.startsWith('/') && !url.startsWith('//')) return url
  return fallback
}

/**
 * GET /api/nylas/callback
 *
 * OAuth callback handler. Nylas redirects here after user authentication.
 * Exchanges the code for tokens and stores the grant in the database.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isNylasConfigured()) {
      return NextResponse.redirect(
        new URL('/sales/inbox?error=nylas_not_configured', request.url)
      )
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors from Nylas/provider
    if (error) {
      console.error('Nylas OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/sales/inbox?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/sales/inbox?error=missing_parameters', request.url)
      )
    }

    // Parse and verify state
    const stateData = parseOAuthState(state)
    if (!stateData.valid) {
      console.error('Invalid OAuth state:', stateData.error)
      return NextResponse.redirect(
        new URL('/sales/inbox?error=invalid_state', request.url)
      )
    }

    const { userId, workspaceId, provider, returnUrl } = stateData
    const redirectBase = sanitizeReturnUrl(returnUrl)

    // Exchange code for access token
    const tokenResult = await exchangeCodeForToken(code)
    if (!tokenResult.success) {
      console.error('Token exchange failed:', tokenResult.error)
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=${encodeURIComponent(tokenResult.error || 'token_exchange_failed')}`, request.url)
      )
    }

    const { grantId, accessToken, email, scopes } = tokenResult.data!

    const supabase = createAdminClient()

    // Check if this grant already exists (re-authentication)
    const { data: existingGrant } = await supabase
      .from('nylas_grants')
      .select('id')
      .eq('grant_id', grantId)
      .single()

    if (existingGrant) {
      // Update existing grant
      const { error: updateError } = await supabase
        .from('nylas_grants')
        .update({
          encrypted_access_token: encryptToken(accessToken),
          scopes: scopes,
          status: 'active',
          error_code: null,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingGrant.id)

      if (updateError) {
        console.error('Failed to update grant:', updateError)
        return NextResponse.redirect(
          new URL(`${redirectBase}?error=failed_to_update`, request.url)
        )
      }

      // Audit log
      await logNylasEvent(
        'nylas.connected',
        existingGrant.id,
        workspaceId!,
        userId!,
        request,
        { provider, email, reauth: true }
      )

      return NextResponse.redirect(
        new URL(`${redirectBase}?success=nylas_reconnected`, request.url)
      )
    }

    // Create new grant
    const { data: newGrant, error: insertError } = await supabase
      .from('nylas_grants')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        grant_id: grantId,
        encrypted_access_token: encryptToken(accessToken),
        provider: provider,
        email: email,
        scopes: scopes,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store grant:', insertError)
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=failed_to_store`, request.url)
      )
    }

    // Initialize sync cursors for email and calendar
    await supabase.from('nylas_sync_cursors').insert([
      {
        nylas_grant_id: newGrant.id,
        resource_type: 'email',
        cursor: null,
      },
      {
        nylas_grant_id: newGrant.id,
        resource_type: 'calendar',
        cursor: null,
      },
    ])

    // Audit log
    await logNylasEvent(
      'nylas.connected',
      newGrant.id,
      workspaceId!,
      userId!,
      request,
      { provider, email }
    )

    return NextResponse.redirect(
      new URL(`${redirectBase}?success=nylas_connected`, request.url)
    )
  } catch (error) {
    console.error('Nylas callback error:', error)
    return NextResponse.redirect(
      new URL('/sales/inbox?error=callback_failed', request.url)
    )
  }
}

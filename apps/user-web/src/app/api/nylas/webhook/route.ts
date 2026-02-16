import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { verifyWebhookSignature } from '@/lib/nylas'
import { logNylasEvent } from '@/lib/audit'

/**
 * Extract grant_id from various webhook payload formats.
 * Nylas v3 webhooks can have grant_id in different locations.
 */
function extractGrantId(data: Record<string, unknown>): string | null {
  // Try common locations for grant_id in Nylas webhooks
  if (data.grant_id && typeof data.grant_id === 'string') {
    return data.grant_id
  }

  const object = data.object as Record<string, unknown> | undefined
  if (object?.grant_id && typeof object.grant_id === 'string') {
    return object.grant_id
  }

  // For Nylas v3, grant_id might be at the root level
  if (data.data && typeof data.data === 'object') {
    const nestedData = data.data as Record<string, unknown>
    if (nestedData.grant_id && typeof nestedData.grant_id === 'string') {
      return nestedData.grant_id
    }
    const nestedObject = nestedData.object as Record<string, unknown> | undefined
    if (nestedObject?.grant_id && typeof nestedObject.grant_id === 'string') {
      return nestedObject.grant_id
    }
  }

  return null
}

/**
 * Extract object ID (message/event) from webhook payload.
 */
function extractObjectId(data: Record<string, unknown>): string | null {
  const object = data.object as Record<string, unknown> | undefined
  if (object?.id && typeof object.id === 'string') {
    return object.id
  }

  if (data.data && typeof data.data === 'object') {
    const nestedData = data.data as Record<string, unknown>
    const nestedObject = nestedData.object as Record<string, unknown> | undefined
    if (nestedObject?.id && typeof nestedObject.id === 'string') {
      return nestedObject.id
    }
  }

  return null
}

/**
 * POST /api/nylas/webhook
 *
 * Handle Nylas webhooks for real-time updates.
 *
 * Webhook types:
 * - message.created: New email received
 * - message.updated: Email updated (read status, labels, etc.)
 * - message.opened: Email opened by recipient (with tracking)
 * - message.link_clicked: Link in email clicked (with tracking)
 * - event.created: New calendar event
 * - event.updated: Calendar event updated
 * - event.deleted: Calendar event deleted
 * - grant.created: New grant connected
 * - grant.updated: Grant status changed
 * - grant.expired: Grant token expired (needs re-authentication)
 * - grant.revoked: Grant was revoked by user
 * - grant.deleted: Grant was deleted
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('x-nylas-signature')

    // Verify webhook signature
    const verification = verifyWebhookSignature(body, signature)
    if (!verification.valid) {
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
      if (isProduction || verification.error !== 'Webhook secret not configured') {
        console.error('Webhook verification failed:', verification.error)
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
      console.warn('[Nylas Webhook] Webhook secret not configured - processing without verification (dev only)')
    }

    const payload = JSON.parse(body)

    // Handle challenge request (webhook verification by Nylas)
    if (payload.challenge) {
      return NextResponse.json({ challenge: payload.challenge })
    }

    // Nylas v3 webhook format: { specversion, type, source, id, time, data: { object: {...} } }
    const type = payload.type
    const data = payload.data || payload

    console.log(`[Nylas Webhook] Received ${type}:`, JSON.stringify(data, null, 2).substring(0, 500))

    const supabase = createAdminClient()

    // Extract grant_id using helper function for consistent handling
    const grantId = extractGrantId(data)
    const objectId = extractObjectId(data)

    switch (type) {
      case 'grant.expired':
      case 'grant.revoked':
      case 'grant.deleted': {
        // Update grant status in database
        if (grantId) {
          const statusMap: Record<string, string> = {
            'grant.expired': 'expired',
            'grant.revoked': 'revoked',
            'grant.deleted': 'deleted',
          }
          const messageMap: Record<string, string> = {
            'grant.expired': 'Grant expired. User needs to re-authenticate.',
            'grant.revoked': 'Grant was revoked by user.',
            'grant.deleted': 'Grant was deleted.',
          }

          const { data: grant, error } = await supabase
            .from('nylas_grants')
            .update({
              status: statusMap[type] || 'error',
              error_code: type,
              error_message: messageMap[type] || 'Grant status changed.',
              updated_at: new Date().toISOString(),
            })
            .eq('grant_id', grantId)
            .select('id, workspace_id, user_id')
            .single()

          if (!error && grant) {
            await logNylasEvent(
              'nylas.webhook_received',
              grant.id,
              grant.workspace_id,
              grant.user_id,
              request,
              { webhookType: type, grantId }
            )
          }
        }
        break
      }

      case 'grant.created':
      case 'grant.updated': {
        // Grant was created or updated - log the event
        if (grantId) {
          const { data: grant } = await supabase
            .from('nylas_grants')
            .select('id, workspace_id, user_id')
            .eq('grant_id', grantId)
            .single()

          if (grant) {
            // Update last_sync_at to indicate activity
            await supabase
              .from('nylas_grants')
              .update({
                last_sync_at: new Date().toISOString(),
                status: 'active',
                error_code: null,
                error_message: null,
              })
              .eq('id', grant.id)

            await logNylasEvent(
              'nylas.webhook_received',
              grant.id,
              grant.workspace_id,
              grant.user_id,
              request,
              { webhookType: type, grantId }
            )
          }
        }
        break
      }

      case 'message.created':
      case 'message.updated':
      case 'message.opened':
      case 'message.link_clicked': {
        // Email event - update sync timestamp and log
        if (grantId) {
          const { data: grant } = await supabase
            .from('nylas_grants')
            .select('id, workspace_id, user_id')
            .eq('grant_id', grantId)
            .single()

          if (grant) {
            // Update last_sync_at to indicate activity
            await supabase
              .from('nylas_grants')
              .update({ last_sync_at: new Date().toISOString() })
              .eq('id', grant.id)

            await logNylasEvent(
              'nylas.webhook_received',
              grant.id,
              grant.workspace_id,
              grant.user_id,
              request,
              { webhookType: type, messageId: objectId }
            )
          }
        }
        break
      }

      case 'event.created':
      case 'event.updated':
      case 'event.deleted': {
        // Calendar event - update sync timestamp and log
        if (grantId) {
          const { data: grant } = await supabase
            .from('nylas_grants')
            .select('id, workspace_id, user_id')
            .eq('grant_id', grantId)
            .single()

          if (grant) {
            // Update last_sync_at to indicate activity
            await supabase
              .from('nylas_grants')
              .update({ last_sync_at: new Date().toISOString() })
              .eq('id', grant.id)

            await logNylasEvent(
              'nylas.webhook_received',
              grant.id,
              grant.workspace_id,
              grant.user_id,
              request,
              { webhookType: type, eventId: objectId }
            )
          }
        }
        break
      }

      default:
        console.log(`[Nylas Webhook] Unhandled webhook type: ${type}`)
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    // Still return 200 to prevent Nylas from retrying
    // Log the error for debugging
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}

/**
 * GET /api/nylas/webhook
 *
 * Handle Nylas webhook challenge verification.
 * Nylas sends a GET request with a challenge parameter during webhook setup.
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')

  if (challenge) {
    // Return the challenge value to verify the webhook endpoint
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ error: 'Missing challenge parameter' }, { status: 400 })
}

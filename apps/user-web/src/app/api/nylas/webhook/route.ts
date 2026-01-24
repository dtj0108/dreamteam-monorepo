import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { verifyWebhookSignature } from '@/lib/nylas'
import { logNylasEvent } from '@/lib/audit'

/**
 * POST /api/nylas/webhook
 *
 * Handle Nylas webhooks for real-time updates.
 *
 * Webhook types:
 * - message.created: New email received
 * - message.updated: Email updated (read status, labels, etc.)
 * - event.created: New calendar event
 * - event.updated: Calendar event updated
 * - event.deleted: Calendar event deleted
 * - grant.expired: Grant token expired (needs re-authentication)
 * - grant.revoked: Grant was revoked by user
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('x-nylas-signature')

    // Verify webhook signature
    const verification = verifyWebhookSignature(body, signature)
    if (!verification.valid) {
      console.error('Webhook verification failed:', verification.error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const payload = JSON.parse(body)

    // Handle challenge request (webhook verification by Nylas)
    if (payload.challenge) {
      return NextResponse.json({ challenge: payload.challenge })
    }

    const { type, data } = payload

    console.log(`[Nylas Webhook] Received ${type}:`, JSON.stringify(data, null, 2))

    const supabase = createAdminClient()

    switch (type) {
      case 'grant.expired':
      case 'grant.revoked': {
        // Update grant status in database
        const grantId = data.object?.grant_id || data.grant_id
        if (grantId) {
          const { data: grant, error } = await supabase
            .from('nylas_grants')
            .update({
              status: type === 'grant.expired' ? 'expired' : 'error',
              error_code: type,
              error_message: type === 'grant.expired'
                ? 'Grant expired. User needs to re-authenticate.'
                : 'Grant was revoked by user.',
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

      case 'message.created':
      case 'message.updated': {
        // Could trigger email sync or update local cache
        // For now, just log the event
        const grantId = data.object?.grant_id
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
              { webhookType: type, messageId: data.object?.id }
            )
          }
        }
        break
      }

      case 'event.created':
      case 'event.updated':
      case 'event.deleted': {
        // Could trigger calendar sync or update local cache
        const grantId = data.object?.grant_id
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
              { webhookType: type, eventId: data.object?.id }
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

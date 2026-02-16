import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { createDirectCharge, hasPaymentMethodSaved } from '@/lib/billing-queries'
import { addSMSCredits, addCallMinutes } from '@/lib/addons-queries'
import { SMS_BUNDLES, MINUTES_BUNDLES, type CreditBundle } from '@/types/addons'

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

interface AutoReplenishWorkspace {
  workspace_id: string
  type: 'sms_credits' | 'call_minutes'
  bundle: CreditBundle
  balance: number
  threshold: number
}

/**
 * GET /api/cron/auto-replenish
 * Runs every 5 minutes to process auto-replenish for workspaces below threshold
 *
 * Vercel Cron schedule: every 5 minutes
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron authorization — reject if secret is unset or mismatched
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('Auto-replenish cron: Unauthorized request (missing or invalid secret)')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    details: [] as Array<{ workspaceId: string; type: string; status: string; error?: string }>,
  }

  try {
    // Find SMS credits workspaces that need auto-replenish
    const { data: smsWorkspaces, error: smsError } = await supabase
      .from('workspace_sms_credits')
      .select('workspace_id, balance, auto_replenish_threshold, auto_replenish_bundle')
      .eq('auto_replenish_enabled', true)
      .not('auto_replenish_bundle', 'is', null)

    if (smsError) {
      console.error('Error fetching SMS workspaces for auto-replenish:', smsError)
    }

    // Find call minutes workspaces that need auto-replenish
    const { data: minutesWorkspaces, error: minutesError } = await supabase
      .from('workspace_call_minutes')
      .select('workspace_id, balance_seconds, auto_replenish_threshold, auto_replenish_bundle')
      .eq('auto_replenish_enabled', true)
      .not('auto_replenish_bundle', 'is', null)

    if (minutesError) {
      console.error('Error fetching call minutes workspaces for auto-replenish:', minutesError)
    }

    // Build list of workspaces to process
    const toProcess: AutoReplenishWorkspace[] = []

    // Add SMS workspaces below threshold
    for (const workspace of smsWorkspaces || []) {
      if (workspace.balance < workspace.auto_replenish_threshold) {
        toProcess.push({
          workspace_id: workspace.workspace_id,
          type: 'sms_credits',
          bundle: workspace.auto_replenish_bundle as CreditBundle,
          balance: workspace.balance,
          threshold: workspace.auto_replenish_threshold,
        })
      }
    }

    // Add call minutes workspaces below threshold (threshold is in minutes, balance is in seconds)
    for (const workspace of minutesWorkspaces || []) {
      const balanceMinutes = Math.floor(workspace.balance_seconds / 60)
      if (balanceMinutes < workspace.auto_replenish_threshold) {
        toProcess.push({
          workspace_id: workspace.workspace_id,
          type: 'call_minutes',
          bundle: workspace.auto_replenish_bundle as CreditBundle,
          balance: balanceMinutes,
          threshold: workspace.auto_replenish_threshold,
        })
      }
    }

    console.log(`Auto-replenish: Found ${toProcess.length} workspaces to process`)

    // Process each workspace
    for (const workspace of toProcess) {
      results.processed++

      try {
        // Check for recent successful attempt to prevent re-charging too soon
        const { data: recentAttempt } = await supabase
          .from('auto_replenish_attempts')
          .select('id, status, created_at')
          .eq('workspace_id', workspace.workspace_id)
          .eq('replenish_type', workspace.type)
          .eq('status', 'succeeded')
          .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
          .limit(1)
          .single()

        if (recentAttempt) {
          console.log(`Auto-replenish: Skipping ${workspace.workspace_id} - recently succeeded`)
          results.skipped++
          results.details.push({
            workspaceId: workspace.workspace_id,
            type: workspace.type,
            status: 'skipped',
            error: 'Recently succeeded',
          })
          continue
        }

        // Check if workspace has a payment method
        const hasCard = await hasPaymentMethodSaved(workspace.workspace_id)
        if (!hasCard) {
          console.log(`Auto-replenish: Skipping ${workspace.workspace_id} - no payment method`)
          results.skipped++
          results.details.push({
            workspaceId: workspace.workspace_id,
            type: workspace.type,
            status: 'skipped',
            error: 'No payment method',
          })
          continue
        }

        // Get bundle details
        const bundleConfig =
          workspace.type === 'sms_credits'
            ? SMS_BUNDLES[workspace.bundle]
            : MINUTES_BUNDLES[workspace.bundle]

        const creditsOrMinutes =
          workspace.type === 'sms_credits'
            ? (bundleConfig as typeof SMS_BUNDLES.starter).credits
            : (bundleConfig as typeof MINUTES_BUNDLES.starter).minutes * 60 // Store as seconds

        // Attempt to atomically claim this replenish slot.
        // The partial unique index (idx_auto_replenish_unique_processing) prevents
        // two 'processing' rows for the same workspace+type.
        const { data: attempt, error: attemptError } = await supabase
          .from('auto_replenish_attempts')
          .insert({
            workspace_id: workspace.workspace_id,
            replenish_type: workspace.type,
            bundle: workspace.bundle,
            amount_cents: bundleConfig.price,
            credits_or_minutes: creditsOrMinutes,
            status: 'processing',
          })
          .select('id')
          .single()

        if (attemptError) {
          // Unique constraint violation = another instance is already processing
          if (attemptError.code === '23505') {
            console.log(`Auto-replenish: Skipping ${workspace.workspace_id} - concurrent attempt in progress`)
            results.skipped++
            results.details.push({
              workspaceId: workspace.workspace_id,
              type: workspace.type,
              status: 'skipped',
              error: 'Concurrent attempt in progress',
            })
            continue
          }
          // Other insert error
          console.error(`Auto-replenish: Failed to create attempt record:`, attemptError)
          results.failed++
          results.details.push({
            workspaceId: workspace.workspace_id,
            type: workspace.type,
            status: 'failed',
            error: 'Failed to create attempt record',
          })
          continue
        }

        // Attempt direct charge
        const chargeResult = await createDirectCharge(workspace.workspace_id, bundleConfig.price, {
          type: workspace.type,
          bundle: workspace.bundle,
          credits_or_minutes: creditsOrMinutes,
          auto_replenish_attempt_id: attempt.id,
        })

        if (!chargeResult.success) {
          // Update attempt as failed
          await supabase
            .from('auto_replenish_attempts')
            .update({
              status: chargeResult.requiresAction ? 'requires_action' : 'failed',
              stripe_payment_intent_id: chargeResult.paymentIntentId || null,
              error_code: chargeResult.errorCode || null,
              error_message: chargeResult.error || null,
              failed_at: new Date().toISOString(),
            })
            .eq('id', attempt.id)

          console.log(`Auto-replenish: Charge failed for ${workspace.workspace_id}:`, chargeResult.error)
          results.failed++
          results.details.push({
            workspaceId: workspace.workspace_id,
            type: workspace.type,
            status: 'failed',
            error: chargeResult.error,
          })
          continue
        }

        // Mark attempt as succeeded BEFORE adding credits to prevent duplicate charges on crash
        await supabase
          .from('auto_replenish_attempts')
          .update({
            status: 'succeeded',
            stripe_payment_intent_id: chargeResult.paymentIntentId || null,
            succeeded_at: new Date().toISOString(),
          })
          .eq('id', attempt.id)

        // Now add credits/minutes — if this fails, charge is recorded but credits need manual reconciliation
        try {
          if (workspace.type === 'sms_credits') {
            await addSMSCredits(workspace.workspace_id, workspace.bundle)
          } else {
            await addCallMinutes(workspace.workspace_id, workspace.bundle)
          }
        } catch (creditError) {
          console.error(`Auto-replenish: Credits/minutes failed after successful charge for ${workspace.workspace_id}:`, creditError)
          // Mark that credits weren't added so it can be reconciled
          await supabase
            .from('auto_replenish_attempts')
            .update({
              error_message: `Charge succeeded but credit addition failed: ${creditError instanceof Error ? creditError.message : String(creditError)}`,
            })
            .eq('id', attempt.id)
        }

        console.log(`Auto-replenish: Success for ${workspace.workspace_id} - ${workspace.type} ${workspace.bundle}`)
        results.successful++
        results.details.push({
          workspaceId: workspace.workspace_id,
          type: workspace.type,
          status: 'succeeded',
        })
      } catch (error) {
        console.error(`Auto-replenish: Error processing ${workspace.workspace_id}:`, error)
        results.failed++
        results.details.push({
          workspaceId: workspace.workspace_id,
          type: workspace.type,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    console.log(`Auto-replenish complete: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`)

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error('Auto-replenish cron error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...results,
      },
      { status: 500 }
    )
  }
}

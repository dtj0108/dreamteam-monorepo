import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyPendingTierChange } from '@dreamteam/database'

export const maxDuration = 60

/**
 * Cron endpoint to apply pending agent tier downgrades at period end.
 * Uses atomic CAS to prevent race conditions with webhook handlers.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // Query workspaces with pending changes due now, including failed deploys for retry
    const { data: pending, error } = await supabase
      .from('workspace_billing')
      .select('workspace_id, agent_tier_pending, agent_tier_pending_effective_at, agent_status, agent_deploy_status')
      .not('agent_tier_pending', 'is', null)
      .not('agent_tier_pending_effective_at', 'is', null)
      .lte('agent_tier_pending_effective_at', now)

    if (error) {
      console.error('[pending-downgrades] Failed to query pending changes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also find workspaces with failed deploys that need retry (pending tier already cleared)
    const { data: failedDeploys } = await supabase
      .from('workspace_billing')
      .select('workspace_id, agent_tier, agent_deploy_status')
      .eq('agent_deploy_status', 'failed')
      .is('agent_tier_pending', null)

    const results: Array<{
      workspace_id: string
      applied: boolean
      skipped?: string
      error?: string
      retried?: boolean
    }> = []

    // Apply pending tier changes using atomic CAS
    for (const row of pending || []) {
      const pendingTier = row.agent_tier_pending as string | null
      if (!pendingTier) continue

      if (row.agent_status !== 'active') {
        results.push({
          workspace_id: row.workspace_id,
          applied: false,
          skipped: 'subscription_not_active',
        })
        continue
      }

      const casResult = await applyPendingTierChange(row.workspace_id, pendingTier)

      results.push({
        workspace_id: row.workspace_id,
        applied: casResult.applied,
        error: casResult.error || undefined,
      })
    }

    // Retry failed deploys (tier already applied, just deploy failed)
    const MAX_DEPLOY_RETRIES = 3

    for (const row of failedDeploys || []) {
      const tier = row.agent_tier as string | null
      if (!tier || tier === 'none') continue

      // Check retry count via billing_alerts to enforce max retries
      const { count: alertCount } = await supabase
        .from('billing_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', row.workspace_id)
        .eq('alert_type', 'deploy_failed')

      if ((alertCount ?? 0) >= MAX_DEPLOY_RETRIES) {
        console.log(`[pending-downgrades] Skipping workspace ${row.workspace_id}: max retries (${MAX_DEPLOY_RETRIES}) exceeded`)
        results.push({
          workspace_id: row.workspace_id,
          applied: false,
          retried: true,
          skipped: 'max_retries_exceeded',
        })
        continue
      }

      // Directly retry the deploy
      const { autoDeployTeamForPlan } = await import('@dreamteam/database')
      try {
        const deployResult = await autoDeployTeamForPlan(row.workspace_id, tier)
        if (deployResult.deployed) {
          await supabase
            .from('workspace_billing')
            .update({ agent_deploy_status: 'deployed', agent_deploy_error: null })
            .eq('workspace_id', row.workspace_id)
          results.push({
            workspace_id: row.workspace_id,
            applied: true,
            retried: true,
          })
        } else {
          await supabase.from('billing_alerts').insert({
            workspace_id: row.workspace_id,
            alert_type: 'deploy_failed',
            severity: 'high',
            title: 'Agent deployment retry failed',
            description: `Deploy retry failed for tier ${tier}: ${deployResult.error || 'unknown error'}`,
          })
          results.push({
            workspace_id: row.workspace_id,
            applied: false,
            retried: true,
            error: deployResult.error || 'retry_deploy_failed',
          })
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'retry_deploy_error'
        await supabase.from('billing_alerts').insert({
          workspace_id: row.workspace_id,
          alert_type: 'deploy_failed',
          severity: 'high',
          title: 'Agent deployment retry failed',
          description: `Deploy retry threw error for tier ${tier}: ${errMsg}`,
        })
        results.push({
          workspace_id: row.workspace_id,
          applied: false,
          retried: true,
          error: errMsg,
        })
      }
    }

    return NextResponse.json({
      processed: results.length,
      applied: results.filter(r => r.applied).length,
      retried: results.filter(r => r.retried).length,
      skipped: results.filter(r => r.skipped).length,
      results,
    })
  } catch (error) {
    console.error('[pending-downgrades] Handler error:', error)
    return NextResponse.json({ error: 'Failed to apply pending downgrades' }, { status: 500 })
  }
}

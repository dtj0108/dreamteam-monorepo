/**
 * Atomic Compare-And-Swap (CAS) function for applying pending agent tier changes.
 *
 * Prevents race conditions between the cron job and webhook by using a conditional
 * UPDATE that only succeeds if the pending tier still matches expectations.
 */
import { createAdminClient } from './server'
import { autoDeployTeamForPlan, type AutoDeployResult } from './auto-deploy'

export interface ApplyPendingTierResult {
  applied: boolean
  tier?: string
  deploymentId?: string
  error?: string
}

/**
 * Atomically apply a pending agent tier change for a workspace.
 *
 * Uses a conditional UPDATE (CAS pattern) to prevent double-application:
 * - Only updates if agent_tier_pending is non-null (and matches expectedPendingTier if provided)
 * - Sets agent_tier to the pending value, clears pending fields, and sets deploy status
 * - If no rows match, returns { applied: false } (another process already applied it)
 *
 * After the CAS succeeds, deploys the new tier's team and updates deploy status.
 *
 * @param workspaceId - The workspace to apply the pending tier change for
 * @param expectedPendingTier - Optional: only apply if the pending tier matches this value
 */
export async function applyPendingTierChange(
  workspaceId: string,
  expectedPendingTier?: string
): Promise<ApplyPendingTierResult> {
  const supabase = createAdminClient()

  // Step 1: Read the current pending tier so we know what to set agent_tier to
  const { data: billing, error: readError } = await supabase
    .from('workspace_billing')
    .select('agent_tier_pending, agent_tier_pending_effective_at, agent_status')
    .eq('workspace_id', workspaceId)
    .single()

  if (readError || !billing) {
    return { applied: false, error: readError?.message || 'billing_record_not_found' }
  }

  const pendingTier = billing.agent_tier_pending as string | null
  if (!pendingTier) {
    return { applied: false, error: 'no_pending_tier' }
  }

  if (expectedPendingTier && pendingTier !== expectedPendingTier) {
    return { applied: false, error: 'pending_tier_mismatch' }
  }

  if (billing.agent_status !== 'active') {
    return { applied: false, error: 'subscription_not_active' }
  }

  // Step 2: Atomic CAS UPDATE -- only succeeds if agent_tier_pending still matches
  const { data: updated, error: updateError } = await supabase
    .from('workspace_billing')
    .update({
      agent_tier: pendingTier,
      agent_tier_pending: null,
      agent_tier_pending_effective_at: null,
      agent_deploy_status: 'pending',
      agent_deploy_error: null,
      agent_deploy_attempted_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('agent_tier_pending', pendingTier)
    .select('workspace_id')

  if (updateError) {
    return { applied: false, error: updateError.message }
  }

  if (!updated || updated.length === 0) {
    // Another process already cleared the pending tier
    return { applied: false, error: 'cas_conflict' }
  }

  // Step 3: Deploy the new tier's team
  let deployResult: AutoDeployResult
  try {
    deployResult = await autoDeployTeamForPlan(workspaceId, pendingTier)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown error'
    await supabase
      .from('workspace_billing')
      .update({ agent_deploy_status: 'failed', agent_deploy_error: errMsg })
      .eq('workspace_id', workspaceId)
    await supabase.from('billing_alerts').insert({
      workspace_id: workspaceId,
      alert_type: 'deploy_failed',
      severity: 'high',
      title: 'Agent deployment failed',
      description: `Auto-deploy threw error applying pending tier ${pendingTier}: ${errMsg}`,
    })
    return { applied: true, tier: pendingTier, error: `deploy_error: ${errMsg}` }
  }

  if (!deployResult.deployed) {
    await supabase
      .from('workspace_billing')
      .update({ agent_deploy_status: 'failed', agent_deploy_error: deployResult.error || 'deploy_failed' })
      .eq('workspace_id', workspaceId)
    await supabase.from('billing_alerts').insert({
      workspace_id: workspaceId,
      alert_type: 'deploy_failed',
      severity: 'high',
      title: 'Agent deployment failed',
      description: `Auto-deploy failed applying pending tier ${pendingTier}: ${deployResult.error || 'unknown error'}`,
    })
    return { applied: true, tier: pendingTier, error: `deploy_failed: ${deployResult.error}` }
  }

  // Step 4: Mark deployment as successful
  await supabase
    .from('workspace_billing')
    .update({ agent_deploy_status: 'deployed', agent_deploy_error: null })
    .eq('workspace_id', workspaceId)

  return { applied: true, tier: pendingTier, deploymentId: deployResult.deploymentId }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { provisionDeploymentResources, type DeployedTeamConfig } from '@dreamteam/database'

type RepairResult = {
  duplicatesFound: number
  duplicatesDeleted: number
  indexCreated: boolean
  workspacesReprovisioned: number
  workspacesSkipped: number
  errors: string[]
}

const DEFAULT_BATCH_SIZE = 1000

// POST /api/admin/repair-schedules
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const body = await request.json().catch(() => ({}))
  const dryRun = body?.dryRun === true
  const batchSize = Math.min(Math.max(100, Number(body?.batchSize) || DEFAULT_BATCH_SIZE), 5000)

  const seen = new Set<string>()
  const duplicates: string[] = []
  const uniqueCountByWorkspace = new Map<string, number>()

  let offset = 0
  let page = 0
  const errors: string[] = []

  while (true) {
    const { data, error: pageError } = await supabase
      .from('agent_schedules')
      .select('id, workspace_id, agent_id, name, is_enabled, updated_at, created_at')
      .eq('is_template', false)
      .order('is_enabled', { ascending: false })
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + batchSize - 1)

    if (pageError) {
      errors.push(`page_${page}: ${pageError.message}`)
      break
    }

    if (!data || data.length === 0) break

    for (const row of data) {
      if (!row.workspace_id) continue
      const key = `${row.workspace_id}:${row.agent_id}:${row.name}`
      if (seen.has(key)) {
        duplicates.push(row.id)
        continue
      }
      seen.add(key)
      uniqueCountByWorkspace.set(
        row.workspace_id,
        (uniqueCountByWorkspace.get(row.workspace_id) || 0) + 1
      )
    }

    if (data.length < batchSize) break
    offset += batchSize
    page += 1
  }

  let deleted = 0
  if (!dryRun && duplicates.length > 0) {
    const chunkSize = 1000
    for (let i = 0; i < duplicates.length; i += chunkSize) {
      const chunk = duplicates.slice(i, i + chunkSize)
      const { error: deleteError } = await supabase
        .from('agent_schedules')
        .delete()
        .in('id', chunk)

      if (deleteError) {
        errors.push(`delete_chunk_${i}: ${deleteError.message}`)
        break
      }
      deleted += chunk.length
    }
  }

  let indexCreated = false
  if (!dryRun) {
    const { error: indexError } = await supabase.rpc('create_agent_schedules_unique_index')
    if (indexError) {
      errors.push(`index_create: ${indexError.message}`)
    } else {
      indexCreated = true
    }
  }

  let workspacesReprovisioned = 0
  let workspacesSkipped = 0

  if (!dryRun) {
    const { data: deployments, error: deploymentError } = await supabase
      .from('workspace_deployed_teams')
      .select('workspace_id, active_config, deployed_by')
      .eq('status', 'active')

    if (deploymentError) {
      errors.push(`deployments_fetch: ${deploymentError.message}`)
    } else {
      for (const deployment of deployments || []) {
        const workspaceId = deployment.workspace_id
        const scheduleCount = uniqueCountByWorkspace.get(workspaceId) || 0

        if (scheduleCount > 0) {
          workspacesSkipped += 1
          continue
        }

        try {
          const config = deployment.active_config as DeployedTeamConfig | null
          if (!config) {
            workspacesSkipped += 1
            continue
          }

          const summary = await provisionDeploymentResources(
            supabase as unknown as ReturnType<typeof createAdminClient>,
            workspaceId,
            config,
            {
              channelCreatorId: deployment.deployed_by || null,
              createdByUserId: deployment.deployed_by || undefined,
              retryOnce: true,
            }
          )

          if (!summary.isComplete) {
            errors.push(
              `reprovision_${workspaceId}: provisioning_incomplete:${JSON.stringify({
                issues: summary.issues,
                expectedAgents: summary.expectedAgents,
                profiles: summary.profiles,
                channels: summary.channels,
                schedules: summary.schedules,
                templates: summary.templates,
              })}`
            )
            continue
          }

          workspacesReprovisioned += 1
        } catch (repairError) {
          errors.push(
            `reprovision_${workspaceId}: ${
              repairError instanceof Error ? repairError.message : 'unknown_error'
            }`
          )
        }
      }
    }
  }

  const result: RepairResult = {
    duplicatesFound: duplicates.length,
    duplicatesDeleted: deleted,
    indexCreated,
    workspacesReprovisioned,
    workspacesSkipped,
    errors,
  }

  if (user) {
    await logAdminAction(
      user.id,
      'repair_schedules',
      'agent_schedules',
      null,
      {
        dryRun,
        batchSize,
        ...result,
      },
      request
    )
  }

  return NextResponse.json({ success: true, result })
}

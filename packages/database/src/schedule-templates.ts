import { CronExpressionParser } from 'cron-parser'
import type { createAdminClient } from './server'

type AdminSupabaseClient = ReturnType<typeof createAdminClient>
type ScheduleTemplateRow = {
  agent_id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string | null
  task_prompt: string
  requires_approval: boolean
  output_config: unknown
}

type WorkspaceScheduleKeyRow = {
  agent_id: string
  name: string
}

/**
 * Calculate the next run time for a cron expression in the given timezone.
 * Uses cron-parser for accurate, timezone-aware cron calculation.
 */
export function getNextCronRunTime(cronExpression: string, timezone: string = 'UTC'): Date {
  try {
    const cron = CronExpressionParser.parse(cronExpression, {
      tz: timezone,
    })
    return cron.next().toDate()
  } catch (error) {
    console.error('[schedule] Failed to parse cron expression:', cronExpression, error)
    // Fallback: 1 minute from now
    return new Date(Date.now() + 60 * 1000)
  }
}

function dedupeTemplatesByKey(templates: ScheduleTemplateRow[]): ScheduleTemplateRow[] {
  const byKey = new Map<string, ScheduleTemplateRow>()

  for (const template of templates) {
    const key = `${template.agent_id}:${template.name}`
    if (!byKey.has(key)) {
      byKey.set(key, template)
    }
  }

  return Array.from(byKey.values())
}

function isDuplicateScheduleError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === '23505'
}

/**
 * Clone schedule templates for all agents in a deployment.
 * Called after team deployment to ensure all agents have their scheduled tasks.
 */
export async function cloneScheduleTemplatesForDeployment(
  supabase: AdminSupabaseClient,
  agentIds: string[],
  workspaceId: string,
  createdByUserId?: string
): Promise<void> {
  if (agentIds.length === 0) return

  try {
    // Fetch schedule templates for deployed agents
    const { data: templates, error: fetchError } = await supabase
      .from('agent_schedules')
      .select('*')
      .in('agent_id', agentIds)
      .eq('is_template', true)

    if (fetchError) {
      console.error('[auto-deploy] Error fetching schedule templates:', fetchError)
      return
    }

    if (!templates?.length) {
      console.log('[auto-deploy] No schedule templates to clone')
      return
    }

    // Some environments have historical duplicate templates for the same
    // (agent_id, name). Keep the first row only so clone inserts stay unique.
    const uniqueTemplates = dedupeTemplatesByKey(templates as ScheduleTemplateRow[])

    // Check for existing workspace schedules to avoid duplicates
    const { data: existingSchedules } = await supabase
      .from('agent_schedules')
      .select('agent_id, name')
      .eq('workspace_id', workspaceId)
      .eq('is_template', false)
      .in('agent_id', agentIds)

    const existingKeys = new Set(
      (existingSchedules || []).map((s: WorkspaceScheduleKeyRow) => `${s.agent_id}:${s.name}`)
    )

    // Clone templates that don't already exist for this workspace
    const schedulesToCreate = uniqueTemplates
      .filter((t: { agent_id: string; name: string }) => !existingKeys.has(`${t.agent_id}:${t.name}`))
      .map((template: ScheduleTemplateRow) => ({
        agent_id: template.agent_id,
        workspace_id: workspaceId,
        name: template.name,
        description: template.description,
        cron_expression: template.cron_expression,
        timezone: template.timezone || 'UTC',
        task_prompt: template.task_prompt,
        requires_approval: template.requires_approval,
        output_config: template.output_config,
        is_enabled: true,
        is_template: false,
        next_run_at: getNextCronRunTime(template.cron_expression, template.timezone || 'UTC').toISOString(),
        created_by: createdByUserId || null,
      }))

    if (schedulesToCreate.length === 0) {
      console.log('[auto-deploy] All schedule templates already cloned for workspace')
      return
    }

    let createdCount = 0
    const chunkSize = 500

    for (let i = 0; i < schedulesToCreate.length; i += chunkSize) {
      const chunk = schedulesToCreate.slice(i, i + chunkSize)
      const { error: chunkError } = await supabase
        .from('agent_schedules')
        .insert(chunk)

      if (!chunkError) {
        createdCount += chunk.length
        continue
      }

      // Race-safe fallback: insert rows one by one and ignore duplicate-key errors.
      if (isDuplicateScheduleError(chunkError)) {
        for (const schedule of chunk) {
          const { error: rowError } = await supabase
            .from('agent_schedules')
            .insert(schedule)

          if (!rowError) {
            createdCount += 1
            continue
          }

          if (!isDuplicateScheduleError(rowError)) {
            console.error('[auto-deploy] Error cloning schedule template row:', rowError)
          }
        }

        continue
      }

      console.error('[auto-deploy] Error cloning schedule templates:', chunkError)
    }

    console.log(`[auto-deploy] Cloned ${createdCount} schedule templates for workspace ${workspaceId}`)
  } catch (error) {
    // Log but don't fail the deployment if schedule cloning fails
    console.error('[auto-deploy] Error in cloneScheduleTemplatesForDeployment:', error)
  }
}

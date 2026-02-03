import type { createAdminClient } from './server'

type AdminSupabaseClient = ReturnType<typeof createAdminClient>

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
    // Fetch all schedule templates for these agents in one query
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

    // Check for existing workspace schedules to avoid duplicates
    const { data: existingSchedules } = await supabase
      .from('agent_schedules')
      .select('agent_id, name')
      .eq('workspace_id', workspaceId)
      .eq('is_template', false)

    const existingKeys = new Set(
      (existingSchedules || []).map((s: { agent_id: string; name: string }) => `${s.agent_id}:${s.name}`)
    )

    // Clone templates that don't already exist for this workspace
    const schedulesToCreate = templates
      .filter((t: { agent_id: string; name: string }) => !existingKeys.has(`${t.agent_id}:${t.name}`))
      .map((template: {
        agent_id: string
        name: string
        description: string | null
        cron_expression: string
        timezone: string | null
        task_prompt: string
        requires_approval: boolean
        output_config: unknown
      }) => ({
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
        // Set next_run_at to 1 minute from now - the scheduler will calculate the actual time
        next_run_at: new Date(Date.now() + 60 * 1000).toISOString(),
        created_by: createdByUserId || null,
      }))

    if (schedulesToCreate.length === 0) {
      console.log('[auto-deploy] All schedule templates already cloned for workspace')
      return
    }

    const { error: insertError } = await supabase
      .from('agent_schedules')
      .insert(schedulesToCreate)

    if (insertError) {
      console.error('[auto-deploy] Error cloning schedule templates:', insertError)
    } else {
      console.log(`[auto-deploy] Cloned ${schedulesToCreate.length} schedule templates for workspace ${workspaceId}`)
    }
  } catch (error) {
    // Log but don't fail the deployment if schedule cloning fails
    console.error('[auto-deploy] Error in cloneScheduleTemplatesForDeployment:', error)
  }
}

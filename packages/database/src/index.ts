// Client
export { createClient, getSupabaseClient } from './client'

// Server
export { createServerSupabaseClient, createAdminClient } from './server'

// Types
export * from './types'

// Queries
export * from './queries'

// Auto-deploy
export {
  autoDeployTeamForPlan,
  getWorkspaceDeployment,
  toggleAgentEnabled,
  type AutoDeployResult,
  type DeployedTeamConfig,
  type DeployedAgent,
  type Customizations,
} from './auto-deploy'

// Schedule templates
export { cloneScheduleTemplatesForDeployment } from './schedule-templates'
export { ensureAgentResourcesForDeployment } from './agent-resources'
export { provisionDeploymentResources } from './deployment-resources'

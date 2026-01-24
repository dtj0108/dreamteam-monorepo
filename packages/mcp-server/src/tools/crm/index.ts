// CRM tools barrel export
export { contactTools } from './contacts.js'
export { leadTools } from './leads.js'
export { pipelineTools } from './pipelines.js'
export { dealTools } from './deals.js'
export { activityTools } from './activities.js'

// Combined CRM tools
import { contactTools } from './contacts.js'
import { leadTools } from './leads.js'
import { pipelineTools } from './pipelines.js'
import { dealTools } from './deals.js'
import { activityTools } from './activities.js'

export const crmTools = {
  ...contactTools,
  ...leadTools,
  ...pipelineTools,
  ...dealTools,
  ...activityTools,
}

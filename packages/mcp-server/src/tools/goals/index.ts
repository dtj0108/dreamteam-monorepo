// Goals tools barrel export
export { goalTools } from './goals.js'
export { exitPlanTools } from './exit-plan.js'
export { kpiTools } from './kpis.js'

// Combined Goals tools
import { goalTools } from './goals.js'
import { exitPlanTools } from './exit-plan.js'
import { kpiTools } from './kpis.js'

export const goalsTools = {
  ...goalTools,
  ...exitPlanTools,
  ...kpiTools,
}

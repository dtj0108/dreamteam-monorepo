// Projects tools barrel export
export { departmentTools } from './departments.js'
export { projectTools } from './projects.js'
export { taskTools } from './tasks.js'
export { milestoneTools } from './milestones.js'

// Combined Projects tools
import { departmentTools } from './departments.js'
import { projectTools } from './projects.js'
import { taskTools } from './tasks.js'
import { milestoneTools } from './milestones.js'

export const projectsTools = {
  ...departmentTools,
  ...projectTools,
  ...taskTools,
  ...milestoneTools,
}

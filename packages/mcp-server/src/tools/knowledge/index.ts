// Knowledge tools barrel export
export { knowledgeCategoryTools } from './categories.js'
export { knowledgeTemplateTools } from './templates.js'
export { knowledgePageTools } from './pages.js'
export { knowledgeWhiteboardTools } from './whiteboards.js'

// Combined Knowledge tools
import { knowledgeCategoryTools } from './categories.js'
import { knowledgeTemplateTools } from './templates.js'
import { knowledgePageTools } from './pages.js'
import { knowledgeWhiteboardTools } from './whiteboards.js'

export const knowledgeTools = {
  ...knowledgeCategoryTools,
  ...knowledgeTemplateTools,
  ...knowledgePageTools,
  ...knowledgeWhiteboardTools,
}

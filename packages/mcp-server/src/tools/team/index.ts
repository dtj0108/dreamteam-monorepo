// Team tools barrel export
export { workspaceTools } from './workspace.js'
export { channelTools } from './channels.js'
export { messageTools } from './messages.js'
export { dmTools } from './dm.js'

// Combined Team tools
import { workspaceTools } from './workspace.js'
import { channelTools } from './channels.js'
import { messageTools } from './messages.js'
import { dmTools } from './dm.js'

export const teamTools = {
  ...workspaceTools,
  ...channelTools,
  ...messageTools,
  ...dmTools,
}

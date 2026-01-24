// Communications tools barrel export
export { phoneNumberTools } from './phone-numbers.js'
export { smsTools } from './sms.js'
export { callTools } from './calls.js'

// Combined Communications tools
import { phoneNumberTools } from './phone-numbers.js'
import { smsTools } from './sms.js'
import { callTools } from './calls.js'

export const communicationsTools = {
  ...phoneNumberTools,
  ...smsTools,
  ...callTools,
}

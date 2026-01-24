// Finance tools barrel export
export { accountTools } from './accounts.js'
export { transactionTools } from './transactions.js'
export { categoryTools } from './categories.js'
export { budgetTools } from './budgets.js'
export { subscriptionTools } from './subscriptions.js'
export { recurringRuleTools } from './recurring-rules.js'
export { analyticsTools } from './analytics.js'

// Combined finance tools
import { accountTools } from './accounts.js'
import { transactionTools } from './transactions.js'
import { categoryTools } from './categories.js'
import { budgetTools } from './budgets.js'
import { subscriptionTools } from './subscriptions.js'
import { recurringRuleTools } from './recurring-rules.js'
import { analyticsTools } from './analytics.js'

export const financeTools = {
  ...accountTools,
  ...transactionTools,
  ...categoryTools,
  ...budgetTools,
  ...subscriptionTools,
  ...recurringRuleTools,
  ...analyticsTools,
}

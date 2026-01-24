// Demo data representing a realistic SaaS business
// Company: "CloudSync" - A B2B file syncing SaaS

export interface DemoAccount {
  id: string
  name: string
  type: string
  institution: string | null
  balance: number
  currency: string
  last_four: string | null
}

export interface DemoTransaction {
  id: string
  description: string
  amount: number
  date: string
  account_id: string
  accountName: string
  category_id: string
  categoryName: string
  categoryColor: string
  type: "income" | "expense"
  notes?: string
}

export interface DemoBudget {
  id: string
  name: string
  amount: number
  spent: number
  category_id: string
  categories: { name: string; color: string }
  period: "monthly" | "yearly"
}

export interface DemoSubscription {
  id: string
  name: string
  amount: number
  billing_cycle: "monthly" | "yearly"
  next_billing_date: string
  category_id: string
  categoryName: string
  status: "active" | "cancelled" | "paused"
  logo_url?: string
}

export interface DemoGoal {
  id: string
  name: string
  type: "revenue" | "profit" | "savings"
  target_amount: number
  current_amount: number
  target_date: string
  created_at: string
}

export interface DemoExitPlan {
  id: string
  target_valuation: number
  target_multiple: number
  target_date: string
  current_arr: number
  current_valuation: number
  milestones: {
    id: string
    title: string
    completed: boolean
    target_date: string
  }[]
}

export interface DemoCategory {
  id: string
  name: string
  color: string
  type: "income" | "expense"
}

export interface DemoOverviewData {
  currentMonth: { income: number; expenses: number; profit: number }
  lastMonth: { income: number; expenses: number; profit: number }
  allTime: { income: number; expenses: number; profit: number }
  changes: { income: number; expenses: number; profit: number }
  totalBalance: number
  accountCount: number
  trend: { month: string; label: string; income: number; expenses: number; profit: number }[]
}

// Categories
export const demoCategories: DemoCategory[] = [
  { id: "cat-1", name: "Revenue", color: "#10b981", type: "income" },
  { id: "cat-2", name: "Consulting", color: "#06b6d4", type: "income" },
  { id: "cat-3", name: "Payroll", color: "#8b5cf6", type: "expense" },
  { id: "cat-4", name: "Infrastructure", color: "#f59e0b", type: "expense" },
  { id: "cat-5", name: "Software", color: "#3b82f6", type: "expense" },
  { id: "cat-6", name: "Marketing", color: "#ec4899", type: "expense" },
  { id: "cat-7", name: "Office", color: "#6366f1", type: "expense" },
  { id: "cat-8", name: "Professional Services", color: "#14b8a6", type: "expense" },
  { id: "cat-9", name: "Travel", color: "#f97316", type: "expense" },
  { id: "cat-10", name: "Contractors", color: "#a855f7", type: "expense" },
]

// Accounts
export const demoAccounts: DemoAccount[] = [
  {
    id: "acc-1",
    name: "Mercury Checking",
    type: "checking",
    institution: "Mercury",
    balance: 84750.32,
    currency: "USD",
    last_four: "4521",
  },
  {
    id: "acc-2",
    name: "Mercury Savings",
    type: "savings",
    institution: "Mercury",
    balance: 200000.0,
    currency: "USD",
    last_four: "8834",
  },
  {
    id: "acc-3",
    name: "Brex Credit Card",
    type: "credit_card",
    institution: "Brex",
    balance: -12340.67,
    currency: "USD",
    last_four: "9012",
  },
]

// Helper to generate dates
const today = new Date()
const daysAgo = (days: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() - days)
  return d.toISOString().split("T")[0]
}

const daysFromNow = (days: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

// Transactions (last 60 days of activity)
export const demoTransactions: DemoTransaction[] = [
  // Recent income
  { id: "tx-1", description: "Stripe - MRR December", amount: 78500, date: daysAgo(1), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-1", categoryName: "Revenue", categoryColor: "#10b981", type: "income" },
  { id: "tx-2", description: "Consulting - TechCorp Integration", amount: 12000, date: daysAgo(3), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-2", categoryName: "Consulting", categoryColor: "#06b6d4", type: "income" },
  { id: "tx-3", description: "Stripe - Enterprise License", amount: 24000, date: daysAgo(5), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-1", categoryName: "Revenue", categoryColor: "#10b981", type: "income" },
  
  // Payroll
  { id: "tx-4", description: "Gusto Payroll - December", amount: -42500, date: daysAgo(2), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-3", categoryName: "Payroll", categoryColor: "#8b5cf6", type: "expense" },
  { id: "tx-5", description: "Gusto Payroll - November", amount: -42500, date: daysAgo(32), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-3", categoryName: "Payroll", categoryColor: "#8b5cf6", type: "expense" },
  
  // Infrastructure
  { id: "tx-6", description: "AWS - December", amount: -3847.23, date: daysAgo(4), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-4", categoryName: "Infrastructure", categoryColor: "#f59e0b", type: "expense" },
  { id: "tx-7", description: "Vercel Pro", amount: -400, date: daysAgo(6), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-4", categoryName: "Infrastructure", categoryColor: "#f59e0b", type: "expense" },
  { id: "tx-8", description: "Cloudflare", amount: -200, date: daysAgo(8), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-4", categoryName: "Infrastructure", categoryColor: "#f59e0b", type: "expense" },
  
  // Software subscriptions
  { id: "tx-9", description: "Slack Business+", amount: -1250, date: daysAgo(7), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-5", categoryName: "Software", categoryColor: "#3b82f6", type: "expense" },
  { id: "tx-10", description: "HubSpot CRM", amount: -3200, date: daysAgo(10), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-5", categoryName: "Software", categoryColor: "#3b82f6", type: "expense" },
  { id: "tx-11", description: "Figma Organization", amount: -540, date: daysAgo(12), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-5", categoryName: "Software", categoryColor: "#3b82f6", type: "expense" },
  { id: "tx-12", description: "GitHub Enterprise", amount: -840, date: daysAgo(14), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-5", categoryName: "Software", categoryColor: "#3b82f6", type: "expense" },
  { id: "tx-13", description: "Notion Team", amount: -320, date: daysAgo(15), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-5", categoryName: "Software", categoryColor: "#3b82f6", type: "expense" },
  { id: "tx-14", description: "Linear", amount: -160, date: daysAgo(16), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-5", categoryName: "Software", categoryColor: "#3b82f6", type: "expense" },
  
  // Marketing
  { id: "tx-15", description: "Google Ads", amount: -2800, date: daysAgo(5), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-6", categoryName: "Marketing", categoryColor: "#ec4899", type: "expense" },
  { id: "tx-16", description: "LinkedIn Ads", amount: -1500, date: daysAgo(9), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-6", categoryName: "Marketing", categoryColor: "#ec4899", type: "expense" },
  { id: "tx-17", description: "Webflow - Website", amount: -49, date: daysAgo(11), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-6", categoryName: "Marketing", categoryColor: "#ec4899", type: "expense" },
  
  // Professional services
  { id: "tx-18", description: "Bench Accounting", amount: -500, date: daysAgo(13), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-8", categoryName: "Professional Services", categoryColor: "#14b8a6", type: "expense" },
  { id: "tx-19", description: "Legal - Cooley LLP", amount: -2500, date: daysAgo(20), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-8", categoryName: "Professional Services", categoryColor: "#14b8a6", type: "expense" },
  
  // Contractors
  { id: "tx-20", description: "Contractor - Design Work", amount: -4500, date: daysAgo(8), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-10", categoryName: "Contractors", categoryColor: "#a855f7", type: "expense" },
  { id: "tx-21", description: "Contractor - Content Writing", amount: -2000, date: daysAgo(18), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-10", categoryName: "Contractors", categoryColor: "#a855f7", type: "expense" },
  
  // More income from last month
  { id: "tx-22", description: "Stripe - MRR November", amount: 72000, date: daysAgo(31), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-1", categoryName: "Revenue", categoryColor: "#10b981", type: "income" },
  { id: "tx-23", description: "Consulting - StartupXYZ", amount: 8000, date: daysAgo(35), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-2", categoryName: "Consulting", categoryColor: "#06b6d4", type: "income" },
  { id: "tx-24", description: "Stripe - Annual License", amount: 36000, date: daysAgo(40), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-1", categoryName: "Revenue", categoryColor: "#10b981", type: "income" },
  
  // Last month expenses
  { id: "tx-25", description: "AWS - November", amount: -3512.45, date: daysAgo(34), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-4", categoryName: "Infrastructure", categoryColor: "#f59e0b", type: "expense" },
  { id: "tx-26", description: "Google Ads", amount: -2400, date: daysAgo(36), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-6", categoryName: "Marketing", categoryColor: "#ec4899", type: "expense" },
  { id: "tx-27", description: "Slack Business+", amount: -1250, date: daysAgo(37), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-5", categoryName: "Software", categoryColor: "#3b82f6", type: "expense" },
  { id: "tx-28", description: "Contractor - Mobile Dev", amount: -6000, date: daysAgo(38), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-10", categoryName: "Contractors", categoryColor: "#a855f7", type: "expense" },
  
  // Older transactions for trend data
  { id: "tx-29", description: "Stripe - MRR October", amount: 68000, date: daysAgo(61), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-1", categoryName: "Revenue", categoryColor: "#10b981", type: "income" },
  { id: "tx-30", description: "Gusto Payroll - October", amount: -40000, date: daysAgo(62), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-3", categoryName: "Payroll", categoryColor: "#8b5cf6", type: "expense" },
  { id: "tx-31", description: "AWS - October", amount: -3200, date: daysAgo(64), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-4", categoryName: "Infrastructure", categoryColor: "#f59e0b", type: "expense" },
  
  // Additional variety
  { id: "tx-32", description: "Office Snacks - Snack Nation", amount: -450, date: daysAgo(19), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-7", categoryName: "Office", categoryColor: "#6366f1", type: "expense" },
  { id: "tx-33", description: "WeWork - December", amount: -3500, date: daysAgo(3), account_id: "acc-1", accountName: "Mercury Checking", category_id: "cat-7", categoryName: "Office", categoryColor: "#6366f1", type: "expense" },
  { id: "tx-34", description: "Team Dinner - Holiday Party", amount: -1200, date: daysAgo(7), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-7", categoryName: "Office", categoryColor: "#6366f1", type: "expense" },
  { id: "tx-35", description: "Flight - SFO to NYC", amount: -680, date: daysAgo(22), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-9", categoryName: "Travel", categoryColor: "#f97316", type: "expense" },
  { id: "tx-36", description: "Hotel - NYC Conference", amount: -890, date: daysAgo(21), account_id: "acc-3", accountName: "Brex Credit Card", category_id: "cat-9", categoryName: "Travel", categoryColor: "#f97316", type: "expense" },
]

// Budgets
export const demoBudgets: DemoBudget[] = [
  {
    id: "budget-1",
    name: "Payroll",
    amount: 45000,
    spent: 42500,
    category_id: "cat-3",
    categories: { name: "Payroll", color: "#8b5cf6" },
    period: "monthly",
  },
  {
    id: "budget-2",
    name: "Infrastructure",
    amount: 5000,
    spent: 4447.23,
    category_id: "cat-4",
    categories: { name: "Infrastructure", color: "#f59e0b" },
    period: "monthly",
  },
  {
    id: "budget-3",
    name: "Software & Tools",
    amount: 8000,
    spent: 6310,
    category_id: "cat-5",
    categories: { name: "Software", color: "#3b82f6" },
    period: "monthly",
  },
  {
    id: "budget-4",
    name: "Marketing",
    amount: 6000,
    spent: 4349,
    category_id: "cat-6",
    categories: { name: "Marketing", color: "#ec4899" },
    period: "monthly",
  },
  {
    id: "budget-5",
    name: "Office & Team",
    amount: 6000,
    spent: 5150,
    category_id: "cat-7",
    categories: { name: "Office", color: "#6366f1" },
    period: "monthly",
  },
]

// Subscriptions
export const demoSubscriptions: DemoSubscription[] = [
  { id: "sub-1", name: "AWS", amount: 3847.23, billing_cycle: "monthly", next_billing_date: daysFromNow(26), category_id: "cat-4", categoryName: "Infrastructure", status: "active" },
  { id: "sub-2", name: "Vercel Pro", amount: 400, billing_cycle: "monthly", next_billing_date: daysFromNow(24), category_id: "cat-4", categoryName: "Infrastructure", status: "active" },
  { id: "sub-3", name: "Slack Business+", amount: 1250, billing_cycle: "monthly", next_billing_date: daysFromNow(23), category_id: "cat-5", categoryName: "Software", status: "active" },
  { id: "sub-4", name: "HubSpot CRM", amount: 3200, billing_cycle: "monthly", next_billing_date: daysFromNow(20), category_id: "cat-5", categoryName: "Software", status: "active" },
  { id: "sub-5", name: "Figma Organization", amount: 540, billing_cycle: "monthly", next_billing_date: daysFromNow(18), category_id: "cat-5", categoryName: "Software", status: "active" },
  { id: "sub-6", name: "GitHub Enterprise", amount: 840, billing_cycle: "monthly", next_billing_date: daysFromNow(16), category_id: "cat-5", categoryName: "Software", status: "active" },
  { id: "sub-7", name: "Notion Team", amount: 320, billing_cycle: "monthly", next_billing_date: daysFromNow(15), category_id: "cat-5", categoryName: "Software", status: "active" },
  { id: "sub-8", name: "Linear", amount: 160, billing_cycle: "monthly", next_billing_date: daysFromNow(14), category_id: "cat-5", categoryName: "Software", status: "active" },
  { id: "sub-9", name: "Cloudflare", amount: 200, billing_cycle: "monthly", next_billing_date: daysFromNow(22), category_id: "cat-4", categoryName: "Infrastructure", status: "active" },
  { id: "sub-10", name: "WeWork", amount: 3500, billing_cycle: "monthly", next_billing_date: daysFromNow(3), category_id: "cat-7", categoryName: "Office", status: "active" },
]

// Goals
export const demoGoals: DemoGoal[] = [
  {
    id: "goal-1",
    name: "Monthly Revenue Target",
    type: "revenue",
    target_amount: 100000,
    current_amount: 78500,
    target_date: daysFromNow(30),
    created_at: daysAgo(90),
  },
  {
    id: "goal-2",
    name: "Quarterly Profit Goal",
    type: "profit",
    target_amount: 75000,
    current_amount: 52000,
    target_date: daysFromNow(60),
    created_at: daysAgo(60),
  },
  {
    id: "goal-3",
    name: "Emergency Fund",
    type: "savings",
    target_amount: 250000,
    current_amount: 200000,
    target_date: daysFromNow(180),
    created_at: daysAgo(120),
  },
]

// Exit Plan
export const demoExitPlan: DemoExitPlan = {
  id: "exit-1",
  target_valuation: 5000000,
  target_multiple: 5,
  target_date: daysFromNow(730), // 2 years
  current_arr: 942000, // 78,500 * 12
  current_valuation: 3768000, // 4x current ARR
  milestones: [
    { id: "m-1", title: "Reach $100K MRR", completed: false, target_date: daysFromNow(90) },
    { id: "m-2", title: "Hit 25% profit margin", completed: true, target_date: daysAgo(30) },
    { id: "m-3", title: "Reduce churn to <5%", completed: true, target_date: daysAgo(60) },
    { id: "m-4", title: "Hire VP of Sales", completed: false, target_date: daysFromNow(120) },
    { id: "m-5", title: "Launch Enterprise tier", completed: false, target_date: daysFromNow(180) },
    { id: "m-6", title: "Reach $1.2M ARR", completed: false, target_date: daysFromNow(365) },
  ],
}

// Calculate overview data dynamically
export function getDemoOverviewData(): DemoOverviewData {
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const currentMonthTx = demoTransactions.filter((tx) => new Date(tx.date) >= currentMonthStart)
  const lastMonthTx = demoTransactions.filter(
    (tx) => new Date(tx.date) >= lastMonthStart && new Date(tx.date) <= lastMonthEnd
  )

  const sumIncome = (txs: DemoTransaction[]) => txs.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)
  const sumExpenses = (txs: DemoTransaction[]) => Math.abs(txs.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0))

  const currentMonth = {
    income: sumIncome(currentMonthTx),
    expenses: sumExpenses(currentMonthTx),
    profit: sumIncome(currentMonthTx) - sumExpenses(currentMonthTx),
  }

  const lastMonth = {
    income: sumIncome(lastMonthTx),
    expenses: sumExpenses(lastMonthTx),
    profit: sumIncome(lastMonthTx) - sumExpenses(lastMonthTx),
  }

  const allTimeIncome = sumIncome(demoTransactions)
  const allTimeExpenses = sumExpenses(demoTransactions)

  const calcChange = (current: number, last: number) => (last === 0 ? 0 : ((current - last) / last) * 100)

  const totalBalance = demoAccounts.reduce((sum, acc) => sum + acc.balance, 0)

  // Generate trend data for last 6 months
  const trend = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short" })
    
    // Simulate growing revenue
    const baseIncome = 60000 + (5 - i) * 5000 + Math.random() * 5000
    const baseExpenses = 45000 + (5 - i) * 2000 + Math.random() * 3000
    
    trend.push({
      month: monthDate.toISOString(),
      label: monthLabel,
      income: Math.round(baseIncome),
      expenses: Math.round(baseExpenses),
      profit: Math.round(baseIncome - baseExpenses),
    })
  }

  return {
    currentMonth,
    lastMonth,
    allTime: {
      income: allTimeIncome,
      expenses: allTimeExpenses,
      profit: allTimeIncome - allTimeExpenses,
    },
    changes: {
      income: calcChange(currentMonth.income, lastMonth.income),
      expenses: calcChange(currentMonth.expenses, lastMonth.expenses),
      profit: calcChange(currentMonth.profit, lastMonth.profit),
    },
    totalBalance,
    accountCount: demoAccounts.length,
    trend,
  }
}

// Demo user
export const demoUser = {
  id: "demo-user",
  name: "Alex Chen",
  email: "alex@cloudsync.io",
  phone: "+1 (555) 123-4567",
  company: "CloudSync",
}

// Analytics data
export function getDemoExpensesByCategory() {
  const categoryTotals: Record<string, { name: string; color: string; total: number }> = {}
  
  demoTransactions
    .filter((tx) => tx.amount < 0)
    .forEach((tx) => {
      if (!categoryTotals[tx.category_id]) {
        categoryTotals[tx.category_id] = {
          name: tx.categoryName,
          color: tx.categoryColor,
          total: 0,
        }
      }
      categoryTotals[tx.category_id].total += Math.abs(tx.amount)
    })

  return Object.values(categoryTotals).sort((a, b) => b.total - a.total)
}

export function getDemoIncomeByCategory() {
  const categoryTotals: Record<string, { name: string; color: string; total: number }> = {}
  
  demoTransactions
    .filter((tx) => tx.amount > 0)
    .forEach((tx) => {
      if (!categoryTotals[tx.category_id]) {
        categoryTotals[tx.category_id] = {
          name: tx.categoryName,
          color: tx.categoryColor,
          total: 0,
        }
      }
      categoryTotals[tx.category_id].total += tx.amount
    })

  return Object.values(categoryTotals).sort((a, b) => b.total - a.total)
}

export function getDemoCashFlow() {
  const overview = getDemoOverviewData()
  return {
    trend: overview.trend,
    summary: {
      totalInflow: overview.allTime.income,
      totalOutflow: overview.allTime.expenses,
      netCashFlow: overview.allTime.profit,
      averageMonthlyInflow: overview.allTime.income / 6,
      averageMonthlyOutflow: overview.allTime.expenses / 6,
    },
  }
}

export function getDemoProfitLoss() {
  const overview = getDemoOverviewData()
  const expensesByCategory = getDemoExpensesByCategory()
  
  return {
    period: "This Month",
    revenue: overview.currentMonth.income,
    expenses: overview.currentMonth.expenses,
    grossProfit: overview.currentMonth.profit,
    grossMargin: ((overview.currentMonth.profit / overview.currentMonth.income) * 100).toFixed(1),
    expenseBreakdown: expensesByCategory,
    trend: overview.trend,
  }
}

// =============================================================================
// CRM MOCK DATA
// =============================================================================

export interface DemoLead {
  id: string
  name: string
  email: string
  company: string
  phone: string
  stage: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost"
  score: number
  value: number
  source: string
  lastContact: string
  createdAt: string
  assignedTo: string
  notes?: string
}

export interface DemoContact {
  id: string
  name: string
  email: string
  phone: string
  company: string
  title: string
  avatar?: string
  lastActivity: string
  createdAt: string
  tags: string[]
}

export interface DemoDeal {
  id: string
  name: string
  value: number
  stage: "discovery" | "proposal" | "negotiation" | "closed_won" | "closed_lost"
  probability: number
  expectedCloseDate: string
  contactId: string
  contactName: string
  company: string
  createdAt: string
  lastActivity: string
  assignedTo: string
}

export interface DemoPipelineStage {
  id: string
  name: string
  order: number
  color: string
  dealCount: number
  totalValue: number
}

export interface DemoActivity {
  id: string
  type: "call" | "email" | "meeting" | "note" | "task"
  title: string
  description: string
  date: string
  contactId?: string
  contactName?: string
  dealId?: string
  dealName?: string
  completed: boolean
  assignedTo: string
}

// CRM Data

export const demoLeads: DemoLead[] = [
  {
    id: "lead-1",
    name: "Sarah Chen",
    email: "sarah@techstart.io",
    company: "TechStart Inc",
    phone: "+1 (415) 555-0123",
    stage: "qualified",
    score: 85,
    value: 45000,
    source: "Website",
    lastContact: daysAgo(1),
    createdAt: daysAgo(14),
    assignedTo: "Alex Chen",
  },
  {
    id: "lead-2",
    name: "Marcus Johnson",
    email: "marcus@growthco.com",
    company: "GrowthCo",
    phone: "+1 (212) 555-0456",
    stage: "proposal",
    score: 92,
    value: 120000,
    source: "Referral",
    lastContact: daysAgo(0),
    createdAt: daysAgo(21),
    assignedTo: "Alex Chen",
  },
  {
    id: "lead-3",
    name: "Emily Rodriguez",
    email: "emily@datavault.io",
    company: "DataVault",
    phone: "+1 (650) 555-0789",
    stage: "contacted",
    score: 68,
    value: 28000,
    source: "LinkedIn",
    lastContact: daysAgo(3),
    createdAt: daysAgo(7),
    assignedTo: "Jordan Smith",
  },
  {
    id: "lead-4",
    name: "David Kim",
    email: "david@scalehq.com",
    company: "ScaleHQ",
    phone: "+1 (408) 555-0321",
    stage: "new",
    score: 45,
    value: 35000,
    source: "Cold Outreach",
    lastContact: daysAgo(5),
    createdAt: daysAgo(5),
    assignedTo: "Jordan Smith",
  },
  {
    id: "lead-5",
    name: "Amanda Foster",
    email: "amanda@nexustech.co",
    company: "NexusTech",
    phone: "+1 (312) 555-0654",
    stage: "qualified",
    score: 78,
    value: 67000,
    source: "Trade Show",
    lastContact: daysAgo(2),
    createdAt: daysAgo(18),
    assignedTo: "Alex Chen",
  },
  {
    id: "lead-6",
    name: "Robert Thompson",
    email: "robert@enterprise.io",
    company: "Enterprise Solutions",
    phone: "+1 (617) 555-0987",
    stage: "won",
    score: 95,
    value: 180000,
    source: "Website",
    lastContact: daysAgo(10),
    createdAt: daysAgo(45),
    assignedTo: "Alex Chen",
  },
  {
    id: "lead-7",
    name: "Jessica Wang",
    email: "jessica@innovatelabs.com",
    company: "InnovateLabs",
    phone: "+1 (510) 555-0147",
    stage: "contacted",
    score: 72,
    value: 52000,
    source: "Webinar",
    lastContact: daysAgo(1),
    createdAt: daysAgo(10),
    assignedTo: "Jordan Smith",
  },
  {
    id: "lead-8",
    name: "Michael Brown",
    email: "michael@cloudops.net",
    company: "CloudOps Inc",
    phone: "+1 (303) 555-0258",
    stage: "lost",
    score: 35,
    value: 40000,
    source: "Google Ads",
    lastContact: daysAgo(15),
    createdAt: daysAgo(30),
    assignedTo: "Jordan Smith",
    notes: "Went with competitor - pricing concerns",
  },
  {
    id: "lead-9",
    name: "Lisa Martinez",
    email: "lisa@financeplus.com",
    company: "FinancePlus",
    phone: "+1 (206) 555-0369",
    stage: "proposal",
    score: 88,
    value: 95000,
    source: "Referral",
    lastContact: daysAgo(0),
    createdAt: daysAgo(25),
    assignedTo: "Alex Chen",
  },
  {
    id: "lead-10",
    name: "Chris Anderson",
    email: "chris@startupzone.io",
    company: "StartupZone",
    phone: "+1 (415) 555-0741",
    stage: "new",
    score: 55,
    value: 22000,
    source: "Website",
    lastContact: daysAgo(2),
    createdAt: daysAgo(2),
    assignedTo: "Jordan Smith",
  },
  {
    id: "lead-11",
    name: "Nicole Davis",
    email: "nicole@mediahub.co",
    company: "MediaHub",
    phone: "+1 (323) 555-0852",
    stage: "qualified",
    score: 81,
    value: 73000,
    source: "Content Marketing",
    lastContact: daysAgo(1),
    createdAt: daysAgo(12),
    assignedTo: "Alex Chen",
  },
  {
    id: "lead-12",
    name: "James Wilson",
    email: "james@logisticspro.com",
    company: "LogisticsPro",
    phone: "+1 (972) 555-0963",
    stage: "contacted",
    score: 62,
    value: 48000,
    source: "LinkedIn",
    lastContact: daysAgo(4),
    createdAt: daysAgo(8),
    assignedTo: "Jordan Smith",
  },
]

export const demoContacts: DemoContact[] = [
  {
    id: "contact-1",
    name: "Sarah Chen",
    email: "sarah@techstart.io",
    phone: "+1 (415) 555-0123",
    company: "TechStart Inc",
    title: "VP of Engineering",
    lastActivity: daysAgo(1),
    createdAt: daysAgo(60),
    tags: ["Enterprise", "Tech"],
  },
  {
    id: "contact-2",
    name: "Marcus Johnson",
    email: "marcus@growthco.com",
    phone: "+1 (212) 555-0456",
    company: "GrowthCo",
    title: "CEO",
    lastActivity: daysAgo(0),
    createdAt: daysAgo(45),
    tags: ["Decision Maker", "High Value"],
  },
  {
    id: "contact-3",
    name: "Emily Rodriguez",
    email: "emily@datavault.io",
    phone: "+1 (650) 555-0789",
    company: "DataVault",
    title: "CTO",
    lastActivity: daysAgo(3),
    createdAt: daysAgo(30),
    tags: ["Tech", "Startup"],
  },
  {
    id: "contact-4",
    name: "Robert Thompson",
    email: "robert@enterprise.io",
    phone: "+1 (617) 555-0987",
    company: "Enterprise Solutions",
    title: "Head of IT",
    lastActivity: daysAgo(10),
    createdAt: daysAgo(90),
    tags: ["Enterprise", "Customer"],
  },
  {
    id: "contact-5",
    name: "Amanda Foster",
    email: "amanda@nexustech.co",
    phone: "+1 (312) 555-0654",
    company: "NexusTech",
    title: "Director of Operations",
    lastActivity: daysAgo(2),
    createdAt: daysAgo(40),
    tags: ["Operations", "Mid-Market"],
  },
  {
    id: "contact-6",
    name: "Lisa Martinez",
    email: "lisa@financeplus.com",
    phone: "+1 (206) 555-0369",
    company: "FinancePlus",
    title: "CFO",
    lastActivity: daysAgo(0),
    createdAt: daysAgo(50),
    tags: ["Finance", "Enterprise"],
  },
  {
    id: "contact-7",
    name: "Nicole Davis",
    email: "nicole@mediahub.co",
    phone: "+1 (323) 555-0852",
    company: "MediaHub",
    title: "Marketing Director",
    lastActivity: daysAgo(1),
    createdAt: daysAgo(25),
    tags: ["Marketing", "Media"],
  },
  {
    id: "contact-8",
    name: "David Kim",
    email: "david@scalehq.com",
    phone: "+1 (408) 555-0321",
    company: "ScaleHQ",
    title: "Founder",
    lastActivity: daysAgo(5),
    createdAt: daysAgo(15),
    tags: ["Startup", "Founder"],
  },
]

export const demoDeals: DemoDeal[] = [
  {
    id: "deal-1",
    name: "TechStart Annual License",
    value: 45000,
    stage: "proposal",
    probability: 70,
    expectedCloseDate: daysFromNow(14),
    contactId: "contact-1",
    contactName: "Sarah Chen",
    company: "TechStart Inc",
    createdAt: daysAgo(14),
    lastActivity: daysAgo(1),
    assignedTo: "Alex Chen",
  },
  {
    id: "deal-2",
    name: "GrowthCo Enterprise",
    value: 120000,
    stage: "negotiation",
    probability: 85,
    expectedCloseDate: daysFromNow(7),
    contactId: "contact-2",
    contactName: "Marcus Johnson",
    company: "GrowthCo",
    createdAt: daysAgo(21),
    lastActivity: daysAgo(0),
    assignedTo: "Alex Chen",
  },
  {
    id: "deal-3",
    name: "DataVault Starter Plan",
    value: 28000,
    stage: "discovery",
    probability: 40,
    expectedCloseDate: daysFromNow(30),
    contactId: "contact-3",
    contactName: "Emily Rodriguez",
    company: "DataVault",
    createdAt: daysAgo(7),
    lastActivity: daysAgo(3),
    assignedTo: "Jordan Smith",
  },
  {
    id: "deal-4",
    name: "Enterprise Solutions Expansion",
    value: 180000,
    stage: "closed_won",
    probability: 100,
    expectedCloseDate: daysAgo(10),
    contactId: "contact-4",
    contactName: "Robert Thompson",
    company: "Enterprise Solutions",
    createdAt: daysAgo(45),
    lastActivity: daysAgo(10),
    assignedTo: "Alex Chen",
  },
  {
    id: "deal-5",
    name: "NexusTech Team Plan",
    value: 67000,
    stage: "proposal",
    probability: 65,
    expectedCloseDate: daysFromNow(21),
    contactId: "contact-5",
    contactName: "Amanda Foster",
    company: "NexusTech",
    createdAt: daysAgo(18),
    lastActivity: daysAgo(2),
    assignedTo: "Alex Chen",
  },
  {
    id: "deal-6",
    name: "FinancePlus Enterprise",
    value: 95000,
    stage: "negotiation",
    probability: 80,
    expectedCloseDate: daysFromNow(10),
    contactId: "contact-6",
    contactName: "Lisa Martinez",
    company: "FinancePlus",
    createdAt: daysAgo(25),
    lastActivity: daysAgo(0),
    assignedTo: "Alex Chen",
  },
  {
    id: "deal-7",
    name: "MediaHub Growth Plan",
    value: 73000,
    stage: "discovery",
    probability: 50,
    expectedCloseDate: daysFromNow(45),
    contactId: "contact-7",
    contactName: "Nicole Davis",
    company: "MediaHub",
    createdAt: daysAgo(12),
    lastActivity: daysAgo(1),
    assignedTo: "Alex Chen",
  },
  {
    id: "deal-8",
    name: "CloudOps Standard",
    value: 40000,
    stage: "closed_lost",
    probability: 0,
    expectedCloseDate: daysAgo(5),
    contactId: "contact-8",
    contactName: "David Kim",
    company: "ScaleHQ",
    createdAt: daysAgo(30),
    lastActivity: daysAgo(15),
    assignedTo: "Jordan Smith",
  },
]

export const demoPipelineStages: DemoPipelineStage[] = [
  { id: "stage-1", name: "Discovery", order: 1, color: "#6366f1", dealCount: 2, totalValue: 101000 },
  { id: "stage-2", name: "Proposal", order: 2, color: "#f59e0b", dealCount: 2, totalValue: 112000 },
  { id: "stage-3", name: "Negotiation", order: 3, color: "#8b5cf6", dealCount: 2, totalValue: 215000 },
  { id: "stage-4", name: "Closed Won", order: 4, color: "#10b981", dealCount: 1, totalValue: 180000 },
  { id: "stage-5", name: "Closed Lost", order: 5, color: "#ef4444", dealCount: 1, totalValue: 40000 },
]

export const demoActivities: DemoActivity[] = [
  {
    id: "activity-1",
    type: "call",
    title: "Discovery call with Marcus",
    description: "Discussed enterprise requirements and pricing",
    date: daysAgo(0),
    contactId: "contact-2",
    contactName: "Marcus Johnson",
    dealId: "deal-2",
    dealName: "GrowthCo Enterprise",
    completed: true,
    assignedTo: "Alex Chen",
  },
  {
    id: "activity-2",
    type: "email",
    title: "Sent proposal to Lisa",
    description: "Enterprise proposal with custom pricing",
    date: daysAgo(0),
    contactId: "contact-6",
    contactName: "Lisa Martinez",
    dealId: "deal-6",
    dealName: "FinancePlus Enterprise",
    completed: true,
    assignedTo: "Alex Chen",
  },
  {
    id: "activity-3",
    type: "meeting",
    title: "Product demo with Sarah",
    description: "Demo of new features for engineering team",
    date: daysAgo(1),
    contactId: "contact-1",
    contactName: "Sarah Chen",
    dealId: "deal-1",
    dealName: "TechStart Annual License",
    completed: true,
    assignedTo: "Alex Chen",
  },
  {
    id: "activity-4",
    type: "task",
    title: "Follow up with Amanda",
    description: "Send case studies and ROI calculator",
    date: daysFromNow(1),
    contactId: "contact-5",
    contactName: "Amanda Foster",
    dealId: "deal-5",
    dealName: "NexusTech Team Plan",
    completed: false,
    assignedTo: "Alex Chen",
  },
  {
    id: "activity-5",
    type: "call",
    title: "Contract negotiation call",
    description: "Final pricing discussion with GrowthCo",
    date: daysFromNow(2),
    contactId: "contact-2",
    contactName: "Marcus Johnson",
    dealId: "deal-2",
    dealName: "GrowthCo Enterprise",
    completed: false,
    assignedTo: "Alex Chen",
  },
  {
    id: "activity-6",
    type: "note",
    title: "Updated deal notes",
    description: "Added competitive intelligence from discovery call",
    date: daysAgo(2),
    contactId: "contact-5",
    contactName: "Amanda Foster",
    dealId: "deal-5",
    dealName: "NexusTech Team Plan",
    completed: true,
    assignedTo: "Alex Chen",
  },
  {
    id: "activity-7",
    type: "email",
    title: "Initial outreach to Emily",
    description: "Introductory email about our platform",
    date: daysAgo(3),
    contactId: "contact-3",
    contactName: "Emily Rodriguez",
    dealId: "deal-3",
    dealName: "DataVault Starter Plan",
    completed: true,
    assignedTo: "Jordan Smith",
  },
  {
    id: "activity-8",
    type: "meeting",
    title: "Quarterly business review",
    description: "QBR with Enterprise Solutions team",
    date: daysAgo(10),
    contactId: "contact-4",
    contactName: "Robert Thompson",
    dealId: "deal-4",
    dealName: "Enterprise Solutions Expansion",
    completed: true,
    assignedTo: "Alex Chen",
  },
]

// CRM Analytics functions
export function getDemoPipelineValue() {
  const activeDeals = demoDeals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost")
  const totalValue = activeDeals.reduce((sum, d) => sum + d.value, 0)
  const weightedValue = activeDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0)
  
  return {
    totalValue,
    weightedValue,
    dealCount: activeDeals.length,
    averageDealSize: totalValue / activeDeals.length,
  }
}

export function getDemoLeadsByStage() {
  const stages: Record<string, number> = {}
  demoLeads.forEach(lead => {
    stages[lead.stage] = (stages[lead.stage] || 0) + 1
  })
  return stages
}

export function getDemoRecentActivities(limit = 10) {
  return [...demoActivities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

// =============================================================================
// TEAM MOCK DATA
// =============================================================================

export interface DemoChannel {
  id: string
  name: string
  description: string
  memberCount: number
  unreadCount: number
  isPrivate: boolean
  createdAt: string
  lastMessageAt: string
}

export interface DemoTeamMember {
  id: string
  name: string
  email: string
  role: "owner" | "admin" | "member"
  avatar?: string
  status: "online" | "away" | "offline"
  title: string
  lastSeen: string
}

export interface DemoMessage {
  id: string
  channelId?: string
  dmId?: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: string
  reactions?: { emoji: string; count: number; users: string[] }[]
  isEdited?: boolean
  replyTo?: string
}

export interface DemoDMConversation {
  id: string
  participantId: string
  participantName: string
  participantAvatar?: string
  participantStatus: "online" | "away" | "offline"
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

// Team Data

export const demoTeamMembers: DemoTeamMember[] = [
  {
    id: "member-1",
    name: "Alex Chen",
    email: "alex@cloudsync.io",
    role: "owner",
    status: "online",
    title: "Founder & CEO",
    lastSeen: daysAgo(0),
  },
  {
    id: "member-2",
    name: "Jordan Smith",
    email: "jordan@cloudsync.io",
    role: "admin",
    status: "online",
    title: "Head of Sales",
    lastSeen: daysAgo(0),
  },
  {
    id: "member-3",
    name: "Taylor Wilson",
    email: "taylor@cloudsync.io",
    role: "member",
    status: "away",
    title: "Senior Engineer",
    lastSeen: daysAgo(0),
  },
  {
    id: "member-4",
    name: "Morgan Lee",
    email: "morgan@cloudsync.io",
    role: "member",
    status: "online",
    title: "Product Designer",
    lastSeen: daysAgo(0),
  },
  {
    id: "member-5",
    name: "Casey Johnson",
    email: "casey@cloudsync.io",
    role: "member",
    status: "offline",
    title: "Marketing Manager",
    lastSeen: daysAgo(1),
  },
  {
    id: "member-6",
    name: "Riley Martinez",
    email: "riley@cloudsync.io",
    role: "member",
    status: "online",
    title: "Customer Success",
    lastSeen: daysAgo(0),
  },
]

export const demoChannels: DemoChannel[] = [
  {
    id: "channel-1",
    name: "general",
    description: "Company-wide announcements and discussions",
    memberCount: 6,
    unreadCount: 3,
    isPrivate: false,
    createdAt: daysAgo(365),
    lastMessageAt: daysAgo(0),
  },
  {
    id: "channel-2",
    name: "engineering",
    description: "Technical discussions and updates",
    memberCount: 3,
    unreadCount: 0,
    isPrivate: false,
    createdAt: daysAgo(300),
    lastMessageAt: daysAgo(0),
  },
  {
    id: "channel-3",
    name: "sales",
    description: "Sales team updates and wins",
    memberCount: 3,
    unreadCount: 5,
    isPrivate: false,
    createdAt: daysAgo(250),
    lastMessageAt: daysAgo(0),
  },
  {
    id: "channel-4",
    name: "product",
    description: "Product roadmap and feature discussions",
    memberCount: 4,
    unreadCount: 2,
    isPrivate: false,
    createdAt: daysAgo(200),
    lastMessageAt: daysAgo(1),
  },
  {
    id: "channel-5",
    name: "leadership",
    description: "Leadership team discussions",
    memberCount: 2,
    unreadCount: 0,
    isPrivate: true,
    createdAt: daysAgo(365),
    lastMessageAt: daysAgo(2),
  },
]

// Helper for hours ago
const hoursAgo = (hours: number) => {
  const d = new Date()
  d.setHours(d.getHours() - hours)
  return d.toISOString()
}

const minutesAgo = (minutes: number) => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - minutes)
  return d.toISOString()
}

export const demoMessages: DemoMessage[] = [
  // General channel messages
  {
    id: "msg-1",
    channelId: "channel-1",
    senderId: "member-1",
    senderName: "Alex Chen",
    content: "Great news everyone! We just closed the GrowthCo deal. 🎉 This is our biggest enterprise customer yet!",
    timestamp: minutesAgo(15),
    reactions: [
      { emoji: "🎉", count: 4, users: ["member-2", "member-3", "member-4", "member-5"] },
      { emoji: "🚀", count: 2, users: ["member-2", "member-6"] },
    ],
  },
  {
    id: "msg-2",
    channelId: "channel-1",
    senderId: "member-2",
    senderName: "Jordan Smith",
    content: "Amazing work by the whole team on this one! Special shoutout to @Riley for the incredible demo.",
    timestamp: minutesAgo(12),
    reactions: [{ emoji: "💪", count: 3, users: ["member-1", "member-3", "member-6"] }],
  },
  {
    id: "msg-3",
    channelId: "channel-1",
    senderId: "member-6",
    senderName: "Riley Martinez",
    content: "Thank you! It was a team effort. Looking forward to the kickoff call next week.",
    timestamp: minutesAgo(10),
  },
  {
    id: "msg-4",
    channelId: "channel-1",
    senderId: "member-5",
    senderName: "Casey Johnson",
    content: "This is perfect timing for the case study we're working on. Can we schedule some time to discuss?",
    timestamp: minutesAgo(5),
  },

  // Engineering channel messages
  {
    id: "msg-5",
    channelId: "channel-2",
    senderId: "member-3",
    senderName: "Taylor Wilson",
    content: "Just pushed the new API endpoints for the reporting feature. Ready for review when you get a chance @Morgan",
    timestamp: hoursAgo(2),
  },
  {
    id: "msg-6",
    channelId: "channel-2",
    senderId: "member-4",
    senderName: "Morgan Lee",
    content: "Looking at it now! The response format looks clean. One question about the pagination...",
    timestamp: hoursAgo(1),
  },
  {
    id: "msg-7",
    channelId: "channel-2",
    senderId: "member-3",
    senderName: "Taylor Wilson",
    content: "Good catch. I'll add cursor-based pagination instead of offset. Should be more efficient for large datasets.",
    timestamp: minutesAgo(45),
  },
  {
    id: "msg-8",
    channelId: "channel-2",
    senderId: "member-1",
    senderName: "Alex Chen",
    content: "Nice work on this! Let me know when it's ready for prod. We have a customer demo Friday.",
    timestamp: minutesAgo(30),
  },

  // Sales channel messages
  {
    id: "msg-9",
    channelId: "channel-3",
    senderId: "member-2",
    senderName: "Jordan Smith",
    content: "Pipeline update: We're at $648K in active opportunities. On track for a record quarter! 📈",
    timestamp: hoursAgo(4),
  },
  {
    id: "msg-10",
    channelId: "channel-3",
    senderId: "member-6",
    senderName: "Riley Martinez",
    content: "Just got off a great call with FinancePlus. They're moving forward with the enterprise plan!",
    timestamp: hoursAgo(3),
  },
  {
    id: "msg-11",
    channelId: "channel-3",
    senderId: "member-2",
    senderName: "Jordan Smith",
    content: "That's fantastic! What was the deciding factor for them?",
    timestamp: hoursAgo(2.5),
  },
  {
    id: "msg-12",
    channelId: "channel-3",
    senderId: "member-6",
    senderName: "Riley Martinez",
    content: "The ROI calculator we shared really resonated. They calculated 40% time savings in their first year.",
    timestamp: hoursAgo(2),
  },
  {
    id: "msg-13",
    channelId: "channel-3",
    senderId: "member-2",
    senderName: "Jordan Smith",
    content: "Love it! @Casey we should feature this in our next case study.",
    timestamp: hoursAgo(1.5),
  },

  // Product channel messages
  {
    id: "msg-14",
    channelId: "channel-4",
    senderId: "member-4",
    senderName: "Morgan Lee",
    content: "Updated the design specs for the dashboard redesign. Check out the Figma link: [Dashboard v2.0]",
    timestamp: daysAgo(1),
  },
  {
    id: "msg-15",
    channelId: "channel-4",
    senderId: "member-1",
    senderName: "Alex Chen",
    content: "This looks great! I really like the new data visualization approach. When can we start building?",
    timestamp: daysAgo(1),
  },
  {
    id: "msg-16",
    channelId: "channel-4",
    senderId: "member-3",
    senderName: "Taylor Wilson",
    content: "I can start on the frontend components next sprint. The API work is almost done.",
    timestamp: daysAgo(1),
  },
  {
    id: "msg-17",
    channelId: "channel-4",
    senderId: "member-4",
    senderName: "Morgan Lee",
    content: "Perfect! I'll finalize the component library updates and hand off all assets by Wednesday.",
    timestamp: hoursAgo(20),
  },
]

export const demoDMConversations: DemoDMConversation[] = [
  {
    id: "dm-1",
    participantId: "member-2",
    participantName: "Jordan Smith",
    participantStatus: "online",
    lastMessage: "Let's sync up about the Q1 targets tomorrow morning",
    lastMessageAt: minutesAgo(30),
    unreadCount: 1,
  },
  {
    id: "dm-2",
    participantId: "member-3",
    participantName: "Taylor Wilson",
    participantStatus: "away",
    lastMessage: "The deploy went smoothly. All systems are green ✅",
    lastMessageAt: hoursAgo(2),
    unreadCount: 0,
  },
  {
    id: "dm-3",
    participantId: "member-4",
    participantName: "Morgan Lee",
    participantStatus: "online",
    lastMessage: "Thanks for the feedback on the designs!",
    lastMessageAt: hoursAgo(5),
    unreadCount: 0,
  },
  {
    id: "dm-4",
    participantId: "member-6",
    participantName: "Riley Martinez",
    participantStatus: "online",
    lastMessage: "Can you join the customer call at 3pm?",
    lastMessageAt: daysAgo(1),
    unreadCount: 0,
  },
]

// DM Messages
export const demoDMMessages: Record<string, DemoMessage[]> = {
  "dm-1": [
    {
      id: "dm-msg-1",
      dmId: "dm-1",
      senderId: "member-2",
      senderName: "Jordan Smith",
      content: "Hey! Great job on closing GrowthCo. That's going to be a game changer for us.",
      timestamp: hoursAgo(3),
    },
    {
      id: "dm-msg-2",
      dmId: "dm-1",
      senderId: "member-1",
      senderName: "Alex Chen",
      content: "Thanks! The whole sales team really came together on this one.",
      timestamp: hoursAgo(2.5),
    },
    {
      id: "dm-msg-3",
      dmId: "dm-1",
      senderId: "member-2",
      senderName: "Jordan Smith",
      content: "I think we should revisit our Q1 targets. We might be able to stretch them now.",
      timestamp: hoursAgo(2),
    },
    {
      id: "dm-msg-4",
      dmId: "dm-1",
      senderId: "member-1",
      senderName: "Alex Chen",
      content: "Good thinking. Let's look at the pipeline tomorrow and see where we stand.",
      timestamp: hoursAgo(1),
    },
    {
      id: "dm-msg-5",
      dmId: "dm-1",
      senderId: "member-2",
      senderName: "Jordan Smith",
      content: "Let's sync up about the Q1 targets tomorrow morning",
      timestamp: minutesAgo(30),
    },
  ],
  "dm-2": [
    {
      id: "dm-msg-6",
      dmId: "dm-2",
      senderId: "member-1",
      senderName: "Alex Chen",
      content: "How's the deploy going?",
      timestamp: hoursAgo(3),
    },
    {
      id: "dm-msg-7",
      dmId: "dm-2",
      senderId: "member-3",
      senderName: "Taylor Wilson",
      content: "Almost done. Just running the final migration scripts.",
      timestamp: hoursAgo(2.5),
    },
    {
      id: "dm-msg-8",
      dmId: "dm-2",
      senderId: "member-3",
      senderName: "Taylor Wilson",
      content: "The deploy went smoothly. All systems are green ✅",
      timestamp: hoursAgo(2),
    },
  ],
  "dm-3": [
    {
      id: "dm-msg-9",
      dmId: "dm-3",
      senderId: "member-1",
      senderName: "Alex Chen",
      content: "The new dashboard designs look amazing! Really love the direction.",
      timestamp: hoursAgo(6),
    },
    {
      id: "dm-msg-10",
      dmId: "dm-3",
      senderId: "member-4",
      senderName: "Morgan Lee",
      content: "Thanks for the feedback on the designs!",
      timestamp: hoursAgo(5),
    },
  ],
  "dm-4": [
    {
      id: "dm-msg-11",
      dmId: "dm-4",
      senderId: "member-6",
      senderName: "Riley Martinez",
      content: "We have a customer success call with Enterprise Solutions tomorrow.",
      timestamp: daysAgo(1),
    },
    {
      id: "dm-msg-12",
      dmId: "dm-4",
      senderId: "member-6",
      senderName: "Riley Martinez",
      content: "Can you join the customer call at 3pm?",
      timestamp: daysAgo(1),
    },
  ],
}

// Team analytics functions
export function getDemoUnreadCount() {
  const channelUnread = demoChannels.reduce((sum, c) => sum + c.unreadCount, 0)
  const dmUnread = demoDMConversations.reduce((sum, d) => sum + d.unreadCount, 0)
  return { channelUnread, dmUnread, total: channelUnread + dmUnread }
}

export function getDemoOnlineMembers() {
  return demoTeamMembers.filter(m => m.status === "online")
}

export function getDemoChannelMessages(channelId: string) {
  return demoMessages.filter(m => m.channelId === channelId)
}

// =============================================================================
// PROJECTS MOCK DATA (Matches real projects system)
// =============================================================================

export interface DemoProjectMember {
  id: string
  name: string
  avatar_url?: string
  role: "owner" | "admin" | "member" | "viewer"
}

export interface DemoProjectLabel {
  id: string
  name: string
  color: string
}

export interface DemoProject {
  id: string
  name: string
  description: string
  status: "active" | "on_hold" | "completed" | "archived"
  priority: "low" | "medium" | "high" | "critical"
  color: string
  icon: string
  start_date: string | null
  target_end_date: string | null
  progress: number
  totalTasks: number
  completedTasks: number
  owner: DemoProjectMember
  members: DemoProjectMember[]
  labels: DemoProjectLabel[]
}

export interface DemoProjectTask {
  id: string
  project_id: string
  parent_id: string | null
  title: string
  description: string | null
  status: "todo" | "in_progress" | "review" | "done"
  priority: "low" | "medium" | "high" | "urgent"
  start_date: string | null
  due_date: string | null
  estimated_hours: number | null
  position: number
  assignees: DemoProjectMember[]
  labels: DemoProjectLabel[]
  subtasks: DemoProjectTask[]
}

export interface DemoMilestone {
  id: string
  project_id: string
  name: string
  description: string | null
  target_date: string
  status: "upcoming" | "at_risk" | "completed" | "missed"
  progress: number
  completedTasks: number
  totalTasks: number
}

// Team members for projects
const projectMembers: DemoProjectMember[] = [
  { id: "pm-1", name: "Alex Chen", role: "owner" },
  { id: "pm-2", name: "Sarah Kim", role: "admin" },
  { id: "pm-3", name: "Taylor Wilson", role: "member" },
  { id: "pm-4", name: "Morgan Lee", role: "member" },
  { id: "pm-5", name: "Casey Johnson", role: "member" },
]

// Project labels
const projectLabels: DemoProjectLabel[] = [
  { id: "label-1", name: "Design", color: "#8b5cf6" },
  { id: "label-2", name: "Frontend", color: "#3b82f6" },
  { id: "label-3", name: "Backend", color: "#10b981" },
  { id: "label-4", name: "Bug", color: "#ef4444" },
  { id: "label-5", name: "Feature", color: "#f59e0b" },
  { id: "label-6", name: "Documentation", color: "#6366f1" },
  { id: "label-7", name: "Testing", color: "#ec4899" },
]

// Projects Data (CloudSync company context)
export const demoProjects: DemoProject[] = [
  {
    id: "proj-1",
    name: "Q1 Product Launch",
    description: "Launch the new reporting dashboard with real-time analytics",
    status: "active",
    priority: "high",
    color: "#3b82f6",
    icon: "rocket",
    start_date: daysAgo(30),
    target_end_date: daysFromNow(14),
    progress: 65,
    totalTasks: 12,
    completedTasks: 8,
    owner: projectMembers[0],
    members: [projectMembers[0], projectMembers[2], projectMembers[3]],
    labels: [projectLabels[1], projectLabels[2], projectLabels[4]],
  },
  {
    id: "proj-2",
    name: "Website Redesign",
    description: "Complete overhaul of marketing website with new brand identity",
    status: "active",
    priority: "medium",
    color: "#8b5cf6",
    icon: "palette",
    start_date: daysAgo(45),
    target_end_date: daysFromNow(21),
    progress: 40,
    totalTasks: 8,
    completedTasks: 3,
    owner: projectMembers[3],
    members: [projectMembers[3], projectMembers[4]],
    labels: [projectLabels[0], projectLabels[1]],
  },
  {
    id: "proj-3",
    name: "Mobile App v2",
    description: "Native mobile apps for iOS and Android with offline sync",
    status: "on_hold",
    priority: "medium",
    color: "#10b981",
    icon: "smartphone",
    start_date: daysFromNow(7),
    target_end_date: daysFromNow(90),
    progress: 0,
    totalTasks: 0,
    completedTasks: 0,
    owner: projectMembers[2],
    members: [projectMembers[2], projectMembers[3]],
    labels: [projectLabels[1], projectLabels[4]],
  },
  {
    id: "proj-4",
    name: "API Integration Hub",
    description: "Build integrations with Salesforce, HubSpot, and Zapier",
    status: "active",
    priority: "high",
    color: "#f59e0b",
    icon: "plug",
    start_date: daysAgo(21),
    target_end_date: daysFromNow(28),
    progress: 55,
    totalTasks: 6,
    completedTasks: 3,
    owner: projectMembers[2],
    members: [projectMembers[2]],
    labels: [projectLabels[2], projectLabels[5]],
  },
  {
    id: "proj-5",
    name: "Security Audit",
    description: "Annual security review and SOC 2 compliance preparation",
    status: "completed",
    priority: "critical",
    color: "#ef4444",
    icon: "shield",
    start_date: daysAgo(60),
    target_end_date: daysAgo(7),
    progress: 100,
    totalTasks: 5,
    completedTasks: 5,
    owner: projectMembers[0],
    members: [projectMembers[0], projectMembers[2]],
    labels: [projectLabels[5], projectLabels[6]],
  },
]

// Tasks Data (matches real system with 4 statuses)
export const demoProjectTasks: DemoProjectTask[] = [
  // Q1 Product Launch tasks
  {
    id: "task-1",
    project_id: "proj-1",
    parent_id: null,
    title: "Design dashboard wireframes",
    description: "Create low-fidelity wireframes for the new reporting dashboard",
    status: "done",
    priority: "high",
    start_date: daysAgo(28),
    due_date: daysAgo(14),
    estimated_hours: 16,
    position: 1,
    assignees: [projectMembers[3]],
    labels: [projectLabels[0]],
    subtasks: [],
  },
  {
    id: "task-2",
    project_id: "proj-1",
    parent_id: null,
    title: "Build API endpoints",
    description: "Create REST API for dashboard data retrieval",
    status: "done",
    priority: "high",
    start_date: daysAgo(25),
    due_date: daysAgo(7),
    estimated_hours: 24,
    position: 2,
    assignees: [projectMembers[2]],
    labels: [projectLabels[2]],
    subtasks: [],
  },
  {
    id: "task-3",
    project_id: "proj-1",
    parent_id: null,
    title: "Implement chart components",
    description: "Build reusable chart components for data visualization",
    status: "done",
    priority: "high",
    start_date: daysAgo(20),
    due_date: daysAgo(3),
    estimated_hours: 20,
    position: 3,
    assignees: [projectMembers[2], projectMembers[3]],
    labels: [projectLabels[1]],
    subtasks: [],
  },
  {
    id: "task-4",
    project_id: "proj-1",
    parent_id: null,
    title: "Create filter system",
    description: "Build date range and category filters for reports",
    status: "review",
    priority: "medium",
    start_date: daysAgo(10),
    due_date: daysFromNow(2),
    estimated_hours: 12,
    position: 4,
    assignees: [projectMembers[2]],
    labels: [projectLabels[1], projectLabels[4]],
    subtasks: [],
  },
  {
    id: "task-5",
    project_id: "proj-1",
    parent_id: null,
    title: "Write documentation",
    description: "Document API endpoints and usage examples",
    status: "in_progress",
    priority: "low",
    start_date: daysAgo(5),
    due_date: daysFromNow(10),
    estimated_hours: 8,
    position: 5,
    assignees: [projectMembers[2]],
    labels: [projectLabels[5]],
    subtasks: [],
  },
  {
    id: "task-6",
    project_id: "proj-1",
    parent_id: null,
    title: "QA testing",
    description: "Comprehensive testing of all dashboard features",
    status: "todo",
    priority: "urgent",
    start_date: null,
    due_date: daysFromNow(12),
    estimated_hours: 16,
    position: 6,
    assignees: [projectMembers[3], projectMembers[1]],
    labels: [projectLabels[6]],
    subtasks: [],
  },
  {
    id: "task-7",
    project_id: "proj-1",
    parent_id: null,
    title: "Performance optimization",
    description: "Optimize dashboard loading time and chart rendering",
    status: "todo",
    priority: "high",
    start_date: null,
    due_date: daysFromNow(8),
    estimated_hours: 12,
    position: 7,
    assignees: [projectMembers[2]],
    labels: [projectLabels[1], projectLabels[2]],
    subtasks: [],
  },

  // Website Redesign tasks
  {
    id: "task-8",
    project_id: "proj-2",
    parent_id: null,
    title: "Brand style guide",
    description: "Create comprehensive brand guidelines document",
    status: "done",
    priority: "high",
    start_date: daysAgo(40),
    due_date: daysAgo(21),
    estimated_hours: 24,
    position: 1,
    assignees: [projectMembers[3]],
    labels: [projectLabels[0]],
    subtasks: [],
  },
  {
    id: "task-9",
    project_id: "proj-2",
    parent_id: null,
    title: "Homepage design",
    description: "Design new homepage with hero section and features",
    status: "done",
    priority: "high",
    start_date: daysAgo(35),
    due_date: daysAgo(14),
    estimated_hours: 20,
    position: 2,
    assignees: [projectMembers[3]],
    labels: [projectLabels[0]],
    subtasks: [],
  },
  {
    id: "task-10",
    project_id: "proj-2",
    parent_id: null,
    title: "Write marketing copy",
    description: "Create compelling copy for all website pages",
    status: "review",
    priority: "medium",
    start_date: daysAgo(20),
    due_date: daysFromNow(5),
    estimated_hours: 16,
    position: 3,
    assignees: [projectMembers[4]],
    labels: [projectLabels[5]],
    subtasks: [],
  },
  {
    id: "task-11",
    project_id: "proj-2",
    parent_id: null,
    title: "Build landing pages",
    description: "Develop responsive landing pages",
    status: "in_progress",
    priority: "high",
    start_date: daysAgo(10),
    due_date: daysFromNow(14),
    estimated_hours: 32,
    position: 4,
    assignees: [projectMembers[3], projectMembers[2]],
    labels: [projectLabels[1]],
    subtasks: [],
  },
  {
    id: "task-12",
    project_id: "proj-2",
    parent_id: null,
    title: "SEO optimization",
    description: "Implement SEO best practices and meta tags",
    status: "todo",
    priority: "medium",
    start_date: null,
    due_date: daysFromNow(18),
    estimated_hours: 8,
    position: 5,
    assignees: [projectMembers[4]],
    labels: [projectLabels[4]],
    subtasks: [],
  },

  // API Integration Hub tasks
  {
    id: "task-13",
    project_id: "proj-4",
    parent_id: null,
    title: "Salesforce OAuth setup",
    description: "Configure OAuth 2.0 flow for Salesforce integration",
    status: "done",
    priority: "high",
    start_date: daysAgo(18),
    due_date: daysAgo(10),
    estimated_hours: 12,
    position: 1,
    assignees: [projectMembers[2]],
    labels: [projectLabels[2]],
    subtasks: [],
  },
  {
    id: "task-14",
    project_id: "proj-4",
    parent_id: null,
    title: "Build sync engine",
    description: "Create bidirectional sync engine for CRM data",
    status: "in_progress",
    priority: "urgent",
    start_date: daysAgo(14),
    due_date: daysFromNow(5),
    estimated_hours: 40,
    position: 2,
    assignees: [projectMembers[2]],
    labels: [projectLabels[2], projectLabels[4]],
    subtasks: [],
  },
  {
    id: "task-15",
    project_id: "proj-4",
    parent_id: null,
    title: "HubSpot integration",
    description: "Build HubSpot contacts and deals sync",
    status: "todo",
    priority: "medium",
    start_date: null,
    due_date: daysFromNow(21),
    estimated_hours: 24,
    position: 3,
    assignees: [projectMembers[2]],
    labels: [projectLabels[2]],
    subtasks: [],
  },
  {
    id: "task-16",
    project_id: "proj-4",
    parent_id: null,
    title: "Zapier connector",
    description: "Build Zapier triggers and actions",
    status: "todo",
    priority: "low",
    start_date: null,
    due_date: daysFromNow(28),
    estimated_hours: 20,
    position: 4,
    assignees: [projectMembers[2]],
    labels: [projectLabels[2], projectLabels[5]],
    subtasks: [],
  },

  // Security Audit tasks (all completed)
  {
    id: "task-17",
    project_id: "proj-5",
    parent_id: null,
    title: "Vulnerability scan",
    description: "Run automated security vulnerability scans",
    status: "done",
    priority: "urgent",
    start_date: daysAgo(55),
    due_date: daysAgo(30),
    estimated_hours: 8,
    position: 1,
    assignees: [projectMembers[2]],
    labels: [projectLabels[6]],
    subtasks: [],
  },
  {
    id: "task-18",
    project_id: "proj-5",
    parent_id: null,
    title: "Penetration testing",
    description: "Third-party penetration testing engagement",
    status: "done",
    priority: "urgent",
    start_date: daysAgo(50),
    due_date: daysAgo(20),
    estimated_hours: 40,
    position: 2,
    assignees: [projectMembers[0], projectMembers[2]],
    labels: [projectLabels[6]],
    subtasks: [],
  },
  {
    id: "task-19",
    project_id: "proj-5",
    parent_id: null,
    title: "SOC 2 documentation",
    description: "Prepare SOC 2 compliance documentation",
    status: "done",
    priority: "high",
    start_date: daysAgo(45),
    due_date: daysAgo(15),
    estimated_hours: 24,
    position: 3,
    assignees: [projectMembers[0]],
    labels: [projectLabels[5]],
    subtasks: [],
  },
]

// Milestones Data
export const demoMilestones: DemoMilestone[] = [
  {
    id: "mile-1",
    project_id: "proj-1",
    name: "Alpha Release",
    description: "Internal alpha release for testing",
    target_date: daysAgo(7),
    status: "completed",
    progress: 100,
    completedTasks: 3,
    totalTasks: 3,
  },
  {
    id: "mile-2",
    project_id: "proj-1",
    name: "Beta Release",
    description: "Public beta with select customers",
    target_date: daysFromNow(7),
    status: "at_risk",
    progress: 60,
    completedTasks: 3,
    totalTasks: 5,
  },
  {
    id: "mile-3",
    project_id: "proj-1",
    name: "Production Launch",
    description: "General availability release",
    target_date: daysFromNow(14),
    status: "upcoming",
    progress: 0,
    completedTasks: 0,
    totalTasks: 4,
  },
  {
    id: "mile-4",
    project_id: "proj-2",
    name: "Design Approval",
    description: "Final design sign-off from stakeholders",
    target_date: daysAgo(14),
    status: "completed",
    progress: 100,
    completedTasks: 2,
    totalTasks: 2,
  },
  {
    id: "mile-5",
    project_id: "proj-2",
    name: "Content Complete",
    description: "All website copy finalized",
    target_date: daysFromNow(7),
    status: "at_risk",
    progress: 50,
    completedTasks: 1,
    totalTasks: 2,
  },
  {
    id: "mile-6",
    project_id: "proj-2",
    name: "Site Launch",
    description: "New website goes live",
    target_date: daysFromNow(21),
    status: "upcoming",
    progress: 0,
    completedTasks: 0,
    totalTasks: 3,
  },
  {
    id: "mile-7",
    project_id: "proj-4",
    name: "Salesforce Live",
    description: "Salesforce integration available to customers",
    target_date: daysAgo(3),
    status: "completed",
    progress: 100,
    completedTasks: 1,
    totalTasks: 1,
  },
  {
    id: "mile-8",
    project_id: "proj-4",
    name: "All Integrations Live",
    description: "HubSpot and Zapier integrations complete",
    target_date: daysFromNow(28),
    status: "upcoming",
    progress: 0,
    completedTasks: 0,
    totalTasks: 2,
  },
]

// Export project members and labels for use in components
export { projectMembers as demoProjectMembers, projectLabels as demoProjectLabels }

// Projects analytics functions
export function getDemoProjectStats() {
  const active = demoProjects.filter(p => p.status === "active").length
  const completed = demoProjects.filter(p => p.status === "completed").length
  const onHold = demoProjects.filter(p => p.status === "on_hold").length
  const totalTasks = demoProjectTasks.length
  const completedTasks = demoProjectTasks.filter(t => t.status === "done").length
  const overdueTasks = demoProjectTasks.filter(t =>
    t.status !== "done" && t.due_date && new Date(t.due_date) < new Date()
  ).length

  return { active, completed, onHold, totalTasks, completedTasks, overdueTasks }
}

export function getDemoTasksByStatus() {
  return {
    todo: demoProjectTasks.filter(t => t.status === "todo"),
    in_progress: demoProjectTasks.filter(t => t.status === "in_progress"),
    review: demoProjectTasks.filter(t => t.status === "review"),
    done: demoProjectTasks.filter(t => t.status === "done"),
  }
}

export function getDemoTasksByProject(projectId: string) {
  return demoProjectTasks.filter(t => t.project_id === projectId)
}

export function getDemoProjectById(projectId: string) {
  return demoProjects.find(p => p.id === projectId)
}

export function getDemoMilestonesByProject(projectId: string) {
  return demoMilestones.filter(m => m.project_id === projectId)
}

export function getDemoTasksDueThisWeek() {
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return demoProjectTasks.filter(t => {
    if (!t.due_date || t.status === "done") return false
    const dueDate = new Date(t.due_date)
    return dueDate >= now && dueDate <= weekFromNow
  })
}

export function getDemoOverdueTasks() {
  const now = new Date()
  return demoProjectTasks.filter(t => {
    if (!t.due_date || t.status === "done") return false
    return new Date(t.due_date) < now
  })
}

export function getDemoTasksGroupedByDueDate() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const overdue: DemoProjectTask[] = []
  const todayTasks: DemoProjectTask[] = []
  const tomorrowTasks: DemoProjectTask[] = []
  const thisWeek: DemoProjectTask[] = []
  const later: DemoProjectTask[] = []
  const noDueDate: DemoProjectTask[] = []

  demoProjectTasks.filter(t => t.status !== "done").forEach(task => {
    if (!task.due_date) {
      noDueDate.push(task)
      return
    }
    const dueDate = new Date(task.due_date)
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

    if (dueDateOnly < today) {
      overdue.push(task)
    } else if (dueDateOnly.getTime() === today.getTime()) {
      todayTasks.push(task)
    } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
      tomorrowTasks.push(task)
    } else if (dueDateOnly < weekFromNow) {
      thisWeek.push(task)
    } else {
      later.push(task)
    }
  })

  return { overdue, today: todayTasks, tomorrow: tomorrowTasks, thisWeek, later, noDueDate }
}

export function getDemoTeamWorkload() {
  const workload: Record<string, { member: DemoProjectMember; taskCount: number; tasks: DemoProjectTask[] }> = {}

  demoProjectTasks.filter(t => t.status !== "done").forEach(task => {
    task.assignees.forEach(assignee => {
      if (!workload[assignee.id]) {
        workload[assignee.id] = { member: assignee, taskCount: 0, tasks: [] }
      }
      workload[assignee.id].taskCount++
      workload[assignee.id].tasks.push(task)
    })
  })

  return Object.values(workload).sort((a, b) => b.taskCount - a.taskCount)
}

// =============================================================================
// KNOWLEDGE MOCK DATA
// =============================================================================

export interface DemoKnowledgePage {
  id: string
  title: string
  slug: string
  parentId: string | null
  folderId: string | null
  content: string
  excerpt: string
  icon: string
  coverImage?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  lastEditedBy: string
  isPublished: boolean
  isFavorite: boolean
  views: number
  tags: string[]
  order: number
}

export interface DemoKnowledgeFolder {
  id: string
  name: string
  icon: string
  parentId: string | null
  createdAt: string
  order: number
  pageCount: number
  color: string
}

export interface DemoKnowledgeTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: "meeting" | "project" | "docs" | "planning"
  content: string
  usageCount: number
}

export interface DemoWhiteboard {
  id: string
  name: string
  title: string
  description: string
  icon: string
  thumbnail?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  collaborators: string[]
  isPublic: boolean
  isFavorite: boolean
  shapes: number
}

export interface DemoAISearchQuery {
  id: string
  query: string
  response: string
  citations: {
    pageId: string
    pageTitle: string
    excerpt: string
    relevance: number
  }[]
  timestamp: string
}

export interface DemoKnowledgeActivity {
  id: string
  type: "page_created" | "page_updated" | "comment_added" | "page_shared"
  pageId: string
  pageTitle: string
  userId: string
  userName: string
  timestamp: string
  details?: string
}

// Demo user for Knowledge (generic Acme startup)
export const demoKnowledgeUser = {
  id: "knowledge-user",
  name: "Sam Taylor",
  email: "sam@acme.io",
  company: "Acme",
}

// Knowledge Folders
export const demoKnowledgeFolders: DemoKnowledgeFolder[] = [
  {
    id: "folder-wiki",
    name: "Company Wiki",
    icon: "🏢",
    parentId: null,
    createdAt: daysAgo(180),
    order: 1,
    pageCount: 3,
    color: "#6366f1",
  },
  {
    id: "folder-engineering",
    name: "Engineering",
    icon: "⚙️",
    parentId: null,
    createdAt: daysAgo(150),
    order: 2,
    pageCount: 4,
    color: "#10b981",
  },
  {
    id: "folder-product",
    name: "Product",
    icon: "📦",
    parentId: null,
    createdAt: daysAgo(120),
    order: 3,
    pageCount: 2,
    color: "#f59e0b",
  },
  {
    id: "folder-onboarding",
    name: "Onboarding",
    icon: "👋",
    parentId: null,
    createdAt: daysAgo(100),
    order: 4,
    pageCount: 3,
    color: "#ec4899",
  },
]

// Knowledge Pages
export const demoKnowledgePages: DemoKnowledgePage[] = [
  // Company Wiki
  {
    id: "page-company-overview",
    title: "Company Overview",
    slug: "company-overview",
    parentId: null,
    folderId: "folder-wiki",
    content: `# Company Overview

Welcome to **Acme** - we're building the future of collaborative workspaces.

## Our Story

Founded in 2022, Acme started with a simple idea: teams deserve better tools. Today, we serve over 10,000 customers worldwide.

## What We Do

We build integrated workspace software that combines:
- **Project Management** - Keep teams aligned
- **Knowledge Base** - Capture institutional knowledge
- **Communication** - Real-time collaboration

## Our Values

1. **Customer First** - Every decision starts with the customer
2. **Move Fast** - Ship early, iterate often
3. **Radical Transparency** - Open by default
4. **Own Your Work** - Take responsibility, celebrate wins

## Quick Links

- [Team Directory](/demo/knowledge/pages/team-directory)
- [Mission & Values](/demo/knowledge/pages/mission-values)
- [Engineering Docs](/demo/knowledge/pages/dev-setup)`,
    excerpt: "Welcome to Acme - we're building the future of collaborative workspaces.",
    icon: "🏢",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(3),
    createdBy: "Sam Taylor",
    lastEditedBy: "Sam Taylor",
    isPublished: true,
    isFavorite: true,
    views: 542,
    tags: ["company", "overview", "culture"],
    order: 1,
  },
  {
    id: "page-mission-values",
    title: "Mission & Values",
    slug: "mission-values",
    parentId: null,
    folderId: "folder-wiki",
    content: `# Mission & Values

## Our Mission

To empower teams to do their best work by providing intuitive, integrated tools that get out of the way.

## Core Values

### 🎯 Customer First
We start with the customer and work backwards. Every feature, every decision is measured against customer value.

### 🚀 Move Fast
Speed matters in business. We ship early, gather feedback, and iterate. Perfect is the enemy of good.

### 🔓 Radical Transparency
We default to open. Information flows freely. Everyone has context to make good decisions.

### 💪 Own Your Work
We hire smart people and trust them. Take responsibility for outcomes. Celebrate wins, learn from failures.

### 🤝 Better Together
Great products come from great teams. Collaboration beats competition. Diverse perspectives make us stronger.

## Living Our Values

- Weekly all-hands with open Q&A
- Public roadmap and changelog
- 360 feedback cycles quarterly
- Failure retrospectives (blameless)`,
    excerpt: "To empower teams to do their best work by providing intuitive, integrated tools.",
    icon: "⭐",
    createdAt: daysAgo(175),
    updatedAt: daysAgo(14),
    createdBy: "Sam Taylor",
    lastEditedBy: "Jordan Kim",
    isPublished: true,
    isFavorite: true,
    views: 328,
    tags: ["mission", "values", "culture"],
    order: 2,
  },
  {
    id: "page-team-directory",
    title: "Team Directory",
    slug: "team-directory",
    parentId: null,
    folderId: "folder-wiki",
    content: `# Team Directory

## Leadership

| Name | Role | Email | Location |
|------|------|-------|----------|
| Sam Taylor | CEO & Co-founder | sam@acme.io | San Francisco |
| Jordan Kim | CTO & Co-founder | jordan@acme.io | San Francisco |
| Alex Rivera | VP Engineering | alex@acme.io | New York |
| Casey Morgan | VP Product | casey@acme.io | Remote |

## Engineering

| Name | Role | Team | Start Date |
|------|------|------|------------|
| Taylor Chen | Senior Engineer | Platform | Jan 2023 |
| Morgan Park | Senior Engineer | Growth | Mar 2023 |
| Jamie Lee | Engineer | Platform | Jun 2023 |
| Riley Santos | Engineer | Growth | Sep 2023 |

## Product & Design

| Name | Role | Focus Area |
|------|------|------------|
| Drew Williams | Product Manager | Core Product |
| Avery Thompson | Product Designer | UX |
| Quinn Davis | Product Designer | Design Systems |

## How to Update

Edit this page or send updates to #people-ops on Slack.`,
    excerpt: "Contact information and team structure for Acme.",
    icon: "👥",
    createdAt: daysAgo(170),
    updatedAt: daysAgo(1),
    createdBy: "Sam Taylor",
    lastEditedBy: "Casey Morgan",
    isPublished: true,
    isFavorite: false,
    views: 891,
    tags: ["team", "directory", "contacts"],
    order: 3,
  },
  // Engineering
  {
    id: "page-dev-setup",
    title: "Development Setup",
    slug: "dev-setup",
    parentId: null,
    folderId: "folder-engineering",
    content: `# Development Setup

Welcome to the engineering team! This guide will help you set up your local development environment.

## Prerequisites

Before you begin, make sure you have:

- **Node.js** v20 or higher
- **pnpm** v8 or higher
- **Git**
- **Docker** (for local databases)

## Getting Started

### 1. Clone the Repository

\`\`\`bash
git clone git@github.com:acme/platform.git
cd platform
\`\`\`

### 2. Install Dependencies

\`\`\`bash
pnpm install
\`\`\`

### 3. Environment Setup

Copy the example environment file:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Request credentials from #engineering on Slack.

### 4. Start Development Server

\`\`\`bash
pnpm dev
\`\`\`

The app will be available at \`http://localhost:3000\`.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Run \`lsof -i :3000\` to find the process |
| Database connection failed | Ensure Docker is running |
| Node version mismatch | Use \`nvm use\` to switch versions |

## Next Steps

- Read [Code Review Guidelines](/demo/knowledge/pages/code-review)
- Join #engineering on Slack
- Schedule a 1:1 with your team lead`,
    excerpt: "Set up your local development environment in minutes.",
    icon: "💻",
    createdAt: daysAgo(150),
    updatedAt: daysAgo(7),
    createdBy: "Jordan Kim",
    lastEditedBy: "Taylor Chen",
    isPublished: true,
    isFavorite: true,
    views: 234,
    tags: ["engineering", "setup", "onboarding"],
    order: 1,
  },
  {
    id: "page-code-review",
    title: "Code Review Guidelines",
    slug: "code-review",
    parentId: null,
    folderId: "folder-engineering",
    content: `# Code Review Guidelines

Code review is a critical part of our development process. It helps us maintain code quality, share knowledge, and catch bugs early.

## Before Submitting

- [ ] All tests pass locally
- [ ] Linter passes: \`pnpm lint\`
- [ ] Types check: \`pnpm check-types\`
- [ ] PR description explains the "why"
- [ ] Screenshots for UI changes

## Review Requirements

| Change Type | Required Approvals |
|-------------|-------------------|
| Production code | 2 approvals |
| Documentation | 1 approval |
| Config changes | 1 approval + team lead |
| Security-related | 2 approvals + security review |

## Timeline

- **Standard PRs**: Review within 24 hours
- **Urgent PRs**: Use the \`urgent\` label and ping in #engineering
- **Draft PRs**: No timeline, request review when ready

## What to Look For

### As an Author
- Small, focused PRs (< 400 lines ideal)
- Clear commit messages
- Tests for new functionality

### As a Reviewer
- Logic correctness
- Edge cases
- Performance implications
- Security considerations
- Code style consistency

## Giving Feedback

Be constructive and specific:
- ✅ "Consider using \`useMemo\` here to prevent re-renders"
- ❌ "This is inefficient"`,
    excerpt: "Guidelines for submitting and reviewing pull requests.",
    icon: "👀",
    createdAt: daysAgo(140),
    updatedAt: daysAgo(21),
    createdBy: "Jordan Kim",
    lastEditedBy: "Alex Rivera",
    isPublished: true,
    isFavorite: false,
    views: 167,
    tags: ["engineering", "code-review", "process"],
    order: 2,
  },
  {
    id: "page-api-docs",
    title: "API Documentation",
    slug: "api-docs",
    parentId: null,
    folderId: "folder-engineering",
    content: `# API Documentation

Our REST API follows OpenAPI 3.0 specification. Full reference available at \`/api/docs\`.

## Authentication

All API requests require authentication via Bearer token:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.acme.io/v1/users
\`\`\`

## Base URL

- **Production**: \`https://api.acme.io/v1\`
- **Staging**: \`https://api.staging.acme.io/v1\`
- **Local**: \`http://localhost:3000/api/v1\`

## Common Endpoints

### Users

\`\`\`
GET    /users          # List users
GET    /users/:id      # Get user
POST   /users          # Create user
PATCH  /users/:id      # Update user
DELETE /users/:id      # Delete user
\`\`\`

### Projects

\`\`\`
GET    /projects       # List projects
GET    /projects/:id   # Get project
POST   /projects       # Create project
\`\`\`

## Response Format

All responses follow this structure:

\`\`\`json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
\`\`\`

## Error Handling

Errors return appropriate HTTP status codes with details:

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email"
  }
}
\`\`\``,
    excerpt: "REST API reference and usage examples.",
    icon: "🔌",
    createdAt: daysAgo(130),
    updatedAt: daysAgo(5),
    createdBy: "Taylor Chen",
    lastEditedBy: "Taylor Chen",
    isPublished: true,
    isFavorite: false,
    views: 445,
    tags: ["engineering", "api", "documentation"],
    order: 3,
  },
  {
    id: "page-deployment",
    title: "Deployment Process",
    slug: "deployment",
    parentId: null,
    folderId: "folder-engineering",
    content: `# Deployment Process

We deploy to production multiple times per day using a continuous deployment pipeline.

## Environments

| Environment | URL | Branch | Auto-deploy |
|-------------|-----|--------|-------------|
| Development | dev.acme.io | Any PR | Yes |
| Staging | staging.acme.io | main | Yes |
| Production | app.acme.io | main | Manual |

## Pre-deployment Checklist

- [ ] PR merged to main
- [ ] All CI checks pass
- [ ] Staging tested
- [ ] Team lead sign-off (for major changes)

## Deploying to Production

### 1. Open the Deploy Dashboard

Navigate to Vercel dashboard or run:

\`\`\`bash
vercel --prod
\`\`\`

### 2. Monitor the Deploy

Watch the deployment logs for errors:

\`\`\`bash
vercel logs --follow
\`\`\`

### 3. Post-deployment

- Monitor error rates in Sentry
- Check key metrics in Datadog
- Be available for 30 mins after deploy

## Rollback

If issues are detected:

\`\`\`bash
vercel rollback
\`\`\`

Or use the Vercel dashboard to instantly revert.

## Feature Flags

Use feature flags for gradual rollouts:

\`\`\`typescript
if (featureFlags.isEnabled('new-dashboard')) {
  return <NewDashboard />
}
\`\`\``,
    excerpt: "How to deploy code to staging and production.",
    icon: "🚀",
    createdAt: daysAgo(120),
    updatedAt: daysAgo(10),
    createdBy: "Alex Rivera",
    lastEditedBy: "Jordan Kim",
    isPublished: true,
    isFavorite: false,
    views: 189,
    tags: ["engineering", "deployment", "devops"],
    order: 4,
  },
  // Product
  {
    id: "page-roadmap",
    title: "Product Roadmap",
    slug: "roadmap",
    parentId: null,
    folderId: "folder-product",
    content: `# Product Roadmap

Our product roadmap is organized by quarters. Updated monthly.

## Q1 2024 (Current)

### 🎯 Focus: Enterprise Features

| Feature | Status | Owner | ETA |
|---------|--------|-------|-----|
| SSO/SAML | ✅ Shipped | Taylor | Jan |
| Audit Logs | 🚧 In Progress | Morgan | Feb |
| Advanced Permissions | 📋 Planned | Jamie | Mar |

### Key Metrics
- ARR Target: $2M
- NPS Target: 50+
- Churn Target: <5%

## Q2 2024

### 🎯 Focus: AI & Automation

| Feature | Status | Owner |
|---------|--------|-------|
| AI Search | 📋 Planned | Taylor |
| Smart Suggestions | 📋 Planned | Morgan |
| Workflow Automation | 📋 Planned | TBD |

## Q3 2024

### 🎯 Focus: Mobile & Integrations

- Native iOS/Android apps
- Slack integration v2
- Zapier connector

## How We Prioritize

1. **Customer Impact** - How many customers benefit?
2. **Strategic Fit** - Does it align with our vision?
3. **Effort** - What's the build cost?
4. **Revenue** - Will it drive growth?

## Requesting Features

Submit feature requests via:
- #product-feedback Slack channel
- Support tickets
- Customer success calls`,
    excerpt: "Quarterly product roadmap and prioritization framework.",
    icon: "🗺️",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
    createdBy: "Casey Morgan",
    lastEditedBy: "Casey Morgan",
    isPublished: true,
    isFavorite: true,
    views: 678,
    tags: ["product", "roadmap", "planning"],
    order: 1,
  },
  {
    id: "page-user-research",
    title: "User Research Findings",
    slug: "user-research",
    parentId: null,
    folderId: "folder-product",
    content: `# User Research Findings

Summary of recent user research conducted in Q4 2023.

## Research Overview

- **Method**: 20 customer interviews + 500 survey responses
- **Segment**: Mid-market (50-500 employees)
- **Duration**: 6 weeks

## Key Findings

### 1. Search is Critical

> "I spend 30 minutes a day just looking for documents" - PM at TechCorp

**Insight**: Users struggle to find information across multiple tools.

**Recommendation**: Invest in universal search and AI-powered suggestions.

### 2. Mobile Access Needed

- 78% of users access tools on mobile
- Only 23% satisfied with current mobile experience

**Recommendation**: Prioritize native mobile apps.

### 3. Integration Fatigue

Users have average of 12 SaaS tools. Top requested integrations:
1. Slack (89%)
2. Google Workspace (76%)
3. Jira (54%)
4. Salesforce (48%)

### 4. Onboarding Friction

- Average time to first value: 3 days
- Drop-off point: workspace setup

**Recommendation**: Simplify onboarding with templates and guided setup.

## Next Steps

- [ ] Share findings with engineering
- [ ] Update Q1 priorities
- [ ] Schedule follow-up interviews`,
    excerpt: "Key insights from Q4 2023 customer research.",
    icon: "🔬",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(30),
    createdBy: "Drew Williams",
    lastEditedBy: "Casey Morgan",
    isPublished: true,
    isFavorite: false,
    views: 234,
    tags: ["product", "research", "insights"],
    order: 2,
  },
  // Onboarding
  {
    id: "page-new-employee",
    title: "New Employee Checklist",
    slug: "new-employee",
    parentId: null,
    folderId: "folder-onboarding",
    content: `# New Employee Checklist

Welcome to Acme! 🎉 Use this checklist to get up and running.

## Before Day 1

- [ ] Sign offer letter
- [ ] Complete background check
- [ ] Set up bank account for payroll
- [ ] Review benefits enrollment

## Day 1

### Morning
- [ ] Pick up laptop from IT
- [ ] Set up email and Slack
- [ ] Meet your manager
- [ ] Meet your onboarding buddy

### Afternoon
- [ ] Complete security training (30 min)
- [ ] Set up 2FA on all accounts
- [ ] Join team channels in Slack
- [ ] Read Company Overview doc

## Week 1

- [ ] Complete all compliance training
- [ ] Set up development environment (if engineering)
- [ ] Schedule 1:1s with teammates
- [ ] Attend team standup
- [ ] Complete first small task

## Week 2

- [ ] Shadow a customer call
- [ ] Present at team meeting
- [ ] Set 30/60/90 day goals with manager
- [ ] Request feedback from buddy

## Questions?

- Ask in #new-hires Slack channel
- Reach out to your onboarding buddy
- Schedule time with HR`,
    excerpt: "Everything you need to do in your first two weeks.",
    icon: "✅",
    createdAt: daysAgo(160),
    updatedAt: daysAgo(8),
    createdBy: "Sam Taylor",
    lastEditedBy: "Casey Morgan",
    isPublished: true,
    isFavorite: false,
    views: 456,
    tags: ["onboarding", "new-hire", "checklist"],
    order: 1,
  },
  {
    id: "page-tools-access",
    title: "Tools & Access",
    slug: "tools-access",
    parentId: null,
    folderId: "folder-onboarding",
    content: `# Tools & Access

Guide to all the tools we use and how to get access.

## Communication

| Tool | Purpose | How to Access |
|------|---------|---------------|
| Slack | Team chat | Auto-provisioned |
| Google Meet | Video calls | Via Google Workspace |
| Loom | Async video | Request in #it-help |

## Development (Engineering)

| Tool | Purpose | How to Access |
|------|---------|---------------|
| GitHub | Code repository | Request from team lead |
| Vercel | Deployment | Request from DevOps |
| Linear | Issue tracking | Auto-provisioned |

## Design

| Tool | Purpose | How to Access |
|------|---------|---------------|
| Figma | Design | Request from design lead |
| Maze | User testing | Request from UX |

## Productivity

| Tool | Purpose | How to Access |
|------|---------|---------------|
| Notion | Documentation | Auto-provisioned |
| Google Workspace | Email, calendar | Auto-provisioned |
| 1Password | Password manager | IT sets up Day 1 |

## Requesting Access

1. Post in #it-help with:
   - Tool name
   - Reason needed
   - Manager approval (if required)

2. IT will provision within 24 hours

## Security Notes

- Use 1Password for all passwords
- Enable 2FA everywhere
- Never share credentials
- Report suspicious activity to #security`,
    excerpt: "Complete list of tools and how to get access.",
    icon: "🔑",
    createdAt: daysAgo(155),
    updatedAt: daysAgo(15),
    createdBy: "Jordan Kim",
    lastEditedBy: "Taylor Chen",
    isPublished: true,
    isFavorite: false,
    views: 312,
    tags: ["onboarding", "tools", "access"],
    order: 2,
  },
  {
    id: "page-first-week",
    title: "First Week Guide",
    slug: "first-week",
    parentId: null,
    folderId: "folder-onboarding",
    content: `# First Week Guide

Your first week is about learning and getting comfortable. Don't worry about shipping code or delivering results yet.

## Day by Day

### Monday - Orientation

**Morning**
- Welcome breakfast with team
- Laptop setup with IT
- HR paperwork and benefits overview

**Afternoon**
- 1:1 with your manager (30 min)
- Meet your onboarding buddy
- Slack and email setup

### Tuesday - Learning

**Focus**: Understanding the product

- Product demo from PM (1 hour)
- Self-guided product exploration
- Read key documentation
- Complete security training

### Wednesday - Team

**Focus**: Meeting your team

- Attend team standup
- Schedule 1:1s with teammates
- Shadow a customer call
- Lunch with team

### Thursday - Deep Dive

**Focus**: Your role-specific setup

- **Engineering**: Dev environment setup, codebase tour
- **Product**: Review roadmap, meet design
- **Sales**: CRM training, pipeline review

### Friday - First Contribution

**Focus**: Getting your hands dirty

- Pick up a small starter task
- Pair with a teammate
- Ask lots of questions!

## Tips for Success

1. **Ask questions** - There are no dumb questions in week 1
2. **Take notes** - You'll learn a lot, write it down
3. **Meet people** - Coffee chats are encouraged
4. **Be patient** - It takes time to ramp up

## Your Onboarding Buddy

Your buddy is here to help! They can:
- Answer questions
- Make introductions
- Explain unwritten rules
- Get lunch with you

Don't hesitate to reach out to them for anything.`,
    excerpt: "Day-by-day guide to your first week at Acme.",
    icon: "📅",
    createdAt: daysAgo(150),
    updatedAt: daysAgo(4),
    createdBy: "Casey Morgan",
    lastEditedBy: "Sam Taylor",
    isPublished: true,
    isFavorite: false,
    views: 289,
    tags: ["onboarding", "first-week", "guide"],
    order: 3,
  },
]

// Knowledge Templates
export const demoKnowledgeTemplates: DemoKnowledgeTemplate[] = [
  {
    id: "template-meeting",
    name: "Meeting Notes",
    description: "Structured template for capturing meeting discussions and action items",
    icon: "📝",
    category: "meeting",
    content: `# Meeting Notes

**Date**: [Date]
**Attendees**: [Names]
**Facilitator**: [Name]

## Agenda

1. [Topic 1]
2. [Topic 2]
3. [Topic 3]

## Discussion

### [Topic 1]
- Key point
- Key point

### [Topic 2]
- Key point
- Key point

## Action Items

| Action | Owner | Due Date |
|--------|-------|----------|
| [Action 1] | [Name] | [Date] |
| [Action 2] | [Name] | [Date] |

## Next Steps

- [ ] Schedule follow-up
- [ ] Share notes with team`,
    usageCount: 156,
  },
  {
    id: "template-project-brief",
    name: "Project Brief",
    description: "Define project scope, goals, and success metrics",
    icon: "📋",
    category: "project",
    content: `# Project Brief: [Project Name]

## Overview

**Project Lead**: [Name]
**Start Date**: [Date]
**Target Completion**: [Date]
**Status**: 🟡 Planning

## Problem Statement

What problem are we solving? Who has this problem?

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| [Goal 1] | [Metric] | [Target] |
| [Goal 2] | [Metric] | [Target] |

## Scope

### In Scope
- [Feature 1]
- [Feature 2]

### Out of Scope
- [Feature 3]

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Discovery | 2 weeks | Requirements doc |
| Design | 2 weeks | Mockups |
| Build | 4 weeks | MVP |
| Launch | 1 week | Production release |

## Team

| Role | Name |
|------|------|
| PM | [Name] |
| Engineering | [Name] |
| Design | [Name] |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk 1] | High | [Plan] |`,
    usageCount: 89,
  },
  {
    id: "template-rfc",
    name: "RFC (Request for Comments)",
    description: "Propose and discuss technical or product decisions",
    icon: "💬",
    category: "docs",
    content: `# RFC: [Title]

**Author**: [Name]
**Status**: 📝 Draft | 🔍 Review | ✅ Approved | ❌ Rejected
**Created**: [Date]
**Decision Deadline**: [Date]

## Summary

One paragraph summary of the proposal.

## Motivation

Why are we doing this? What problem does it solve?

## Detailed Design

### Option A: [Name]

Description of the approach.

**Pros**
- Pro 1
- Pro 2

**Cons**
- Con 1
- Con 2

### Option B: [Name]

Description of the approach.

**Pros**
- Pro 1

**Cons**
- Con 1

## Recommendation

Which option do you recommend and why?

## Open Questions

- [ ] Question 1?
- [ ] Question 2?

## References

- [Link 1]
- [Link 2]`,
    usageCount: 45,
  },
  {
    id: "template-retro",
    name: "Retrospective",
    description: "Sprint or project retrospective template",
    icon: "🔄",
    category: "planning",
    content: `# Retrospective: [Sprint/Project Name]

**Date**: [Date]
**Facilitator**: [Name]
**Participants**: [Names]

## What Went Well 🎉

- [Win 1]
- [Win 2]
- [Win 3]

## What Could Improve 🔧

- [Issue 1]
- [Issue 2]
- [Issue 3]

## Action Items

| Action | Owner | Due | Priority |
|--------|-------|-----|----------|
| [Action 1] | [Name] | [Date] | High |
| [Action 2] | [Name] | [Date] | Medium |

## Shoutouts 👏

- [Name] for [reason]
- [Name] for [reason]

## Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Velocity | [X] pts | [Y] pts |
| Bugs | [X] | [Y] |

## Follow-up

- [ ] Share notes with team
- [ ] Update processes
- [ ] Schedule next retro`,
    usageCount: 67,
  },
  {
    id: "template-one-on-one",
    name: "1:1 Notes",
    description: "Template for manager/report 1:1 meetings",
    icon: "👥",
    category: "meeting",
    content: `# 1:1 Notes

**Date**: [Date]
**Manager**: [Name]
**Report**: [Name]

## Check-in

How are you doing? (1-10)

Energy: [ ]
Stress: [ ]
Workload: [ ]

## Updates

### What's going well?
-

### What's challenging?
-

### What do you need from me?
-

## Discussion Topics

- [ ] Topic from last time
- [ ] New topic

## Career & Growth

- Current focus:
- Skills to develop:
- Upcoming opportunities:

## Action Items

| Action | Owner | Due |
|--------|-------|-----|
| | | |

## Notes for Next Time

- `,
    usageCount: 234,
  },
]

// Whiteboards
export const demoWhiteboards: DemoWhiteboard[] = [
  {
    id: "wb-architecture",
    name: "System Architecture",
    title: "System Architecture",
    icon: "🏗️",
    description: "High-level system architecture diagram",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(7),
    createdBy: "Jordan Kim",
    collaborators: ["Taylor Chen", "Alex Rivera"],
    isPublic: true,
    isFavorite: true,
    shapes: 24,
  },
  {
    id: "wb-user-flow",
    name: "User Onboarding Flow",
    title: "User Onboarding Flow",
    icon: "🔄",
    description: "User journey map for new signups",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(3),
    createdBy: "Avery Thompson",
    collaborators: ["Drew Williams", "Casey Morgan"],
    isPublic: true,
    isFavorite: false,
    shapes: 18,
  },
  {
    id: "wb-brainstorm",
    name: "Q2 Feature Brainstorm",
    title: "Q2 Feature Brainstorm",
    icon: "💡",
    description: "Ideas for upcoming features",
    createdAt: daysAgo(14),
    updatedAt: daysAgo(1),
    createdBy: "Casey Morgan",
    collaborators: ["Sam Taylor", "Drew Williams", "Avery Thompson"],
    isPublic: false,
    isFavorite: true,
    shapes: 32,
  },
  {
    id: "wb-sprint",
    name: "Sprint Planning",
    title: "Sprint Planning",
    icon: "📋",
    description: "Current sprint task board",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(0),
    createdBy: "Taylor Chen",
    collaborators: ["Morgan Park", "Jamie Lee"],
    isPublic: true,
    isFavorite: false,
    shapes: 15,
  },
]

// AI Search Queries with mock responses
export const demoAISearchQueries: DemoAISearchQuery[] = [
  {
    id: "ai-1",
    query: "How do I set up my development environment?",
    response: `To set up your development environment at Acme, follow these steps:

1. **Clone the repository** from GitHub using your SSH key
2. **Install dependencies** with \`pnpm install\`
3. **Set up environment variables** by copying \`.env.example\` to \`.env.local\`
4. **Start the development server** with \`pnpm dev\`

Make sure you have Node.js 20+ and pnpm installed. For database credentials, request access through #engineering on Slack.`,
    citations: [
      {
        pageId: "page-dev-setup",
        pageTitle: "Development Setup",
        excerpt: "Clone the repository and run pnpm install to get started...",
        relevance: 0.95,
      },
      {
        pageId: "page-tools-access",
        pageTitle: "Tools & Access",
        excerpt: "Request database credentials through #it-help...",
        relevance: 0.78,
      },
    ],
    timestamp: hoursAgo(2),
  },
  {
    id: "ai-2",
    query: "What is our code review process?",
    response: `Our code review process follows these guidelines:

**Before Submitting:**
- Ensure all tests pass locally
- Run the linter with \`pnpm lint\`
- Write a clear PR description explaining the "why"

**Review Requirements:**
- Production code requires 2 approvals
- Documentation changes need 1 approval
- All comments must be resolved before merging

**Timeline:**
- Standard PRs should be reviewed within 24 hours
- Use the \`urgent\` label and ping in #engineering for urgent PRs`,
    citations: [
      {
        pageId: "page-code-review",
        pageTitle: "Code Review Guidelines",
        excerpt: "All production code requires at least 2 approvals...",
        relevance: 0.98,
      },
    ],
    timestamp: hoursAgo(5),
  },
  {
    id: "ai-3",
    query: "What are our company values?",
    response: `Acme's core values guide everything we do:

1. **Customer First** - Every decision starts with customer value
2. **Move Fast** - Ship early, iterate often. Perfect is the enemy of good.
3. **Radical Transparency** - Default to open. Information flows freely.
4. **Own Your Work** - Take responsibility, celebrate wins, learn from failures.
5. **Better Together** - Collaboration beats competition. Diverse perspectives make us stronger.

We live these values through weekly all-hands, public roadmaps, and blameless retrospectives.`,
    citations: [
      {
        pageId: "page-mission-values",
        pageTitle: "Mission & Values",
        excerpt: "Our five core values define who we are as a company...",
        relevance: 0.99,
      },
    ],
    timestamp: hoursAgo(8),
  },
  {
    id: "ai-4",
    query: "How do I deploy to production?",
    response: `Production deployments at Acme follow these steps:

**Pre-deployment:**
1. Ensure your PR is merged to \`main\`
2. Verify all CI checks pass
3. Test on staging environment
4. Get team lead sign-off for major changes

**Deployment:**
1. Go to Vercel dashboard or run \`vercel --prod\`
2. Monitor deployment logs with \`vercel logs --follow\`

**Post-deployment:**
- Monitor error rates in Sentry
- Check key metrics in Datadog
- Be available for 30 mins after deploy

**Rollback:** If issues detected, run \`vercel rollback\` immediately.`,
    citations: [
      {
        pageId: "page-deployment",
        pageTitle: "Deployment Process",
        excerpt: "We deploy to production multiple times per day using continuous deployment...",
        relevance: 0.96,
      },
      {
        pageId: "page-api-docs",
        pageTitle: "API Documentation",
        excerpt: "Production URL: https://api.acme.io/v1...",
        relevance: 0.72,
      },
    ],
    timestamp: hoursAgo(12),
  },
  {
    id: "ai-5",
    query: "What should I do in my first week?",
    response: `Welcome to Acme! Here's your first week breakdown:

**Day 1 - Orientation:**
- Pick up laptop, set up accounts
- Meet your manager and buddy
- Complete security training

**Day 2-3 - Learning:**
- Product demo from PM
- Read key documentation
- Self-guided exploration

**Day 4 - Team Integration:**
- Attend team standup
- Schedule 1:1s with teammates
- Shadow a customer call

**Day 5 - First Contribution:**
- Pick up a small starter task
- Pair with a teammate

Don't hesitate to ask questions in #new-hires!`,
    citations: [
      {
        pageId: "page-first-week",
        pageTitle: "First Week Guide",
        excerpt: "Your first week is about learning and getting comfortable...",
        relevance: 0.97,
      },
      {
        pageId: "page-new-employee",
        pageTitle: "New Employee Checklist",
        excerpt: "Complete these items in your first two weeks...",
        relevance: 0.89,
      },
    ],
    timestamp: hoursAgo(24),
  },
]

// Knowledge Activities
export const demoKnowledgeActivities: DemoKnowledgeActivity[] = [
  {
    id: "activity-1",
    type: "page_updated",
    pageId: "page-team-directory",
    pageTitle: "Team Directory",
    userId: "user-casey",
    userName: "Casey Morgan",
    timestamp: hoursAgo(1),
    details: "Added new hire Riley Santos",
  },
  {
    id: "activity-2",
    type: "page_created",
    pageId: "page-roadmap",
    pageTitle: "Product Roadmap",
    userId: "user-casey",
    userName: "Casey Morgan",
    timestamp: hoursAgo(3),
  },
  {
    id: "activity-3",
    type: "comment_added",
    pageId: "page-dev-setup",
    pageTitle: "Development Setup",
    userId: "user-taylor",
    userName: "Taylor Chen",
    timestamp: hoursAgo(5),
    details: "Added note about Node.js version",
  },
  {
    id: "activity-4",
    type: "page_updated",
    pageId: "page-company-overview",
    pageTitle: "Company Overview",
    userId: "user-sam",
    userName: "Sam Taylor",
    timestamp: hoursAgo(8),
  },
  {
    id: "activity-5",
    type: "page_shared",
    pageId: "page-user-research",
    pageTitle: "User Research Findings",
    userId: "user-drew",
    userName: "Drew Williams",
    timestamp: daysAgo(1),
    details: "Shared with #product channel",
  },
  {
    id: "activity-6",
    type: "page_updated",
    pageId: "page-api-docs",
    pageTitle: "API Documentation",
    userId: "user-taylor",
    userName: "Taylor Chen",
    timestamp: daysAgo(1),
    details: "Added new endpoints for v2",
  },
  {
    id: "activity-7",
    type: "page_created",
    pageId: "page-first-week",
    pageTitle: "First Week Guide",
    userId: "user-casey",
    userName: "Casey Morgan",
    timestamp: daysAgo(2),
  },
  {
    id: "activity-8",
    type: "comment_added",
    pageId: "page-code-review",
    pageTitle: "Code Review Guidelines",
    userId: "user-alex",
    userName: "Alex Rivera",
    timestamp: daysAgo(2),
    details: "Clarified security review process",
  },
]

// Knowledge analytics functions
export function getDemoKnowledgeStats() {
  const totalPages = demoKnowledgePages.length
  const totalFolders = demoKnowledgeFolders.length
  const totalTemplates = demoKnowledgeTemplates.length
  const totalWhiteboards = demoWhiteboards.length
  const totalViews = demoKnowledgePages.reduce((sum, p) => sum + p.views, 0)
  const recentlyUpdated = demoKnowledgePages.filter(
    (p) => new Date(p.updatedAt) > new Date(daysAgo(7))
  ).length

  return { totalPages, totalFolders, totalTemplates, totalWhiteboards, totalViews, recentlyUpdated }
}

export function getDemoKnowledgePagesByFolder(folderId: string) {
  return demoKnowledgePages.filter((p) => p.folderId === folderId)
}

export function getDemoKnowledgePageById(pageId: string) {
  return demoKnowledgePages.find((p) => p.id === pageId)
}

export function getDemoKnowledgePageBySlug(slug: string) {
  return demoKnowledgePages.find((p) => p.slug === slug)
}

export function getDemoKnowledgeRecentPages(limit = 5) {
  return [...demoKnowledgePages]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
}

export function getDemoKnowledgeFavoritePages() {
  return demoKnowledgePages.filter((p) => p.isFavorite)
}

export function getDemoKnowledgeActivitiesRecent(limit = 10) {
  return [...demoKnowledgeActivities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

export function getDemoKnowledgeSearchResults(query: string) {
  const lowerQuery = query.toLowerCase()
  return demoKnowledgePages.filter(
    (p) =>
      p.title.toLowerCase().includes(lowerQuery) ||
      p.content.toLowerCase().includes(lowerQuery) ||
      p.tags.some((t) => t.toLowerCase().includes(lowerQuery))
  )
}

export function getDemoWhiteboardById(id: string) {
  return demoWhiteboards.find((w) => w.id === id)
}

export function getDemoTemplateById(id: string) {
  return demoKnowledgeTemplates.find((t) => t.id === id)
}


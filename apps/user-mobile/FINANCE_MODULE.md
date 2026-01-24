# Finance Module - Mobile Development Guide

Complete documentation for building the Finance workspace in React Native/Expo.

---

## Module Overview

The Finance module provides comprehensive financial management:

| Feature | Description |
|---------|-------------|
| **Dashboard** | Overview with metrics and quick actions |
| **Accounts** | Bank accounts, credit cards, cash, investments |
| **Transactions** | Income/expense tracking with categorization |
| **Budgets** | Spending limits by category with alerts |
| **Goals** | Revenue, profit, and exit planning targets |
| **Subscriptions** | Recurring payment tracking |
| **Analytics** | Reports: P&L, cash flow, expenses, income |
| **KPIs** | Industry-specific performance metrics |

---

## Routes & Screens

```
/finance
├── / ........................... Dashboard
├── /accounts
│   ├── / ....................... Account List
│   ├── /new .................... Add Account
│   └── /[id] ................... Account Detail
├── /transactions
│   ├── / ....................... Transaction List
│   ├── /new .................... Add Transaction
│   └── /import ................. CSV Import
├── /budgets
│   ├── / ....................... Budget List
│   └── /[id] ................... Budget Detail
├── /goals
│   ├── / ....................... Goals Overview
│   ├── /revenue ................ Revenue Goals
│   ├── /profit ................. Profit Goals
│   └── /exit ................... Exit Planning
├── /subscriptions .............. Subscription List
├── /analytics
│   ├── / ....................... Analytics Overview
│   ├── /income ................. Income Analysis
│   ├── /expenses ............... Expense Analysis
│   ├── /profit-loss ............ P&L Report
│   ├── /cash-flow .............. Cash Flow Report
│   ├── /calendar ............... Financial Calendar
│   └── /budget ................. Budget vs Actual
├── /kpis ....................... KPI Dashboard
└── /customize
    ├── / ....................... Settings
    ├── /categories ............. Category Manager
    └── /recurring .............. Recurring Rules
```

---

## Data Models

### Account

```typescript
interface Account {
  id: string
  user_id: string
  name: string
  type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'loan' | 'other'
  balance: number
  institution?: string
  last_four?: string
  currency: string  // USD, EUR, GBP, etc.
  is_active: boolean
  created_at: string
  updated_at: string
}
```

### Transaction

```typescript
interface Transaction {
  id: string
  account_id: string
  category_id?: string
  amount: number          // Positive = income, Negative = expense
  date: string            // ISO date
  description: string
  notes?: string
  is_transfer: boolean
  transfer_pair_id?: string
  recurring_rule_id?: string
  created_at: string
  updated_at: string
}

interface TransactionWithCategory extends Transaction {
  category?: Category
  account?: Account
}
```

### Category

```typescript
interface Category {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  icon?: string           // Lucide icon name
  color?: string          // Hex color
  parent_id?: string      // For subcategories
  is_system: boolean      // System vs user-created
  created_at: string
  updated_at: string
}
```

### Budget

```typescript
interface Budget {
  id: string
  profile_id: string
  category_id: string
  amount: number
  period: 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  start_date: string
  rollover: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

interface BudgetWithSpending extends Budget {
  category: Category
  spent: number
  remaining: number
  percentUsed: number
  periodStart: string
  periodEnd: string
  alerts: BudgetAlert[]
}
```

### Goal

```typescript
interface Goal {
  id: string
  profile_id: string
  type: 'revenue' | 'profit' | 'valuation' | 'runway' | 'revenue_multiple'
  name: string
  target_amount: number
  current_amount: number
  start_date: string
  end_date?: string
  notes?: string
  is_achieved: boolean
  created_at: string
  updated_at: string
}
```

### Subscription

```typescript
interface Subscription {
  id: string
  user_id: string
  name: string
  merchant_pattern?: string
  amount: number
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  next_renewal_date: string
  last_charge_date?: string
  category_id?: string
  reminder_days_before?: number
  is_active: boolean
  is_auto_detected: boolean
  notes?: string
  created_at: string
  updated_at: string
}
```

### KPIInput

```typescript
interface KPIInput {
  id: string
  profile_id: string
  period_start: string
  period_end: string
  // SaaS metrics
  customer_count?: number
  customer_acquisition_cost?: number
  lifetime_value?: number
  churned_customers?: number
  // Retail metrics
  inventory_value?: number
  units_sold?: number
  // Service metrics
  billable_hours?: number
  employee_count?: number
  utilization_target?: number
  created_at: string
  updated_at: string
}
```

### Data Relationships

```
User/Profile
├── Accounts (1:many)
│   └── Transactions (1:many)
│       └── Category (many:1)
├── Categories (1:many)
├── Budgets (1:many)
│   └── Category (many:1)
├── Subscriptions (1:many)
│   └── Category (many:1, optional)
├── Goals (1:many)
└── KPIInputs (1:many)
```

---

## API Endpoints

### Accounts

#### GET /api/accounts
List all accounts with balance totals.

**Response:**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "name": "Checking",
      "type": "checking",
      "balance": 5000,
      "institution": "Chase",
      "last_four": "1234",
      "currency": "USD"
    }
  ],
  "totals": {
    "assets": 50000,
    "liabilities": 15000,
    "netWorth": 35000
  }
}
```

#### POST /api/accounts
Create a new account.

**Request:**
```json
{
  "name": "Savings Account",
  "type": "savings",
  "balance": 10000,
  "institution": "Chase",
  "last_four": "5678",
  "currency": "USD"
}
```

#### GET /api/accounts/[id]
Get account with recent transactions.

#### PUT /api/accounts/[id]
Update account details.

#### DELETE /api/accounts/[id]
Delete account (cascades to transactions).

---

### Transactions

#### GET /api/transactions
List transactions with filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `accountId` | string | Filter by account |
| `categoryId` | string | Filter by category |
| `startDate` | string | Start of date range (ISO) |
| `endDate` | string | End of date range (ISO) |
| `limit` | number | Max results |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "account_id": "uuid",
      "category_id": "uuid",
      "amount": -50.00,
      "date": "2024-01-15",
      "description": "Grocery Store",
      "category": {
        "id": "uuid",
        "name": "Groceries",
        "type": "expense",
        "icon": "shopping-cart",
        "color": "#10b981"
      }
    }
  ]
}
```

#### POST /api/transactions
Create transaction.

**Request:**
```json
{
  "account_id": "uuid",
  "category_id": "uuid",
  "amount": -50.00,
  "date": "2024-01-15",
  "description": "Grocery Store",
  "notes": "Weekly groceries"
}
```

#### PUT /api/transactions/[id]
Update transaction.

#### DELETE /api/transactions/[id]
Delete transaction.

#### POST /api/transactions/bulk-update
Bulk update transactions (e.g., set category).

**Request:**
```json
{
  "transactionIds": ["uuid1", "uuid2"],
  "updates": {
    "category_id": "uuid"
  }
}
```

#### POST /api/transactions/bulk-delete
Bulk delete transactions.

**Request:**
```json
{
  "transactionIds": ["uuid1", "uuid2"]
}
```

#### POST /api/transactions/categorize
AI-powered categorization.

**Request:**
```json
{
  "transactionIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "categorized": [
    {
      "transactionId": "uuid1",
      "categoryId": "uuid",
      "categoryName": "Groceries",
      "confidence": "high"
    }
  ]
}
```

---

### Categories

#### GET /api/categories
List all categories.

**Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Groceries",
      "type": "expense",
      "icon": "shopping-cart",
      "color": "#10b981",
      "is_system": true
    }
  ]
}
```

#### POST /api/categories
Create custom category.

#### PUT /api/categories/[id]
Update category.

#### DELETE /api/categories/[id]
Delete category (transactions become uncategorized).

---

### Budgets

#### GET /api/budgets
List budgets with spending calculations.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `period` | string | Filter by period type |

**Response:**
```json
{
  "budgets": [
    {
      "id": "uuid",
      "category_id": "uuid",
      "amount": 500,
      "period": "monthly",
      "spent": 350,
      "remaining": 150,
      "percentUsed": 70,
      "periodStart": "2024-01-01",
      "periodEnd": "2024-02-01",
      "category": { "name": "Groceries", "color": "#10b981" }
    }
  ]
}
```

#### POST /api/budgets
Create budget.

**Request:**
```json
{
  "category_id": "uuid",
  "amount": 500,
  "period": "monthly",
  "start_date": "2024-01-01",
  "rollover": false,
  "alert_thresholds": [50, 80, 100]
}
```

#### GET /api/budgets/[id]
Get budget with transactions in current period.

#### PATCH /api/budgets/[id]
Update budget.

#### DELETE /api/budgets/[id]
Delete budget.

---

### Goals

#### GET /api/goals
List all goals.

**Response:**
```json
{
  "goals": [
    {
      "id": "uuid",
      "type": "revenue",
      "name": "Q1 Revenue",
      "target_amount": 100000,
      "current_amount": 75000,
      "start_date": "2024-01-01",
      "end_date": "2024-03-31",
      "progress": 75,
      "is_achieved": false
    }
  ]
}
```

#### POST /api/goals
Create goal.

**Request:**
```json
{
  "type": "revenue",
  "name": "Q1 Revenue Target",
  "target_amount": 100000,
  "current_amount": 0,
  "start_date": "2024-01-01",
  "end_date": "2024-03-31"
}
```

#### PATCH /api/goals/[id]
Update goal.

#### DELETE /api/goals/[id]
Delete goal.

---

### Subscriptions

#### GET /api/subscriptions
List subscriptions.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `includeInactive` | boolean | Include paused subscriptions |

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Netflix",
    "amount": -15.99,
    "frequency": "monthly",
    "next_renewal_date": "2024-02-15",
    "is_active": true,
    "category": { "name": "Entertainment" }
  }
]
```

#### POST /api/subscriptions
Create subscription.

#### GET /api/subscriptions/upcoming
Get subscriptions renewing soon.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | number | 7 | Days ahead to check |

#### PUT /api/subscriptions/[id]
Update subscription.

#### DELETE /api/subscriptions/[id]
Delete subscription.

#### POST /api/subscriptions/detect
Auto-detect subscriptions from transactions.

**Response:**
```json
{
  "detected": [
    {
      "name": "Netflix",
      "amount": -15.99,
      "frequency": "monthly",
      "confidence": 95,
      "transaction_count": 12
    }
  ]
}
```

---

### Analytics

#### GET /api/analytics/overview
Dashboard summary metrics.

**Response:**
```json
{
  "currentMonth": {
    "income": 5000,
    "expenses": 2000,
    "profit": 3000
  },
  "lastMonth": {
    "income": 4500,
    "expenses": 1800,
    "profit": 2700
  },
  "changes": {
    "income": 11.11,
    "expenses": 11.11,
    "profit": 11.11
  },
  "totalBalance": 25000,
  "trend": [
    { "month": "2024-01", "label": "Jan", "income": 5000, "expenses": 2000, "profit": 3000 }
  ]
}
```

#### GET /api/analytics/expenses
Expense breakdown.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | Start date (ISO) |
| `endDate` | string | End date (ISO) |

**Response:**
```json
{
  "summary": {
    "totalExpenses": 2000,
    "transactionCount": 45,
    "categoryCount": 8,
    "avgMonthly": 2000
  },
  "byCategory": [
    { "name": "Groceries", "amount": 400, "color": "#10b981", "count": 15 }
  ],
  "monthlyTrend": [
    { "month": "2024-01", "label": "Jan", "amount": 2000 }
  ]
}
```

#### GET /api/analytics/income
Income analysis (same structure as expenses).

#### GET /api/analytics/profit-loss
P&L report.

**Response:**
```json
{
  "summary": {
    "totalIncome": 5000,
    "totalExpenses": 2000,
    "netProfit": 3000,
    "profitMargin": 60
  },
  "incomeByCategory": [...],
  "expensesByCategory": [...],
  "comparison": {
    "income": { "previous": 4500, "change": 500, "percentChange": 11.11 }
  }
}
```

#### GET /api/analytics/cash-flow
Cash flow analysis.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupBy` | string | month | day, week, or month |

**Response:**
```json
{
  "summary": {
    "totalInflow": 5000,
    "totalOutflow": 2000,
    "netCashFlow": 3000
  },
  "trend": [
    {
      "period": "2024-01",
      "inflow": 5000,
      "outflow": 2000,
      "netFlow": 3000,
      "runningBalance": 3000
    }
  ]
}
```

#### GET /api/analytics/calendar
Financial calendar events.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | Yes | Start date |
| `endDate` | string | Yes | End date |

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "subscription",
    "date": "2024-02-15",
    "title": "Netflix",
    "amount": 15.99,
    "color": "#f43f5e"
  }
]
```

---

### KPIs

#### GET /api/kpis
Get KPI metrics for current period.

**Response:**
```json
{
  "industryType": "saas",
  "metrics": [
    {
      "id": "mrr",
      "name": "Monthly Recurring Revenue",
      "value": 50000,
      "previousValue": 48000,
      "change": 2000,
      "changePercent": 4.17,
      "trend": "up"
    }
  ],
  "trends": [
    { "label": "Jan", "value": 48000 },
    { "label": "Feb", "value": 50000 }
  ]
}
```

#### POST /api/kpis/inputs
Submit manual KPI values.

**Request (SaaS example):**
```json
{
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "customer_count": 150,
  "customer_acquisition_cost": 100,
  "lifetime_value": 5000,
  "churned_customers": 2
}
```

---

## Screen Features

### Dashboard

**Displays:**
- Net worth summary card
- Monthly income/expense/profit cards with change indicators
- 6-month trend chart (income vs expenses)
- Quick action buttons (Add Transaction, View Reports)
- Recent transactions list (5 items)

**Actions:**
- Navigate to any sub-section
- Add transaction (quick action)

---

### Accounts List

**Displays:**
- Balance summary (Net Worth, Assets, Liabilities)
- Accounts grouped by type:
  - Checking, Savings (assets)
  - Credit Cards, Loans (liabilities)
  - Cash, Investments, Other
- Each account card shows: name, institution, balance, last 4 digits

**Actions:**
- Add Account → New Account screen
- Tap account → Account Detail
- Edit/Delete via swipe or menu

---

### Account Detail

**Displays:**
- Account header (name, type, institution)
- Current balance (large)
- Transaction list for this account only

**Actions:**
- Edit account details
- Add transaction to this account
- Delete account (with confirmation)

---

### Transactions List

**Displays:**
- Summary cards (Income, Expenses, Net)
- Filter controls (Account dropdown, Date range)
- Transaction list with:
  - Date, Description, Category badge, Amount
  - Color-coded: green (income), red (expense)

**Actions:**
- Add Transaction
- Filter by account
- Filter by date range
- Search by description
- Select multiple → Bulk actions bar
- Tap transaction → Edit
- Swipe → Delete

**Bulk Actions:**
- Set Category (opens picker)
- AI Categorize (auto-suggest)
- Delete Selected

---

### Add/Edit Transaction

**Form Fields:**
- Type toggle: Expense / Income
- Amount (currency input)
- Date (date picker)
- Description (text, required)
- Account (picker)
- Category (picker, grouped by type)
- Notes (optional textarea)

---

### Budgets List

**Displays:**
- Summary cards (Total Budgeted, Spent, Remaining, Over Budget count)
- Period filter (All, Weekly, Monthly, Yearly)
- Budget cards showing:
  - Category name and icon
  - Progress bar (color-coded)
  - Amount: Budgeted / Spent / Remaining
  - Period badge

**Progress Colors:**
- Green: < 50% used
- Blue: 50-80% used
- Amber: 80-100% used
- Red: > 100% (over budget)

**Actions:**
- Add Budget
- Filter by period
- Tap budget → Budget Detail

---

### Budget Detail

**Displays:**
- Category and budget amount
- Large progress ring
- Projection card (daily average, days remaining, projected total)
- Transactions in current budget period

**Actions:**
- Edit budget
- Delete budget

---

### Goals Overview

**Displays:**
- Summary metrics:
  - Active Goals count
  - On Track count
  - Revenue progress %
  - Profit progress %
- Goal type cards (Revenue, Profit, Exit Planning)
- Getting started checklist

**Actions:**
- Navigate to goal type pages

---

### Goal Type Page (Revenue/Profit)

**Displays:**
- Active goals list with:
  - Goal name
  - Progress bar
  - Current / Target amounts
  - Date range
- Achieved goals section (collapsed)

**Actions:**
- Add Goal → Goal Form
- Edit Goal
- Delete Goal

---

### Exit Planning

**Displays:**
- Readiness score (0-100%)
- 4-metric grid:
  - Target Valuation
  - Implied Value (revenue × multiple)
  - Cash Runway (months)
  - Annual Revenue
- Days to exit countdown
- Strategy notes

**Actions:**
- Edit exit plan
- Update metrics

---

### Subscriptions List

**Displays:**
- Summary cards (Monthly Cost, Active Count, Upcoming This Week)
- Upcoming renewals alert (if any within 7 days)
- Tabs: Active / Paused
- Subscription cards:
  - Name, vendor
  - Amount and frequency
  - Next renewal date
  - Category badge

**Actions:**
- Add Subscription
- Detect Subscriptions (AI)
- Edit subscription
- Pause/Resume
- Delete

---

### Analytics Overview

**Displays:**
- Key metrics (4 cards):
  - Monthly Income (with change)
  - Monthly Expenses (with change)
  - Net Profit (with change)
  - Total Balance
- 6-month trend chart
- Report links (P&L, Expenses, Income, Cash Flow)

**Actions:**
- Navigate to detailed reports

---

### Expense Analysis

**Displays:**
- Summary (Total, Count, Categories, Average)
- Date range picker
- Monthly trend chart
- Top categories bar chart
- Full category breakdown table

**Actions:**
- Change date range
- Export to CSV

---

### Income Analysis

Same structure as Expense Analysis, for income sources.

---

### Profit & Loss Report

**Displays:**
- Summary (Income, Expenses, Net Profit, Margin %)
- Income by category (bar chart)
- Expenses by category (bar chart)
- Comparison with previous period

**Actions:**
- Change date range
- Export to CSV

---

### Cash Flow Report

**Displays:**
- Summary (Inflow, Outflow, Net, Average)
- Group by selector (Weekly/Monthly)
- Dual bar chart (inflow vs outflow)
- Running balance line
- Detailed table

**Actions:**
- Change date range
- Change grouping
- Export to CSV

---

### KPI Dashboard

**Displays:**
- Industry type badge (SaaS, Retail, Service)
- KPI metric cards (varies by industry)
- 6-month trend chart
- Benchmarks and status indicators

**SaaS Metrics:**
- MRR, ARR, Churn Rate, LTV:CAC, NRR

**Retail Metrics:**
- Revenue, Gross Margin, Inventory Turnover, DSI

**Service Metrics:**
- Revenue, Utilization Rate, Revenue per Employee

**Actions:**
- Change industry type (via settings)
- Update KPI values (manual input form)

---

## Components Reference

### AccountCard
```typescript
interface AccountCardProps {
  account: Account
  onEdit?: (account: Account) => void
  onDelete?: (account: Account) => void
}
```

### TransactionRow
```typescript
interface TransactionRowProps {
  transaction: TransactionWithCategory
  onEdit?: () => void
  onDelete?: () => void
  showAccount?: boolean
  isSelected?: boolean
  onSelect?: () => void
}
```

### BudgetCard
```typescript
interface BudgetCardProps {
  id: string
  category: Category
  amount: number
  spent: number
  remaining: number
  percentUsed: number
  period: BudgetPeriod
}
```

### GoalCard
```typescript
interface GoalCardProps {
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (goalId: string) => void
}
```

### SubscriptionCard
```typescript
interface SubscriptionCardProps {
  subscription: Subscription
  onEdit?: () => void
  onPause?: () => void
  onDelete?: () => void
}
```

### ProgressBar
```typescript
interface ProgressBarProps {
  percent: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}
```

### MetricCard
```typescript
interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
}
```

### DateRangePicker
```typescript
interface DateRangePickerProps {
  value: { startDate: string; endDate: string }
  onChange: (range: { startDate: string; endDate: string }) => void
  presets?: boolean  // Show preset options
}
```

---

## Mobile Adaptation Guide

### Layout Adjustments

| Web | Mobile |
|-----|--------|
| 3-column grid | Single column, stacked |
| Side-by-side charts | Stacked vertically |
| Data tables | Card-based lists |
| Hover menus | Swipe actions or tap menus |
| Modal dialogs | Full-screen sheets |

### Navigation

```
Bottom Tab Navigator
├── Dashboard (Home icon)
├── Accounts (Wallet icon)
├── Transactions (Receipt icon)
├── Budgets (PieChart icon)
└── More (Menu icon)
    ├── Goals
    ├── Subscriptions
    ├── Analytics
    ├── KPIs
    └── Settings
```

### Touch Targets

- Minimum 44x44 points for buttons
- Swipe actions for edit/delete
- Pull-to-refresh on lists
- Floating action button for "Add"

### Forms

- Full-screen form screens
- Large input fields
- Native date/number pickers
- Keyboard-aware scroll

### Charts

Use `react-native-chart-kit` or `victory-native`:
- Simplified charts for small screens
- Horizontal scroll for timeline charts
- Tap for tooltip details

### Offline Support

Consider caching:
- Accounts list
- Categories
- Recent transactions (last 100)

Queue for sync:
- New transactions
- Budget updates
- Goal updates

### Performance

- Paginate transaction lists (50 per page)
- Lazy load analytics data
- Cache category/account lookups
- Use FlatList with `getItemLayout`

---

## Color Reference

### Account Types
| Type | Color | Icon |
|------|-------|------|
| Checking | Blue | `building-2` |
| Savings | Green | `piggy-bank` |
| Credit Card | Red | `credit-card` |
| Cash | Emerald | `banknote` |
| Investment | Purple | `trending-up` |
| Loan | Orange | `landmark` |
| Other | Gray | `wallet` |

### Transaction Types
| Type | Color |
|------|-------|
| Income | `#10b981` (green) |
| Expense | `#ef4444` (red) |
| Transfer | `#6b7280` (gray) |

### Budget Status
| Status | Color |
|--------|-------|
| On Track (< 50%) | `#10b981` (green) |
| Warning (50-80%) | `#0ea5e9` (blue) |
| Caution (80-100%) | `#f59e0b` (amber) |
| Over Budget | `#ef4444` (red) |

### Goal Types
| Type | Color |
|------|-------|
| Revenue | `#10b981` (green) |
| Profit | `#0ea5e9` (blue) |
| Valuation | `#8b5cf6` (purple) |
| Runway | `#f59e0b` (amber) |
| Revenue Multiple | `#ec4899` (pink) |

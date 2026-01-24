/**
 * Test fixtures for finance-related tools
 */

export const testWorkspaceId = 'test-workspace-id'
export const testUserId = 'test-user-id'

// Account fixtures
export const mockAccount = {
  id: 'acc-123',
  workspace_id: testWorkspaceId,
  name: 'Checking Account',
  type: 'checking',
  balance: 1500.00,
  currency: 'USD',
  institution: 'Chase Bank',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockAccountList = [
  mockAccount,
  {
    id: 'acc-456',
    workspace_id: testWorkspaceId,
    name: 'Savings Account',
    type: 'savings',
    balance: 5000.00,
    currency: 'USD',
    institution: 'Chase Bank',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'acc-789',
    workspace_id: testWorkspaceId,
    name: 'Credit Card',
    type: 'credit',
    balance: -500.00,
    currency: 'USD',
    institution: 'Visa',
    is_active: true,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
]

// Transaction fixtures
export const mockTransaction = {
  id: 'txn-123',
  workspace_id: testWorkspaceId,
  account_id: 'acc-123',
  category_id: 'cat-123',
  amount: -50.00,
  description: 'Grocery shopping',
  date: '2024-01-15',
  type: 'expense',
  status: 'cleared',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export const mockTransactionList = [
  mockTransaction,
  {
    id: 'txn-456',
    workspace_id: testWorkspaceId,
    account_id: 'acc-123',
    category_id: 'cat-456',
    amount: 3000.00,
    description: 'Salary',
    date: '2024-01-01',
    type: 'income',
    status: 'cleared',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// Category fixtures
export const mockCategory = {
  id: 'cat-123',
  workspace_id: testWorkspaceId,
  name: 'Groceries',
  type: 'expense',
  color: '#4CAF50',
  icon: 'shopping-cart',
  parent_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockCategoryList = [
  mockCategory,
  {
    id: 'cat-456',
    workspace_id: testWorkspaceId,
    name: 'Salary',
    type: 'income',
    color: '#2196F3',
    icon: 'dollar',
    parent_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// Budget fixtures
export const mockBudget = {
  id: 'bud-123',
  workspace_id: testWorkspaceId,
  category_id: 'cat-123',
  name: 'Grocery Budget',
  amount: 500.00,
  period: 'monthly',
  start_date: '2024-01-01',
  end_date: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockBudgetList = [
  mockBudget,
  {
    id: 'bud-456',
    workspace_id: testWorkspaceId,
    category_id: 'cat-789',
    name: 'Entertainment Budget',
    amount: 200.00,
    period: 'monthly',
    start_date: '2024-01-01',
    end_date: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// Subscription fixtures
export const mockSubscription = {
  id: 'sub-123',
  workspace_id: testWorkspaceId,
  name: 'Netflix',
  amount: 15.99,
  frequency: 'monthly',
  category_id: 'cat-789',
  account_id: 'acc-123',
  next_billing_date: '2024-02-01',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockSubscriptionList = [
  mockSubscription,
  {
    id: 'sub-456',
    workspace_id: testWorkspaceId,
    name: 'Spotify',
    amount: 9.99,
    frequency: 'monthly',
    category_id: 'cat-789',
    account_id: 'acc-123',
    next_billing_date: '2024-02-15',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// Recurring rule fixtures
export const mockRecurringRule = {
  id: 'rec-123',
  workspace_id: testWorkspaceId,
  name: 'Monthly Rent',
  amount: 2000.00,
  frequency: 'monthly',
  category_id: 'cat-housing',
  account_id: 'acc-123',
  next_date: '2024-02-01',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockRecurringRuleList = [
  mockRecurringRule,
  {
    id: 'rec-456',
    workspace_id: testWorkspaceId,
    name: 'Electric Bill',
    amount: 150.00,
    frequency: 'monthly',
    category_id: 'cat-utilities',
    account_id: 'acc-123',
    next_date: '2024-02-15',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

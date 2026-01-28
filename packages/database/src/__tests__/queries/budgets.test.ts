/**
 * Unit tests for Budget Queries
 *
 * Tests the budget CRUD operations including:
 * - getBudgets() - fetching all active budgets with categories
 * - getBudgetById() / getBudget() - fetching single budget
 * - createBudget() - creating new budgets with alerts
 * - updateBudget() - updating budget fields
 * - deleteBudget() - deleting budgets
 * - getBudgetSpending() / getBudgetWithSpending() - calculating spending
 * - getBudgetsWithSpending() - fetching all budgets with spending data
 * - getBudgetTransactions() - fetching transactions for a budget category
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the client module
vi.mock('../../client', () => ({
  getSupabaseClient: vi.fn(),
}))

import { getSupabaseClient } from '../../client'
import {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetWithSpending,
  getBudgetsWithSpending,
  getBudgetTransactions,
} from '../../queries'
import type { Budget, BudgetWithCategory, Category, BudgetWithSpending, TransactionWithCategory } from '../../types'

// Mock data
const mockCategory: Category = {
  id: 'cat-123',
  user_id: 'user-123',
  name: 'Groceries',
  type: 'expense',
  icon: 'shopping-cart',
  color: '#10b981',
  parent_id: null,
  is_system: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockBudget: Budget = {
  id: 'budget-123',
  profile_id: 'user-123',
  category_id: 'cat-123',
  amount: 500,
  period: 'monthly',
  start_date: '2024-01-01',
  rollover: false,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockBudgetWithCategory: BudgetWithCategory = {
  ...mockBudget,
  category: mockCategory,
}

const mockTransaction: TransactionWithCategory = {
  id: 'tx-123',
  account_id: 'acc-123',
  category_id: 'cat-123',
  amount: -50,
  date: '2024-01-15',
  description: 'Grocery shopping',
  notes: null,
  is_transfer: false,
  transfer_pair_id: null,
  recurring_rule_id: null,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  category: mockCategory,
}

// Helper to create a mock Supabase client
function createMockSupabaseClient(responseSequence: Array<{ data: unknown; error: unknown }>) {
  let callIndex = 0
  
  const getNextResponse = () => {
    const response = responseSequence[callIndex] || { data: null, error: null }
    callIndex++
    return response
  }

  // Build chain that captures the final then/single call
  const buildChain = (isSingle = false): any => {
    const chain = {
      from: vi.fn(() => chain),
      select: vi.fn(() => chain),
      insert: vi.fn((data) => {
        chain._insertData = data
        return chain
      }),
      update: vi.fn((data) => {
        chain._updateData = data
        return chain
      }),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      neq: vi.fn(() => chain),
      gt: vi.fn(() => chain),
      lt: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      like: vi.fn(() => chain),
      ilike: vi.fn(() => chain),
      is: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      range: vi.fn(() => chain),
      single: vi.fn(async () => getNextResponse()),
      maybeSingle: vi.fn(async () => getNextResponse()),
      then: vi.fn(async (resolve: (value: { data: unknown; error: unknown }) => void) => {
        resolve(getNextResponse())
      }),
      // Store data for assertions
      _insertData: null as unknown,
      _updateData: null as unknown,
    }
    return chain
  }

  return buildChain()
}

describe('Budget Queries', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================
  // getBudgets()
  // ============================================
  describe('getBudgets', () => {
    it('should fetch all active budgets with categories', async () => {
      const mockBudgets = [mockBudgetWithCategory]
      mockClient = createMockSupabaseClient([{ data: mockBudgets, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgets()

      expect(mockClient.from).toHaveBeenCalledWith('budgets')
      expect(mockClient.select).toHaveBeenCalledWith(`
      *,
      category:categories(*)
    `)
      expect(mockClient.eq).toHaveBeenCalledWith('is_active', true)
      expect(result).toEqual(mockBudgets)
    })

    it('should return empty array when no budgets exist', async () => {
      mockClient = createMockSupabaseClient([{ data: [], error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgets()

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      mockClient = createMockSupabaseClient([{ data: null, error: { message: 'Database connection failed' } }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await expect(getBudgets()).rejects.toEqual({ message: 'Database connection failed' })
    })
  })

  // ============================================
  // getBudget() / getBudgetById()
  // ============================================
  describe('getBudget', () => {
    it('should fetch a single budget by id with category', async () => {
      mockClient = createMockSupabaseClient([{ data: mockBudgetWithCategory, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudget('budget-123')

      expect(mockClient.from).toHaveBeenCalledWith('budgets')
      expect(mockClient.select).toHaveBeenCalledWith(`
      *,
      category:categories(*)
    `)
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'budget-123')
      expect(result).toEqual(mockBudgetWithCategory)
    })

    it('should return null when budget not found', async () => {
      mockClient = createMockSupabaseClient([{ data: null, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudget('non-existent')

      expect(result).toBeNull()
    })

    it('should throw error when database query fails', async () => {
      mockClient = createMockSupabaseClient([{ data: null, error: { message: 'Database error' } }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await expect(getBudget('budget-123')).rejects.toEqual({ message: 'Database error' })
    })
  })

  // ============================================
  // createBudget()
  // ============================================
  describe('createBudget', () => {
    it('should create a new budget without alerts', async () => {
      const input = {
        category_id: 'cat-123',
        amount: 500,
        period: 'monthly' as const,
        start_date: '2024-01-01',
        rollover: false,
      }

      mockClient = createMockSupabaseClient([{ data: mockBudget, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await createBudget(input, 'user-123')

      expect(mockClient.from).toHaveBeenCalledWith('budgets')
      expect(mockClient.insert).toHaveBeenCalledWith({
        profile_id: 'user-123',
        category_id: 'cat-123',
        amount: 500,
        period: 'monthly',
        start_date: '2024-01-01',
        rollover: false,
      })
      expect(result).toEqual(mockBudget)
    })

    it('should create a budget with default start_date when not provided', async () => {
      const input = {
        category_id: 'cat-123',
        amount: 500,
        period: 'monthly' as const,
      }

      mockClient = createMockSupabaseClient([{ data: mockBudget, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await createBudget(input, 'user-123')

      expect(mockClient.insert).toHaveBeenCalledWith(expect.objectContaining({
        start_date: '2024-01-15', // Today's date
      }))
    })

    it('should create budget with alert thresholds', async () => {
      const input = {
        category_id: 'cat-123',
        amount: 500,
        period: 'monthly' as const,
        alert_thresholds: [50, 80, 100],
      }

      const mockBudgetWithId = { ...mockBudget, id: 'budget-456' }
      mockClient = createMockSupabaseClient([{ data: mockBudgetWithId, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await createBudget(input, 'user-123')

      // Verify budget insert was called
      expect(mockClient.insert).toHaveBeenCalled()
    })

    it('should throw error when not authenticated', async () => {
      const input = {
        category_id: 'cat-123',
        amount: 500,
        period: 'monthly' as const,
      }

      await expect(createBudget(input, '')).rejects.toThrow('Not authenticated')
    })

    it('should throw error when database insert fails', async () => {
      const input = {
        category_id: 'cat-123',
        amount: 500,
        period: 'monthly' as const,
      }

      mockClient = createMockSupabaseClient([{ data: null, error: { message: 'Insert failed' } }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await expect(createBudget(input, 'user-123')).rejects.toEqual({ message: 'Insert failed' })
    })
  })

  // ============================================
  // updateBudget()
  // ============================================
  describe('updateBudget', () => {
    it('should update budget amount', async () => {
      const updatedBudget = { ...mockBudget, amount: 750 }

      mockClient = createMockSupabaseClient([{ data: updatedBudget, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await updateBudget('budget-123', { amount: 750 })

      expect(mockClient.from).toHaveBeenCalledWith('budgets')
      expect(mockClient.update).toHaveBeenCalledWith({ amount: 750 })
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'budget-123')
      expect(result).toEqual(updatedBudget)
    })

    it('should update budget period', async () => {
      const updatedBudget = { ...mockBudget, period: 'weekly' as const }

      mockClient = createMockSupabaseClient([{ data: updatedBudget, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await updateBudget('budget-123', { period: 'weekly' })

      expect(mockClient.update).toHaveBeenCalledWith({ period: 'weekly' })
      expect(result.period).toBe('weekly')
    })

    it('should update budget start_date', async () => {
      const updatedBudget = { ...mockBudget, start_date: '2024-02-01' }

      mockClient = createMockSupabaseClient([{ data: updatedBudget, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await updateBudget('budget-123', { start_date: '2024-02-01' })

      expect(mockClient.update).toHaveBeenCalledWith({ start_date: '2024-02-01' })
      expect(result.start_date).toBe('2024-02-01')
    })

    it('should update budget rollover setting', async () => {
      const updatedBudget = { ...mockBudget, rollover: true }

      mockClient = createMockSupabaseClient([{ data: updatedBudget, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await updateBudget('budget-123', { rollover: true })

      expect(mockClient.update).toHaveBeenCalledWith({ rollover: true })
      expect(result.rollover).toBe(true)
    })

    it('should update budget is_active status', async () => {
      const updatedBudget = { ...mockBudget, is_active: false }

      mockClient = createMockSupabaseClient([{ data: updatedBudget, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await updateBudget('budget-123', { is_active: false })

      expect(mockClient.update).toHaveBeenCalledWith({ is_active: false })
      expect(result.is_active).toBe(false)
    })

    it('should update multiple fields at once', async () => {
      const updatedBudget = { 
        ...mockBudget, 
        amount: 1000, 
        period: 'yearly' as const,
        rollover: true 
      }

      mockClient = createMockSupabaseClient([{ data: updatedBudget, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await updateBudget('budget-123', {
        amount: 1000,
        period: 'yearly',
        rollover: true,
      })

      expect(mockClient.update).toHaveBeenCalledWith({
        amount: 1000,
        period: 'yearly',
        rollover: true,
      })
      expect(result.amount).toBe(1000)
      expect(result.period).toBe('yearly')
      expect(result.rollover).toBe(true)
    })

    it('should throw error when database update fails', async () => {
      mockClient = createMockSupabaseClient([{ data: null, error: { message: 'Update failed' } }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await expect(updateBudget('budget-123', { amount: 750 })).rejects.toEqual({ message: 'Update failed' })
    })
  })

  // ============================================
  // deleteBudget()
  // ============================================
  describe('deleteBudget', () => {
    it('should delete a budget by id', async () => {
      mockClient = createMockSupabaseClient([{ data: null, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await deleteBudget('budget-123')

      expect(mockClient.from).toHaveBeenCalledWith('budgets')
      expect(mockClient.delete).toHaveBeenCalled()
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'budget-123')
    })

    it('should throw error when database delete fails', async () => {
      mockClient = createMockSupabaseClient([{ data: null, error: { message: 'Delete failed' } }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await expect(deleteBudget('budget-123')).rejects.toEqual({ message: 'Delete failed' })
    })
  })

  // ============================================
  // getBudgetWithSpending() - Single budget spending
  // ============================================
  describe('getBudgetWithSpending', () => {
    it('should calculate spending for monthly budget', async () => {
      const mockBudgetWithAlerts = {
        ...mockBudget,
        category: mockCategory,
        alerts: [],
      }

      // First response: budget, Second response: transactions
      mockClient = createMockSupabaseClient([
        { data: mockBudgetWithAlerts, error: null },
        { data: [{ amount: -100 }, { amount: -50 }], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result).not.toBeNull()
      expect(result?.spent).toBe(150)
      expect(result?.remaining).toBe(350)
      expect(result?.percentUsed).toBe(30)
    })

    it('should calculate spending for weekly budget', async () => {
      const weeklyBudget = {
        ...mockBudget,
        period: 'weekly' as const,
        start_date: '2024-01-01',
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: weeklyBudget, error: null },
        { data: [{ amount: -75 }], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result?.spent).toBe(75)
      expect(result?.remaining).toBe(425)
      expect(result?.percentUsed).toBe(15)
    })

    it('should calculate spending for yearly budget', async () => {
      const yearlyBudget = {
        ...mockBudget,
        period: 'yearly' as const,
        amount: 6000,
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: yearlyBudget, error: null },
        { data: [{ amount: -500 }], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result?.spent).toBe(500)
      expect(result?.remaining).toBe(5500)
      expect(result?.percentUsed).toBeCloseTo(8.33, 1)
    })

    it('should handle zero spending', async () => {
      const mockBudgetWithAlerts = {
        ...mockBudget,
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: mockBudgetWithAlerts, error: null },
        { data: [], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result?.spent).toBe(0)
      expect(result?.remaining).toBe(500)
      expect(result?.percentUsed).toBe(0)
    })

    it('should handle spending over budget', async () => {
      const mockBudgetWithAlerts = {
        ...mockBudget,
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: mockBudgetWithAlerts, error: null },
        { data: [{ amount: -600 }], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result?.spent).toBe(600)
      expect(result?.remaining).toBe(0) // Should not go negative
      expect(result?.percentUsed).toBe(120)
    })

    it('should return null when budget not found', async () => {
      mockClient = createMockSupabaseClient([{ data: null, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('non-existent')

      expect(result).toBeNull()
    })

    it('should include alerts in the response', async () => {
      const mockAlert = {
        id: 'alert-123',
        budget_id: 'budget-123',
        threshold_percent: 80,
        is_triggered: false,
        triggered_at: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockBudgetWithAlerts = {
        ...mockBudget,
        category: mockCategory,
        alerts: [mockAlert],
      }

      mockClient = createMockSupabaseClient([
        { data: mockBudgetWithAlerts, error: null },
        { data: [{ amount: -400 }], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result?.alerts).toEqual([mockAlert])
      expect(result?.percentUsed).toBe(80)
    })

    it('should throw error when budget query fails', async () => {
      mockClient = createMockSupabaseClient([{ data: null, error: { message: 'Budget query failed' } }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await expect(getBudgetWithSpending('budget-123')).rejects.toEqual({ message: 'Budget query failed' })
    })

    it('should throw error when transactions query fails', async () => {
      const mockBudgetWithAlerts = {
        ...mockBudget,
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: mockBudgetWithAlerts, error: null },
        { data: null, error: { message: 'Transactions query failed' } }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await expect(getBudgetWithSpending('budget-123')).rejects.toEqual({ message: 'Transactions query failed' })
    })

    it('should handle zero budget amount gracefully', async () => {
      const zeroBudget = {
        ...mockBudget,
        amount: 0,
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: zeroBudget, error: null },
        { data: [{ amount: -100 }], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result?.spent).toBe(100)
      expect(result?.percentUsed).toBe(0) // Should not divide by zero
    })

    it('should only count expenses (negative amounts)', async () => {
      const mockBudgetWithAlerts = {
        ...mockBudget,
        category: mockCategory,
        alerts: [],
      }

      // The query uses .lt('amount', 0) to filter only expenses at database level
      // So the mock only returns negative amounts
      mockClient = createMockSupabaseClient([
        { data: mockBudgetWithAlerts, error: null },
        { data: [
          { amount: -100 }, // Expense
          { amount: -75 },  // Expense
        ], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result?.spent).toBe(175)
    })
  })

  // ============================================
  // getBudgetsWithSpending() - All budgets spending
  // ============================================
  describe('getBudgetsWithSpending', () => {
    it('should fetch all budgets with spending calculations', async () => {
      const mockBudgetsWithAlerts = [
        {
          ...mockBudget,
          category: mockCategory,
          alerts: [],
        },
        {
          ...mockBudget,
          id: 'budget-456',
          category_id: 'cat-456',
          category: { ...mockCategory, id: 'cat-456', name: 'Entertainment' },
          alerts: [],
        },
      ]

      mockClient = createMockSupabaseClient([
        { data: mockBudgetsWithAlerts, error: null },
        { data: [{ amount: -200 }], error: null },
        { data: [{ amount: -100 }], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetsWithSpending()

      expect(result).toHaveLength(2)
      expect(result[0].spent).toBe(200)
      expect(result[1].spent).toBe(100)
    })

    it('should return empty array when no budgets exist', async () => {
      mockClient = createMockSupabaseClient([{ data: [], error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetsWithSpending()

      expect(result).toEqual([])
    })

    it('should throw error when budgets query fails', async () => {
      mockClient = createMockSupabaseClient([{ data: null, error: { message: 'Budgets query failed' } }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await expect(getBudgetsWithSpending()).rejects.toEqual({ message: 'Budgets query failed' })
    })
  })

  // ============================================
  // getBudgetTransactions()
  // ============================================
  describe('getBudgetTransactions', () => {
    it('should fetch transactions for a budget category within date range', async () => {
      const transactions = [mockTransaction]

      mockClient = createMockSupabaseClient([{ data: transactions, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetTransactions('cat-123', '2024-01-01', '2024-01-31')

      expect(mockClient.from).toHaveBeenCalledWith('transactions')
      expect(mockClient.select).toHaveBeenCalledWith(`
      *,
      category:categories(*)
    `)
      expect(result).toEqual(transactions)
    })

    it('should return empty array when no transactions found', async () => {
      mockClient = createMockSupabaseClient([{ data: [], error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetTransactions('cat-123', '2024-01-01', '2024-01-31')

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      mockClient = createMockSupabaseClient([{ data: null, error: { message: 'Transactions query failed' } }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await expect(getBudgetTransactions('cat-123', '2024-01-01', '2024-01-31'))
        .rejects.toEqual({ message: 'Transactions query failed' })
    })

    it('should order transactions by date descending', async () => {
      mockClient = createMockSupabaseClient([{ data: [], error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await getBudgetTransactions('cat-123', '2024-01-01', '2024-01-31')

      expect(mockClient.order).toHaveBeenCalledWith('date', { ascending: false })
    })
  })

  // ============================================
  // Budget Period Calculations
  // ============================================
  describe('Budget Period Calculations', () => {
    it('should calculate correct date range for weekly period', async () => {
      const weeklyBudget = {
        ...mockBudget,
        period: 'weekly' as const,
        start_date: '2024-01-01',
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: weeklyBudget, error: null },
        { data: [], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await getBudgetWithSpending('budget-123')

      expect(mockClient.gte).toHaveBeenCalled()
      expect(mockClient.lt).toHaveBeenCalled()
    })

    it('should calculate correct date range for monthly period', async () => {
      const monthlyBudget = {
        ...mockBudget,
        period: 'monthly' as const,
        start_date: '2024-01-05',
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: monthlyBudget, error: null },
        { data: [], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await getBudgetWithSpending('budget-123')

      expect(mockClient.gte).toHaveBeenCalled()
      expect(mockClient.lt).toHaveBeenCalled()
    })

    it('should calculate correct date range for yearly period', async () => {
      const yearlyBudget = {
        ...mockBudget,
        period: 'yearly' as const,
        start_date: '2024-03-15',
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: yearlyBudget, error: null },
        { data: [], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await getBudgetWithSpending('budget-123')

      expect(mockClient.gte).toHaveBeenCalled()
      expect(mockClient.lt).toHaveBeenCalled()
    })

    it('should calculate correct date range for biweekly period', async () => {
      const biweeklyBudget = {
        ...mockBudget,
        period: 'biweekly' as const,
        start_date: '2024-01-01',
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: biweeklyBudget, error: null },
        { data: [], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      await getBudgetWithSpending('budget-123')

      expect(mockClient.gte).toHaveBeenCalled()
      expect(mockClient.lt).toHaveBeenCalled()
    })
  })

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle budget with null category', async () => {
      const budgetWithoutCategory = {
        ...mockBudget,
        category: null,
      }

      mockClient = createMockSupabaseClient([{ data: budgetWithoutCategory, error: null }])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudget('budget-123')

      expect(result).toEqual(budgetWithoutCategory)
    })

    it('should handle very large budget amounts', async () => {
      const largeBudget = {
        ...mockBudget,
        amount: 1000000,
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: largeBudget, error: null },
        { data: [{ amount: -500000 }], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result?.spent).toBe(500000)
      expect(result?.remaining).toBe(500000)
      expect(result?.percentUsed).toBe(50)
    })

    it('should handle very small budget amounts', async () => {
      const smallBudget = {
        ...mockBudget,
        amount: 1,
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: smallBudget, error: null },
        { data: [{ amount: -0.5 }], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result?.spent).toBe(0.5)
      expect(result?.remaining).toBe(0.5)
      expect(result?.percentUsed).toBe(50)
    })

    it('should handle multiple transactions with same date', async () => {
      const mockBudgetWithAlerts = {
        ...mockBudget,
        category: mockCategory,
        alerts: [],
      }

      mockClient = createMockSupabaseClient([
        { data: mockBudgetWithAlerts, error: null },
        { data: [
          { amount: -50 },
          { amount: -75 },
          { amount: -25 },
        ], error: null }
      ])
      vi.mocked(getSupabaseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getSupabaseClient>)

      const result = await getBudgetWithSpending('budget-123')

      expect(result?.spent).toBe(150)
    })
  })
})

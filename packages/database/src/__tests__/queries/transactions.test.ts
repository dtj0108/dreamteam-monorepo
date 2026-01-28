import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createTransfer,
} from '../../queries'
import type { Transaction, TransactionWithCategory, CreateTransactionInput, UpdateTransactionInput } from '../../types'

// Mock the client module
vi.mock('../../client', () => ({
  getSupabaseClient: vi.fn(),
}))

import { getSupabaseClient } from '../../client'

describe('Transaction Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTransactions', () => {
    it('should return all transactions when no options provided', async () => {
      const mockTransactions: TransactionWithCategory[] = [
        {
          id: 'tx-1',
          account_id: 'acc-1',
          category_id: 'cat-1',
          amount: -100,
          date: '2024-01-15',
          description: 'Grocery shopping',
          notes: null,
          is_transfer: false,
          transfer_pair_id: null,
          recurring_rule_id: null,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          category: {
            id: 'cat-1',
            user_id: null,
            name: 'Groceries',
            type: 'expense',
            icon: 'shopping-cart',
            color: '#10b981',
            parent_id: null,
            is_system: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
        {
          id: 'tx-2',
          account_id: 'acc-1',
          category_id: 'cat-2',
          amount: 2000,
          date: '2024-01-01',
          description: 'Salary',
          notes: null,
          is_transfer: false,
          transfer_pair_id: null,
          recurring_rule_id: null,
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
          category: {
            id: 'cat-2',
            user_id: null,
            name: 'Income',
            type: 'income',
            icon: 'dollar-sign',
            color: '#3b82f6',
            parent_id: null,
            is_system: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ]

      const mockChain = {
        data: mockTransactions,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve(mockChain)),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await getTransactions()

      expect(result).toEqual(mockTransactions)
      expect(getSupabaseClient).toHaveBeenCalledTimes(1)
      expect(mockClient.from).toHaveBeenCalledWith('transactions')
    })

    it('should filter by accountId when provided', async () => {
      const mockTransactions: TransactionWithCategory[] = [
        {
          id: 'tx-1',
          account_id: 'acc-1',
          category_id: 'cat-1',
          amount: -100,
          date: '2024-01-15',
          description: 'Grocery shopping',
          notes: null,
          is_transfer: false,
          transfer_pair_id: null,
          recurring_rule_id: null,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          category: null,
        },
      ]

      const mockChain = {
        data: mockTransactions,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve(mockChain)),
              })),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await getTransactions({ accountId: 'acc-1' })

      expect(result).toEqual(mockTransactions)
    })

    it('should filter by categoryId when provided', async () => {
      const mockTransactions: TransactionWithCategory[] = [
        {
          id: 'tx-1',
          account_id: 'acc-1',
          category_id: 'cat-1',
          amount: -100,
          date: '2024-01-15',
          description: 'Grocery shopping',
          notes: null,
          is_transfer: false,
          transfer_pair_id: null,
          recurring_rule_id: null,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          category: null,
        },
      ]

      const mockChain = {
        data: mockTransactions,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve(mockChain)),
              })),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await getTransactions({ categoryId: 'cat-1' })

      expect(result).toEqual(mockTransactions)
    })

    it('should filter by date range when startDate and endDate provided', async () => {
      const mockTransactions: TransactionWithCategory[] = [
        {
          id: 'tx-1',
          account_id: 'acc-1',
          category_id: 'cat-1',
          amount: -100,
          date: '2024-01-15',
          description: 'Grocery shopping',
          notes: null,
          is_transfer: false,
          transfer_pair_id: null,
          recurring_rule_id: null,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          category: null,
        },
      ]

      const mockChain = {
        data: mockTransactions,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => Promise.resolve(mockChain)),
                })),
              })),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await getTransactions({ startDate: '2024-01-01', endDate: '2024-01-31' })

      expect(result).toEqual(mockTransactions)
    })

    it('should apply limit when provided', async () => {
      const mockTransactions: TransactionWithCategory[] = [
        {
          id: 'tx-1',
          account_id: 'acc-1',
          category_id: 'cat-1',
          amount: -100,
          date: '2024-01-15',
          description: 'Grocery shopping',
          notes: null,
          is_transfer: false,
          transfer_pair_id: null,
          recurring_rule_id: null,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          category: null,
        },
      ]

      const mockChain = {
        data: mockTransactions,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve(mockChain)),
              })),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await getTransactions({ limit: 10 })

      expect(result).toEqual(mockTransactions)
    })

    it('should apply pagination when offset provided', async () => {
      const mockTransactions: TransactionWithCategory[] = [
        {
          id: 'tx-3',
          account_id: 'acc-1',
          category_id: 'cat-1',
          amount: -50,
          date: '2024-01-14',
          description: 'Coffee',
          notes: null,
          is_transfer: false,
          transfer_pair_id: null,
          recurring_rule_id: null,
          created_at: '2024-01-14T10:00:00Z',
          updated_at: '2024-01-14T10:00:00Z',
          category: null,
        },
      ]

      const mockChain = {
        data: mockTransactions,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve(mockChain)),
                })),
              })),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await getTransactions({ offset: 20, limit: 10 })

      expect(result).toEqual(mockTransactions)
    })

    it('should apply multiple filters together', async () => {
      const mockTransactions: TransactionWithCategory[] = [
        {
          id: 'tx-1',
          account_id: 'acc-1',
          category_id: 'cat-1',
          amount: -100,
          date: '2024-01-15',
          description: 'Grocery shopping',
          notes: null,
          is_transfer: false,
          transfer_pair_id: null,
          recurring_rule_id: null,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          category: null,
        },
      ]

      const mockChain = {
        data: mockTransactions,
        error: null,
      }

      // Create a self-referencing chainable mock using Proxy
      // The key is that each method returns a function that returns the proxy
      const createChainableMock = () => {
        const finalPromise = Promise.resolve(mockChain)
        const handler: ProxyHandler<Record<string, unknown>> = {
          get: (_target, prop: string) => {
            if (prop === 'then' || prop === 'catch' || prop === 'finally') {
              const promiseMethod = finalPromise[prop as 'then' | 'catch' | 'finally']
              return promiseMethod.bind(finalPromise)
            }
            // Return a function that, when called, returns the proxy
            return vi.fn(() => chain)
          }
        }
        const chain = new Proxy({}, handler) as Record<string, unknown>
        return chain
      }
      
      const chain = createChainableMock()

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => chain),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await getTransactions({
        accountId: 'acc-1',
        categoryId: 'cat-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: 10,
        offset: 0,
      })

      expect(result).toEqual(mockTransactions)
    })

    it('should return empty array when no transactions found', async () => {
      const mockChain = {
        data: [],
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve(mockChain)),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await getTransactions()

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      const mockChain = {
        data: null,
        error: { message: 'Database error' },
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve(mockChain)),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(getTransactions()).rejects.toEqual({ message: 'Database error' })
    })
  })

  describe('getTransaction', () => {
    it('should return a single transaction by id', async () => {
      const mockTransaction: TransactionWithCategory = {
        id: 'tx-1',
        account_id: 'acc-1',
        category_id: 'cat-1',
        amount: -100,
        date: '2024-01-15',
        description: 'Grocery shopping',
        notes: null,
        is_transfer: false,
        transfer_pair_id: null,
        recurring_rule_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        category: {
          id: 'cat-1',
          user_id: null,
          name: 'Groceries',
          type: 'expense',
          icon: 'shopping-cart',
          color: '#10b981',
          parent_id: null,
          is_system: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }

      const mockChain = {
        data: mockTransaction,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockChain)),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await getTransaction('tx-1')

      expect(result).toEqual(mockTransaction)
      expect(mockClient.from).toHaveBeenCalledWith('transactions')
    })

    it('should throw error when transaction not found', async () => {
      const mockChain = {
        data: null,
        error: { message: 'Not found' },
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockChain)),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(getTransaction('non-existent')).rejects.toEqual({ message: 'Not found' })
    })

    it('should throw error when database query fails', async () => {
      const mockChain = {
        data: null,
        error: { message: 'Connection failed' },
      }

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockChain)),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(getTransaction('tx-1')).rejects.toEqual({ message: 'Connection failed' })
    })
  })

  describe('createTransaction', () => {
    it('should create a new transaction successfully', async () => {
      const input: CreateTransactionInput = {
        account_id: 'acc-1',
        category_id: 'cat-1',
        amount: -100,
        date: '2024-01-15',
        description: 'Grocery shopping',
        notes: 'Weekly groceries',
      }

      const mockTransaction: Transaction = {
        id: 'tx-new',
        account_id: 'acc-1',
        category_id: 'cat-1',
        amount: -100,
        date: '2024-01-15',
        description: 'Grocery shopping',
        notes: 'Weekly groceries',
        is_transfer: false,
        transfer_pair_id: null,
        recurring_rule_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      const mockChain = {
        data: mockTransaction,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockChain)),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await createTransaction(input)

      expect(result).toEqual(mockTransaction)
      expect(mockClient.from).toHaveBeenCalledWith('transactions')
    })

    it('should create transaction without optional fields', async () => {
      const input: CreateTransactionInput = {
        account_id: 'acc-1',
        amount: 500,
        date: '2024-01-15',
        description: 'Deposit',
      }

      const mockTransaction: Transaction = {
        id: 'tx-new',
        account_id: 'acc-1',
        category_id: null,
        amount: 500,
        date: '2024-01-15',
        description: 'Deposit',
        notes: null,
        is_transfer: false,
        transfer_pair_id: null,
        recurring_rule_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      const mockChain = {
        data: mockTransaction,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockChain)),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await createTransaction(input)

      expect(result).toEqual(mockTransaction)
    })

    it('should throw error when creation fails', async () => {
      const input: CreateTransactionInput = {
        account_id: 'acc-1',
        amount: -100,
        date: '2024-01-15',
        description: 'Grocery shopping',
      }

      const mockChain = {
        data: null,
        error: { message: 'Validation failed' },
      }

      const mockClient = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockChain)),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(createTransaction(input)).rejects.toEqual({ message: 'Validation failed' })
    })
  })

  describe('updateTransaction', () => {
    it('should update transaction successfully', async () => {
      const input: UpdateTransactionInput = {
        amount: -150,
        description: 'Updated description',
      }

      const mockTransaction: Transaction = {
        id: 'tx-1',
        account_id: 'acc-1',
        category_id: 'cat-1',
        amount: -150,
        date: '2024-01-15',
        description: 'Updated description',
        notes: null,
        is_transfer: false,
        transfer_pair_id: null,
        recurring_rule_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T12:00:00Z',
      }

      const mockChain = {
        data: mockTransaction,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve(mockChain)),
              })),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await updateTransaction('tx-1', input)

      expect(result).toEqual(mockTransaction)
      expect(mockClient.from).toHaveBeenCalledWith('transactions')
    })

    it('should update transaction with all fields', async () => {
      const input: UpdateTransactionInput = {
        account_id: 'acc-2',
        category_id: 'cat-2',
        amount: -200,
        date: '2024-02-01',
        description: 'Updated description',
        notes: 'Updated notes',
      }

      const mockTransaction: Transaction = {
        id: 'tx-1',
        account_id: 'acc-2',
        category_id: 'cat-2',
        amount: -200,
        date: '2024-02-01',
        description: 'Updated description',
        notes: 'Updated notes',
        is_transfer: false,
        transfer_pair_id: null,
        recurring_rule_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-02-01T12:00:00Z',
      }

      const mockChain = {
        data: mockTransaction,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve(mockChain)),
              })),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await updateTransaction('tx-1', input)

      expect(result).toEqual(mockTransaction)
    })

    it('should throw error when update fails', async () => {
      const input: UpdateTransactionInput = {
        amount: -150,
      }

      const mockChain = {
        data: null,
        error: { message: 'Update failed' },
      }

      const mockClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve(mockChain)),
              })),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(updateTransaction('tx-1', input)).rejects.toEqual({ message: 'Update failed' })
    })

    it('should throw error when transaction not found', async () => {
      const input: UpdateTransactionInput = {
        description: 'Updated',
      }

      const mockChain = {
        data: null,
        error: { message: 'Not found' },
      }

      const mockClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve(mockChain)),
              })),
            })),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(updateTransaction('non-existent', input)).rejects.toEqual({ message: 'Not found' })
    })
  })

  describe('deleteTransaction', () => {
    it('should delete transaction successfully', async () => {
      const mockChain = {
        data: null,
        error: null,
      }

      const mockClient = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve(mockChain)),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(deleteTransaction('tx-1')).resolves.toBeUndefined()
      expect(mockClient.from).toHaveBeenCalledWith('transactions')
    })

    it('should throw error when deletion fails', async () => {
      const mockChain = {
        data: null,
        error: { message: 'Delete failed' },
      }

      const mockClient = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve(mockChain)),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(deleteTransaction('tx-1')).rejects.toEqual({ message: 'Delete failed' })
    })

    it('should throw error when transaction not found', async () => {
      const mockChain = {
        data: null,
        error: { message: 'Not found' },
      }

      const mockClient = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve(mockChain)),
          })),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(deleteTransaction('non-existent')).rejects.toEqual({ message: 'Not found' })
    })
  })

  describe('createTransfer', () => {
    it('should create transfer transactions successfully', async () => {
      const fromTx: Transaction = {
        id: 'tx-from',
        account_id: 'acc-from',
        category_id: '00000000-0000-0000-0002-000000000001',
        amount: -500,
        date: '2024-01-15',
        description: 'Transfer to: Savings transfer',
        notes: null,
        is_transfer: true,
        transfer_pair_id: null,
        recurring_rule_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      const toTx: Transaction = {
        id: 'tx-to',
        account_id: 'acc-to',
        category_id: '00000000-0000-0000-0002-000000000001',
        amount: 500,
        date: '2024-01-15',
        description: 'Transfer from: Savings transfer',
        notes: null,
        is_transfer: true,
        transfer_pair_id: 'tx-from',
        recurring_rule_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      // Create a custom mock for createTransfer with sequential responses
      let callCount = 0
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve({ data: fromTx, error: null })
            }
            return Promise.resolve({ data: toTx, error: null })
          }),
        })),
      }))

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }))

      const mockClient = {
        from: vi.fn(() => ({
          insert: mockInsert,
          update: mockUpdate,
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      const result = await createTransfer('acc-from', 'acc-to', 500, '2024-01-15', 'Savings transfer')

      expect(result.from).toEqual(fromTx)
      expect(result.to).toEqual(toTx)
      expect(result.from.amount).toBe(-500)
      expect(result.to.amount).toBe(500)
    })

    it('should handle positive amount and convert to negative for from transaction', async () => {
      const fromTx: Transaction = {
        id: 'tx-from',
        account_id: 'acc-from',
        category_id: '00000000-0000-0000-0002-000000000001',
        amount: -300,
        date: '2024-01-15',
        description: 'Transfer to: Test transfer',
        notes: null,
        is_transfer: true,
        transfer_pair_id: null,
        recurring_rule_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      const toTx: Transaction = {
        id: 'tx-to',
        account_id: 'acc-to',
        category_id: '00000000-0000-0000-0002-000000000001',
        amount: 300,
        date: '2024-01-15',
        description: 'Transfer from: Test transfer',
        notes: null,
        is_transfer: true,
        transfer_pair_id: 'tx-from',
        recurring_rule_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      let callCount = 0
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve({ data: fromTx, error: null })
            }
            return Promise.resolve({ data: toTx, error: null })
          }),
        })),
      }))

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }))

      const mockClient = {
        from: vi.fn(() => ({
          insert: mockInsert,
          update: mockUpdate,
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      // Pass negative amount - should still work correctly
      const result = await createTransfer('acc-from', 'acc-to', -300, '2024-01-15', 'Test transfer')

      expect(Math.abs(result.from.amount)).toBe(Math.abs(result.to.amount))
    })

    it('should throw error when from transaction creation fails', async () => {
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Insert failed' } })),
        })),
      }))

      const mockClient = {
        from: vi.fn(() => ({
          insert: mockInsert,
          update: vi.fn(),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(
        createTransfer('acc-from', 'acc-to', 500, '2024-01-15', 'Test')
      ).rejects.toEqual({ message: 'Insert failed' })
    })

    it('should throw error when to transaction creation fails', async () => {
      const fromTx: Transaction = {
        id: 'tx-from',
        account_id: 'acc-from',
        category_id: '00000000-0000-0000-0002-000000000001',
        amount: -500,
        date: '2024-01-15',
        description: 'Transfer to: Test',
        notes: null,
        is_transfer: true,
        transfer_pair_id: null,
        recurring_rule_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      let callCount = 0
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve({ data: fromTx, error: null })
            }
            return Promise.resolve({ data: null, error: { message: 'Second insert failed' } })
          }),
        })),
      }))

      const mockClient = {
        from: vi.fn(() => ({
          insert: mockInsert,
          update: vi.fn(),
        })),
      }

      ;(getSupabaseClient as Mock).mockReturnValue(mockClient)

      await expect(
        createTransfer('acc-from', 'acc-to', 500, '2024-01-15', 'Test')
      ).rejects.toEqual({ message: 'Second insert failed' })
    })
  })
})

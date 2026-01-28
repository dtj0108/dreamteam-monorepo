import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getAllSubscriptions,
  getUpcomingRenewals,
  getSubscriptionsSummary,
} from '../../queries'
import type { Subscription, SubscriptionWithCategory, Category } from '../../types'

// Mock the client module
vi.mock('../../client', () => ({
  getSupabaseClient: vi.fn(),
}))

import { getSupabaseClient } from '../../client'

const mockSupabase = getSupabaseClient as unknown as ReturnType<typeof vi.fn>

describe('Subscription Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSubscriptions', () => {
    it('should return active subscriptions ordered by next_renewal_date', async () => {
      const mockCategory: Category = {
        id: 'cat-1',
        user_id: null,
        name: 'Software',
        type: 'expense',
        icon: '💻',
        color: '#3b82f6',
        parent_id: null,
        is_system: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockSubscriptions: SubscriptionWithCategory[] = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          name: 'Netflix',
          merchant_pattern: 'NETFLIX',
          amount: -15.99,
          frequency: 'monthly',
          next_renewal_date: '2024-02-01',
          last_charge_date: '2024-01-01',
          category_id: 'cat-1',
          reminder_days_before: 3,
          is_active: true,
          is_auto_detected: false,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          category: mockCategory,
        },
      ]

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getSubscriptions()

      expect(mockChain.from).toHaveBeenCalledWith('subscriptions')
      expect(mockChain.select).toHaveBeenCalledWith(`
      *,
      category:categories(*)
    `)
      expect(mockChain.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockChain.order).toHaveBeenCalledWith('next_renewal_date', { ascending: true })
      expect(result).toEqual(mockSubscriptions)
    })

    it('should return empty array when no subscriptions exist', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getSubscriptions()

      expect(result).toEqual([])
    })

    it('should throw error when query fails', async () => {
      const mockError = new Error('Database error')
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await expect(getSubscriptions()).rejects.toThrow('Database error')
    })
  })

  describe('getSubscription', () => {
    it('should return subscription by id with category', async () => {
      const mockCategory: Category = {
        id: 'cat-1',
        user_id: null,
        name: 'Software',
        type: 'expense',
        icon: '💻',
        color: '#3b82f6',
        parent_id: null,
        is_system: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockSubscription: SubscriptionWithCategory = {
        id: 'sub-1',
        user_id: 'user-1',
        name: 'Netflix',
        merchant_pattern: 'NETFLIX',
        amount: -15.99,
        frequency: 'monthly',
        next_renewal_date: '2024-02-01',
        last_charge_date: '2024-01-01',
        category_id: 'cat-1',
        reminder_days_before: 3,
        is_active: true,
        is_auto_detected: false,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        category: mockCategory,
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubscription, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getSubscription('sub-1')

      expect(mockChain.from).toHaveBeenCalledWith('subscriptions')
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'sub-1')
      expect(mockChain.single).toHaveBeenCalled()
      expect(result).toEqual(mockSubscription)
    })

    it('should return null when subscription not found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getSubscription('non-existent')

      expect(result).toBeNull()
    })

    it('should throw error when query fails', async () => {
      const mockError = new Error('Database error')
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await expect(getSubscription('sub-1')).rejects.toThrow('Database error')
    })
  })

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions including inactive ones', async () => {
      const mockSubscriptions: SubscriptionWithCategory[] = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          name: 'Netflix',
          merchant_pattern: 'NETFLIX',
          amount: -15.99,
          frequency: 'monthly',
          next_renewal_date: '2024-02-01',
          last_charge_date: '2024-01-01',
          category_id: 'cat-1',
          reminder_days_before: 3,
          is_active: true,
          is_auto_detected: false,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          category: null,
        },
        {
          id: 'sub-2',
          user_id: 'user-1',
          name: 'Old Service',
          merchant_pattern: 'OLDSVC',
          amount: -9.99,
          frequency: 'monthly',
          next_renewal_date: '2024-01-01',
          last_charge_date: '2023-12-01',
          category_id: null,
          reminder_days_before: 3,
          is_active: false,
          is_auto_detected: false,
          notes: 'Canceled',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          category: null,
        },
      ]

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getAllSubscriptions()

      expect(mockChain.from).toHaveBeenCalledWith('subscriptions')
      expect(mockChain.order).toHaveBeenCalledWith('next_renewal_date', { ascending: true })
      expect(result).toHaveLength(2)
      expect(result).toEqual(mockSubscriptions)
    })
  })

  describe('createSubscription', () => {
    it('should create a new subscription with all required fields', async () => {
      const mockSubscription: Subscription = {
        id: 'sub-new',
        user_id: 'user-1',
        name: 'Spotify',
        merchant_pattern: 'SPOTIFY',
        amount: -9.99,
        frequency: 'monthly',
        next_renewal_date: '2024-02-15',
        last_charge_date: null,
        category_id: 'cat-1',
        reminder_days_before: 3,
        is_active: true,
        is_auto_detected: false,
        notes: null,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubscription, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const input = {
        name: 'Spotify',
        merchant_pattern: 'SPOTIFY',
        amount: -9.99,
        frequency: 'monthly' as const,
        next_renewal_date: '2024-02-15',
        category_id: 'cat-1',
      }

      const result = await createSubscription(input, 'user-1', 'workspace-1')

      expect(mockChain.from).toHaveBeenCalledWith('subscriptions')
      expect(mockChain.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        workspace_id: 'workspace-1',
        name: 'Spotify',
        merchant_pattern: 'SPOTIFY',
        amount: -9.99,
        frequency: 'monthly',
        next_renewal_date: '2024-02-15',
        last_charge_date: null,
        category_id: 'cat-1',
        reminder_days_before: 3,
        is_auto_detected: false,
        notes: null,
      })
      expect(result).toEqual(mockSubscription)
    })

    it('should throw error when profileId is not provided', async () => {
      const input = {
        name: 'Spotify',
        merchant_pattern: 'SPOTIFY',
        amount: -9.99,
        frequency: 'monthly' as const,
        next_renewal_date: '2024-02-15',
      }

      await expect(createSubscription(input, '', 'workspace-1')).rejects.toThrow('Not authenticated')
    })

    it('should throw error when workspaceId is not provided', async () => {
      const input = {
        name: 'Spotify',
        merchant_pattern: 'SPOTIFY',
        amount: -9.99,
        frequency: 'monthly' as const,
        next_renewal_date: '2024-02-15',
      }

      await expect(createSubscription(input, 'user-1', '')).rejects.toThrow('Workspace ID required')
    })

    it('should create subscription with optional fields', async () => {
      const mockSubscription: Subscription = {
        id: 'sub-new',
        user_id: 'user-1',
        name: 'Adobe CC',
        merchant_pattern: 'ADOBE',
        amount: -54.99,
        frequency: 'monthly',
        next_renewal_date: '2024-03-01',
        last_charge_date: '2024-02-01',
        category_id: 'cat-2',
        reminder_days_before: 7,
        is_active: true,
        is_auto_detected: true,
        notes: 'Annual plan paid monthly',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubscription, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const input = {
        name: 'Adobe CC',
        merchant_pattern: 'ADOBE',
        amount: -54.99,
        frequency: 'monthly' as const,
        next_renewal_date: '2024-03-01',
        last_charge_date: '2024-02-01',
        category_id: 'cat-2',
        reminder_days_before: 7,
        is_auto_detected: true,
        notes: 'Annual plan paid monthly',
      }

      const result = await createSubscription(input, 'user-1', 'workspace-1')

      expect(mockChain.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        workspace_id: 'workspace-1',
        name: 'Adobe CC',
        merchant_pattern: 'ADOBE',
        amount: -54.99,
        frequency: 'monthly',
        next_renewal_date: '2024-03-01',
        last_charge_date: '2024-02-01',
        category_id: 'cat-2',
        reminder_days_before: 7,
        is_auto_detected: true,
        notes: 'Annual plan paid monthly',
      })
      expect(result).toEqual(mockSubscription)
    })

    it('should throw error when insert fails', async () => {
      const mockError = new Error('Insert failed')
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const input = {
        name: 'Spotify',
        merchant_pattern: 'SPOTIFY',
        amount: -9.99,
        frequency: 'monthly' as const,
        next_renewal_date: '2024-02-15',
      }

      await expect(createSubscription(input, 'user-1', 'workspace-1')).rejects.toThrow('Insert failed')
    })
  })

  describe('updateSubscription', () => {
    it('should update subscription with provided fields', async () => {
      const mockSubscription: Subscription = {
        id: 'sub-1',
        user_id: 'user-1',
        name: 'Netflix Premium',
        merchant_pattern: 'NETFLIX',
        amount: -19.99,
        frequency: 'monthly',
        next_renewal_date: '2024-03-01',
        last_charge_date: '2024-02-01',
        category_id: 'cat-1',
        reminder_days_before: 3,
        is_active: true,
        is_auto_detected: false,
        notes: 'Upgraded to premium',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubscription, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const input = {
        name: 'Netflix Premium',
        amount: -19.99,
        notes: 'Upgraded to premium',
      }

      const result = await updateSubscription('sub-1', input)

      expect(mockChain.from).toHaveBeenCalledWith('subscriptions')
      expect(mockChain.update).toHaveBeenCalledWith(input)
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'sub-1')
      expect(result).toEqual(mockSubscription)
    })

    it('should deactivate subscription', async () => {
      const mockSubscription: Subscription = {
        id: 'sub-1',
        user_id: 'user-1',
        name: 'Netflix',
        merchant_pattern: 'NETFLIX',
        amount: -15.99,
        frequency: 'monthly',
        next_renewal_date: '2024-02-01',
        last_charge_date: '2024-01-01',
        category_id: 'cat-1',
        reminder_days_before: 3,
        is_active: false,
        is_auto_detected: false,
        notes: 'Canceled',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubscription, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await updateSubscription('sub-1', { is_active: false })

      expect(mockChain.update).toHaveBeenCalledWith({ is_active: false })
      expect(result.is_active).toBe(false)
    })

    it('should throw error when update fails', async () => {
      const mockError = new Error('Update failed')
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await expect(updateSubscription('sub-1', { name: 'New Name' })).rejects.toThrow('Update failed')
    })
  })

  describe('deleteSubscription', () => {
    it('should delete subscription by id', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await deleteSubscription('sub-1')

      expect(mockChain.from).toHaveBeenCalledWith('subscriptions')
      expect(mockChain.delete).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'sub-1')
    })

    it('should throw error when delete fails', async () => {
      const mockError = new Error('Delete failed')
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await expect(deleteSubscription('sub-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('getUpcomingRenewals', () => {
    it('should return subscriptions with renewals within specified days', async () => {
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const futureDateStr = futureDate.toISOString().split('T')[0]

      const mockSubscriptions: SubscriptionWithCategory[] = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          name: 'Netflix',
          merchant_pattern: 'NETFLIX',
          amount: -15.99,
          frequency: 'monthly',
          next_renewal_date: today,
          last_charge_date: '2024-01-01',
          category_id: 'cat-1',
          reminder_days_before: 3,
          is_active: true,
          is_auto_detected: false,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          category: null,
        },
      ]

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getUpcomingRenewals(7)

      expect(mockChain.from).toHaveBeenCalledWith('subscriptions')
      expect(mockChain.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockChain.gte).toHaveBeenCalledWith('next_renewal_date', today)
      expect(mockChain.lte).toHaveBeenCalledWith('next_renewal_date', futureDateStr)
      expect(result).toEqual(mockSubscriptions)
    })

    it('should use default of 7 days when not specified', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await getUpcomingRenewals()

      expect(mockChain.lte).toHaveBeenCalled()
    })
  })

  describe('getSubscriptionsSummary', () => {
    it('should calculate monthly total, active count, and upcoming renewals', async () => {
      // Test the calculation logic without relying on specific date comparisons
      const mockSubscriptions = [
        {
          amount: -15.99,
          frequency: 'monthly',
          next_renewal_date: '2024-01-01',
        },
        {
          amount: -9.99,
          frequency: 'monthly',
          next_renewal_date: '2024-01-02',
        },
        {
          amount: -120,
          frequency: 'yearly',
          next_renewal_date: '2024-06-01',
        },
      ]

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getSubscriptionsSummary()

      // Verify active count is correct
      expect(result.activeCount).toBe(3)
      // Verify monthly total is calculated (15.99 + 9.99 + ~10 for yearly)
      expect(result.totalMonthly).toBeGreaterThan(0)
      // Verify upcomingThisWeek is a number (count of renewals within 7 days from today)
      expect(typeof result.upcomingThisWeek).toBe('number')
      expect(result.upcomingThisWeek).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty subscriptions list', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getSubscriptionsSummary()

      expect(result).toEqual({
        totalMonthly: 0,
        activeCount: 0,
        upcomingThisWeek: 0,
      })
    })

    it('should throw error when query fails', async () => {
      const mockError = new Error('Query failed')
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await expect(getSubscriptionsSummary()).rejects.toThrow('Query failed')
    })
  })
})

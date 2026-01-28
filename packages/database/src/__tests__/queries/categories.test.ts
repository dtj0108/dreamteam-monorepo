import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../queries'
import type { Category } from '../../types'

// Mock the client module
vi.mock('../../client', () => ({
  getSupabaseClient: vi.fn(),
}))

import { getSupabaseClient } from '../../client'

const mockSupabase = getSupabaseClient as unknown as ReturnType<typeof vi.fn>

describe('Category Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCategories', () => {
    it('should return all categories ordered by type and name', async () => {
      const mockCategories: Category[] = [
        {
          id: 'cat-1',
          user_id: null,
          name: 'Salary',
          type: 'income',
          icon: '💰',
          color: '#10b981',
          parent_id: null,
          is_system: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'cat-2',
          user_id: null,
          name: 'Software',
          type: 'expense',
          icon: '💻',
          color: '#3b82f6',
          parent_id: null,
          is_system: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'cat-3',
          user_id: null,
          name: 'Groceries',
          type: 'expense',
          icon: '🛒',
          color: '#f59e0b',
          parent_id: null,
          is_system: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(function(this: typeof mockChain, ...args: unknown[]) {
          // Return this for chaining, but resolve with data on the last call
          if (args[0] === 'name') {
            return Promise.resolve({ data: mockCategories, error: null })
          }
          return this
        }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getCategories()

      expect(mockChain.from).toHaveBeenCalledWith('categories')
      expect(mockChain.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockCategories)
    })

    it('should return empty array when no categories exist', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(function(this: typeof mockChain, ...args: unknown[]) {
          if (args[0] === 'name') {
            return Promise.resolve({ data: null, error: null })
          }
          return this
        }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getCategories()

      expect(result).toEqual([])
    })

    it('should throw error when query fails', async () => {
      const mockError = new Error('Database error')
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(function(this: typeof mockChain, ...args: unknown[]) {
          if (args[0] === 'name') {
            return Promise.resolve({ data: null, error: mockError })
          }
          return this
        }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await expect(getCategories()).rejects.toThrow('Database error')
    })

    it('should return categories with mixed user_id values', async () => {
      const mockCategories: Category[] = [
        {
          id: 'cat-1',
          user_id: null,
          name: 'System Category',
          type: 'expense',
          icon: '📁',
          color: '#6b7280',
          parent_id: null,
          is_system: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'cat-2',
          user_id: 'user-123',
          name: 'User Category',
          type: 'expense',
          icon: '🏷️',
          color: '#8b5cf6',
          parent_id: null,
          is_system: false,
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
      ]

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(function(this: typeof mockChain, ...args: unknown[]) {
          if (args[0] === 'name') {
            return Promise.resolve({ data: mockCategories, error: null })
          }
          return this
        }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getCategories()

      expect(result).toHaveLength(2)
      expect(result[0].is_system).toBe(true)
      expect(result[1].user_id).toBe('user-123')
    })
  })

  describe('getCategory', () => {
    it('should return category by id', async () => {
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

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getCategory('cat-1')

      expect(mockChain.from).toHaveBeenCalledWith('categories')
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'cat-1')
      expect(mockChain.single).toHaveBeenCalled()
      expect(result).toEqual(mockCategory)
    })

    it('should return null when category not found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getCategory('non-existent')

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

      await expect(getCategory('cat-1')).rejects.toThrow('Database error')
    })

    it('should return category with parent_id', async () => {
      const mockCategory: Category = {
        id: 'cat-child',
        user_id: null,
        name: 'AWS',
        type: 'expense',
        icon: '☁️',
        color: '#ff9900',
        parent_id: 'cat-parent',
        is_system: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await getCategory('cat-child')

      expect(result?.parent_id).toBe('cat-parent')
    })
  })

  describe('createCategory', () => {
    it('should create a new category with required fields', async () => {
      const mockCategory: Category = {
        id: 'cat-new',
        user_id: 'user-1',
        name: 'Custom Category',
        type: 'expense',
        icon: '🏷️',
        color: '#8b5cf6',
        parent_id: null,
        is_system: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const input = {
        name: 'Custom Category',
        type: 'expense' as const,
      }

      const result = await createCategory(input, 'user-1')

      expect(mockChain.from).toHaveBeenCalledWith('categories')
      expect(mockChain.insert).toHaveBeenCalledWith({
        name: 'Custom Category',
        type: 'expense',
        user_id: 'user-1',
        is_system: false,
      })
      expect(result).toEqual(mockCategory)
    })

    it('should create category with optional fields', async () => {
      const mockCategory: Category = {
        id: 'cat-new',
        user_id: 'user-1',
        name: 'Custom Category',
        type: 'income',
        icon: '💰',
        color: '#10b981',
        parent_id: 'cat-parent',
        is_system: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const input = {
        name: 'Custom Category',
        type: 'income' as const,
        icon: '💰',
        color: '#10b981',
        parent_id: 'cat-parent',
      }

      const result = await createCategory(input, 'user-1')

      expect(mockChain.insert).toHaveBeenCalledWith({
        name: 'Custom Category',
        type: 'income',
        icon: '💰',
        color: '#10b981',
        parent_id: 'cat-parent',
        user_id: 'user-1',
        is_system: false,
      })
      expect(result).toEqual(mockCategory)
    })

    it('should throw error when profileId is not provided', async () => {
      const input = {
        name: 'Custom Category',
        type: 'expense' as const,
      }

      await expect(createCategory(input, '')).rejects.toThrow('Not authenticated')
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
        name: 'Custom Category',
        type: 'expense' as const,
      }

      await expect(createCategory(input, 'user-1')).rejects.toThrow('Insert failed')
    })

    it('should always set is_system to false for user-created categories', async () => {
      const mockCategory: Category = {
        id: 'cat-new',
        user_id: 'user-1',
        name: 'User Category',
        type: 'expense',
        icon: '🏷️',
        color: '#6b7280',
        parent_id: null,
        is_system: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await createCategory({ name: 'User Category', type: 'expense' }, 'user-1')

      const insertCall = mockChain.insert.mock.calls[0][0]
      expect(insertCall.is_system).toBe(false)
    })
  })

  describe('updateCategory', () => {
    it('should update category with provided fields', async () => {
      const mockCategory: Category = {
        id: 'cat-1',
        user_id: 'user-1',
        name: 'Updated Category',
        type: 'expense',
        icon: '🆕',
        color: '#ff0000',
        parent_id: null,
        is_system: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const input = {
        name: 'Updated Category',
        icon: '🆕',
        color: '#ff0000',
      }

      const result = await updateCategory('cat-1', input)

      expect(mockChain.from).toHaveBeenCalledWith('categories')
      expect(mockChain.update).toHaveBeenCalledWith(input)
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'cat-1')
      expect(result).toEqual(mockCategory)
    })

    it('should update category type', async () => {
      const mockCategory: Category = {
        id: 'cat-1',
        user_id: 'user-1',
        name: 'Business Income',
        type: 'income',
        icon: '💼',
        color: '#3b82f6',
        parent_id: null,
        is_system: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await updateCategory('cat-1', { type: 'income' })

      expect(mockChain.update).toHaveBeenCalledWith({ type: 'income' })
      expect(result.type).toBe('income')
    })

    it('should update parent_id for subcategory', async () => {
      const mockCategory: Category = {
        id: 'cat-child',
        user_id: 'user-1',
        name: 'Subcategory',
        type: 'expense',
        icon: '📂',
        color: '#6b7280',
        parent_id: 'cat-parent-2',
        is_system: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      const result = await updateCategory('cat-child', { parent_id: 'cat-parent-2' })

      expect(result.parent_id).toBe('cat-parent-2')
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

      await expect(updateCategory('cat-1', { name: 'New Name' })).rejects.toThrow('Update failed')
    })
  })

  describe('deleteCategory', () => {
    it('should delete category by id', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await deleteCategory('cat-1')

      expect(mockChain.from).toHaveBeenCalledWith('categories')
      expect(mockChain.delete).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'cat-1')
    })

    it('should throw error when delete fails', async () => {
      const mockError = new Error('Delete failed')
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await expect(deleteCategory('cat-1')).rejects.toThrow('Delete failed')
    })

    it('should handle deletion of system categories', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabase.mockReturnValue(mockChain)

      await deleteCategory('system-cat-id')

      expect(mockChain.eq).toHaveBeenCalledWith('id', 'system-cat-id')
    })
  })
})

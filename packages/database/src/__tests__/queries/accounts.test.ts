import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAccounts, getAccount, createAccount, updateAccount, deleteAccount } from '../../queries'
import type { Account, CreateAccountInput, UpdateAccountInput } from '../../types'

// Mock the client module
vi.mock('../../client', () => ({
  getSupabaseClient: vi.fn(),
}))

import { getSupabaseClient } from '../../client'

// Helper to create a mock Supabase client with chainable methods
function createMockSupabase(response: { data?: unknown; error?: { message: string } | null }) {
  type ResponseType = typeof response;
  const mockChain = {
    select: vi.fn(() => mockChain),
    insert: vi.fn(() => mockChain),
    update: vi.fn(() => mockChain),
    delete: vi.fn(() => mockChain),
    from: vi.fn(() => mockChain),
    order: vi.fn(() => mockChain),
    eq: vi.fn(() => mockChain),
    single: vi.fn(() => Promise.resolve(response)),
    then: vi.fn((callback: (res: ResponseType) => unknown) => Promise.resolve(callback(response))),
  }
  return mockChain
}

describe('accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAccounts', () => {
    it('should return all accounts ordered by created_at', async () => {
      const mockData: Account[] = [
        {
          id: 'acc-1',
          user_id: 'user-123',
          name: 'Checking',
          type: 'checking',
          balance: 1000,
          institution: 'Bank of America',
          last_four: '1234',
          currency: 'USD',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'acc-2',
          user_id: 'user-123',
          name: 'Savings',
          type: 'savings',
          balance: 5000,
          institution: 'Bank of America',
          last_four: '5678',
          currency: 'USD',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]
      const mockSupabase = createMockSupabase({ data: mockData, error: null })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      const result = await getAccounts()

      expect(result).toEqual(mockData)
      expect(mockSupabase.from).toHaveBeenCalledWith('accounts')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true })
    })

    it('should return empty array when no accounts exist', async () => {
      const mockSupabase = createMockSupabase({ data: null, error: null })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      const result = await getAccounts()

      expect(result).toEqual([])
    })

    it('should throw error on database failure', async () => {
      const mockSupabase = createMockSupabase({ data: null, error: { message: 'Connection failed' } })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      await expect(getAccounts()).rejects.toThrow('Connection failed')
    })
  })

  describe('getAccount', () => {
    it('should return a single account by id', async () => {
      const mockData: Account = {
        id: 'acc-1',
        user_id: 'user-123',
        name: 'Checking',
        type: 'checking',
        balance: 1000,
        institution: 'Bank of America',
        last_four: '1234',
        currency: 'USD',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      const mockSupabase = createMockSupabase({ data: mockData, error: null })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      const result = await getAccount('acc-1')

      expect(result).toEqual(mockData)
      expect(mockSupabase.from).toHaveBeenCalledWith('accounts')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'acc-1')
      expect(mockSupabase.single).toHaveBeenCalled()
    })

    it('should return null when account not found', async () => {
      const mockSupabase = createMockSupabase({ data: null, error: null })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      const result = await getAccount('non-existent-id')

      expect(result).toBeNull()
    })

    it('should throw error on database failure', async () => {
      const mockSupabase = createMockSupabase({ data: null, error: { message: 'Database error' } })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      await expect(getAccount('acc-1')).rejects.toThrow('Database error')
    })
  })

  describe('createAccount', () => {
    it('should create a new account with valid input', async () => {
      const input: CreateAccountInput = {
        name: 'New Account',
        type: 'savings',
        balance: 1000,
        institution: 'Chase',
        last_four: '9999',
        currency: 'USD',
      }
      const profileId = 'user-123'
      const mockData: Account = {
        id: 'acc-new',
        user_id: profileId,
        name: input.name,
        type: input.type,
        balance: input.balance ?? 0,
        institution: input.institution ?? null,
        last_four: input.last_four ?? null,
        currency: input.currency ?? 'USD',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      const mockSupabase = createMockSupabase({ data: mockData, error: null })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      const result = await createAccount(input, profileId)

      expect(result).toEqual(mockData)
      expect(mockSupabase.from).toHaveBeenCalledWith('accounts')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        ...input,
        user_id: profileId,
      })
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.single).toHaveBeenCalled()
    })

    it('should throw error when profileId is empty', async () => {
      const input: CreateAccountInput = {
        name: 'New Account',
        type: 'savings',
      }

      await expect(createAccount(input, '')).rejects.toThrow('Not authenticated')
    })

    it('should throw error when profileId is undefined', async () => {
      const input: CreateAccountInput = {
        name: 'New Account',
        type: 'savings',
      }

      await expect(createAccount(input, undefined as unknown as string)).rejects.toThrow('Not authenticated')
    })

    it('should throw error on database failure', async () => {
      const input: CreateAccountInput = {
        name: 'New Account',
        type: 'savings',
      }
      const profileId = 'user-123'
      const mockSupabase = createMockSupabase({ data: null, error: { message: 'Insert failed' } })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      await expect(createAccount(input, profileId)).rejects.toThrow('Insert failed')
    })

    it('should create account with minimal input (name and type only)', async () => {
      const input: CreateAccountInput = {
        name: 'Minimal Account',
        type: 'cash',
      }
      const profileId = 'user-123'
      const mockData: Account = {
        id: 'acc-minimal',
        user_id: profileId,
        name: 'Minimal Account',
        type: 'cash',
        balance: 0,
        institution: null,
        last_four: null,
        currency: 'USD',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      const mockSupabase = createMockSupabase({ data: mockData, error: null })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      const result = await createAccount(input, profileId)

      expect(result).toEqual(mockData)
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: 'Minimal Account',
        type: 'cash',
        user_id: profileId,
      })
    })
  })

  describe('updateAccount', () => {
    it('should update an existing account', async () => {
      const accountId = 'acc-1'
      const input: UpdateAccountInput = {
        name: 'Updated Account Name',
        balance: 2000,
      }
      const mockData: Account = {
        id: accountId,
        user_id: 'user-123',
        name: 'Updated Account Name',
        type: 'checking',
        balance: 2000,
        institution: 'Bank of America',
        last_four: '1234',
        currency: 'USD',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }
      const mockSupabase = createMockSupabase({ data: mockData, error: null })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      const result = await updateAccount(accountId, input)

      expect(result).toEqual(mockData)
      expect(mockSupabase.from).toHaveBeenCalledWith('accounts')
      expect(mockSupabase.update).toHaveBeenCalledWith(input)
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', accountId)
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.single).toHaveBeenCalled()
    })

    it('should update account is_active status', async () => {
      const accountId = 'acc-1'
      const input: UpdateAccountInput = {
        is_active: false,
      }
      const mockData: Account = {
        id: accountId,
        user_id: 'user-123',
        name: 'Checking',
        type: 'checking',
        balance: 1000,
        institution: 'Bank of America',
        last_four: '1234',
        currency: 'USD',
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }
      const mockSupabase = createMockSupabase({ data: mockData, error: null })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      const result = await updateAccount(accountId, input)

      expect(result.is_active).toBe(false)
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: false })
    })

    it('should throw error on database failure', async () => {
      const accountId = 'acc-1'
      const input: UpdateAccountInput = { name: 'New Name' }
      const mockSupabase = createMockSupabase({ data: null, error: { message: 'Update failed' } })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      await expect(updateAccount(accountId, input)).rejects.toThrow('Update failed')
    })
  })

  describe('deleteAccount', () => {
    it('should delete an account by id', async () => {
      const accountId = 'acc-1'
      const mockSupabase = createMockSupabase({ data: null, error: null })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      await deleteAccount(accountId)

      expect(mockSupabase.from).toHaveBeenCalledWith('accounts')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', accountId)
    })

    it('should throw error on database failure', async () => {
      const accountId = 'acc-1'
      const mockSupabase = createMockSupabase({ data: null, error: { message: 'Delete failed' } })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      await expect(deleteAccount(accountId)).rejects.toThrow('Delete failed')
    })

    it('should complete without error when account does not exist', async () => {
      const accountId = 'non-existent-id'
      const mockSupabase = createMockSupabase({ data: null, error: null })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)

      await expect(deleteAccount(accountId)).resolves.toBeUndefined()
    })
  })
})

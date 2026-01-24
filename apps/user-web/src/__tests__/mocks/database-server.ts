import { vi } from 'vitest'

// Chainable mock that returns itself for query building
export const mockAdminClient = {
  from: vi.fn(() => mockAdminClient),
  select: vi.fn(() => mockAdminClient),
  insert: vi.fn(() => mockAdminClient),
  update: vi.fn(() => mockAdminClient),
  delete: vi.fn(() => mockAdminClient),
  eq: vi.fn(() => mockAdminClient),
  neq: vi.fn(() => mockAdminClient),
  in: vi.fn(() => mockAdminClient),
  gt: vi.fn(() => mockAdminClient),
  lt: vi.fn(() => mockAdminClient),
  gte: vi.fn(() => mockAdminClient),
  lte: vi.fn(() => mockAdminClient),
  like: vi.fn(() => mockAdminClient),
  ilike: vi.fn(() => mockAdminClient),
  is: vi.fn(() => mockAdminClient),
  order: vi.fn(() => mockAdminClient),
  limit: vi.fn(() => mockAdminClient),
  range: vi.fn(() => mockAdminClient),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  then: vi.fn((resolve: (value: { data: unknown; error: null }) => void) =>
    resolve({ data: [], error: null })
  ),
  auth: {
    admin: {
      getUserById: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null
      })),
    },
    getUser: vi.fn(() => Promise.resolve({
      data: { user: null },
      error: null
    })),
  },
}

export const createAdminClient = vi.fn(() => mockAdminClient)
export const createServerSupabaseClient = vi.fn(() => Promise.resolve(mockAdminClient))

export default mockAdminClient

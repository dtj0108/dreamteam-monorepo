import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface MockSupabaseOverrides {
  data?: unknown
  error?: { message: string; code?: string } | null
}

export function mockSupabase(overrides: MockSupabaseOverrides = {}) {
  const mockClient = {
    from: vi.fn(() => mockClient),
    select: vi.fn(() => mockClient),
    insert: vi.fn(() => mockClient),
    update: vi.fn(() => mockClient),
    delete: vi.fn(() => mockClient),
    eq: vi.fn(() => mockClient),
    single: vi.fn(() => Promise.resolve(overrides)),
    order: vi.fn(() => mockClient),
    limit: vi.fn(() => mockClient),
    then: vi.fn((cb: Function) => Promise.resolve(cb(overrides))),
  }
  return mockClient as unknown as SupabaseClient
}

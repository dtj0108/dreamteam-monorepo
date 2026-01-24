/**
 * Chainable Supabase mock for testing MCP tools
 *
 * This mock simulates the Supabase query builder pattern used throughout the tools.
 * It supports the full chain: from() -> select() -> eq() -> order() -> single() etc.
 *
 * Usage:
 *   const mock = createSupabaseMock()
 *   mock.setQueryResult('accounts', { data: [...], error: null })
 *   vi.mocked(getSupabase).mockReturnValue(mock.client)
 */

import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

interface QueryResult {
  data: unknown
  error: { message: string; code?: string } | null
  count?: number
}

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  gt: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  lt: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  like: ReturnType<typeof vi.fn>
  ilike: ReturnType<typeof vi.fn>
  is: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  contains: ReturnType<typeof vi.fn>
  containedBy: ReturnType<typeof vi.fn>
  range: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  offset: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  match: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
  filter: ReturnType<typeof vi.fn>
}

export interface SupabaseMock {
  client: SupabaseClient
  setQueryResult: (table: string, result: QueryResult) => void
  setQueryResultOnce: (table: string, result: QueryResult) => void
  reset: () => void
  getLastQuery: () => { table: string; filters: Record<string, unknown> } | null
}

/**
 * Creates a fully chainable Supabase mock that tracks query state
 */
export function createSupabaseMock(): SupabaseMock {
  const queryResults = new Map<string, QueryResult>()
  const queryResultsOnce = new Map<string, QueryResult[]>()
  let lastQuery: { table: string; filters: Record<string, unknown> } | null = null

  const createQueryBuilder = (table: string): MockQueryBuilder => {
    const filters: Record<string, unknown> = {}

    const getResult = (): QueryResult => {
      // Check for one-time results first
      const onceResults = queryResultsOnce.get(table)
      if (onceResults && onceResults.length > 0) {
        return onceResults.shift()!
      }
      // Fall back to default result
      return queryResults.get(table) || { data: null, error: null }
    }

    const builder: MockQueryBuilder = {
      select: vi.fn().mockImplementation(() => builder),
      insert: vi.fn().mockImplementation(() => builder),
      update: vi.fn().mockImplementation(() => builder),
      delete: vi.fn().mockImplementation(() => builder),
      upsert: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation((column, value) => {
        filters[column] = value
        return builder
      }),
      neq: vi.fn().mockImplementation((column, value) => {
        filters[`${column}_neq`] = value
        return builder
      }),
      gt: vi.fn().mockImplementation((column, value) => {
        filters[`${column}_gt`] = value
        return builder
      }),
      gte: vi.fn().mockImplementation((column, value) => {
        filters[`${column}_gte`] = value
        return builder
      }),
      lt: vi.fn().mockImplementation((column, value) => {
        filters[`${column}_lt`] = value
        return builder
      }),
      lte: vi.fn().mockImplementation((column, value) => {
        filters[`${column}_lte`] = value
        return builder
      }),
      like: vi.fn().mockImplementation(() => builder),
      ilike: vi.fn().mockImplementation(() => builder),
      is: vi.fn().mockImplementation((column, value) => {
        filters[`${column}_is`] = value
        return builder
      }),
      in: vi.fn().mockImplementation((column, values) => {
        filters[`${column}_in`] = values
        return builder
      }),
      contains: vi.fn().mockImplementation(() => builder),
      containedBy: vi.fn().mockImplementation(() => builder),
      range: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockImplementation(() => builder),
      offset: vi.fn().mockImplementation(() => builder),
      single: vi.fn().mockImplementation(() => {
        lastQuery = { table, filters: { ...filters } }
        return Promise.resolve(getResult())
      }),
      maybeSingle: vi.fn().mockImplementation(() => {
        lastQuery = { table, filters: { ...filters } }
        return Promise.resolve(getResult())
      }),
      match: vi.fn().mockImplementation(() => builder),
      or: vi.fn().mockImplementation(() => builder),
      filter: vi.fn().mockImplementation(() => builder),
    }

    // Make the builder itself thenable for queries that don't end in single()
    const thenableBuilder = Object.assign(builder, {
      then: (resolve: (value: QueryResult) => void) => {
        lastQuery = { table, filters: { ...filters } }
        resolve(getResult())
      },
    })

    return thenableBuilder
  }

  const from = vi.fn().mockImplementation((table: string) => createQueryBuilder(table))
  const rpc = vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null }))

  const client = {
    from,
    rpc,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
      }),
    },
  } as unknown as SupabaseClient

  return {
    client,
    setQueryResult: (table: string, result: QueryResult) => {
      queryResults.set(table, result)
    },
    setQueryResultOnce: (table: string, result: QueryResult) => {
      const existing = queryResultsOnce.get(table) || []
      existing.push(result)
      queryResultsOnce.set(table, existing)
    },
    reset: () => {
      queryResults.clear()
      queryResultsOnce.clear()
      lastQuery = null
      vi.clearAllMocks()
    },
    getLastQuery: () => lastQuery,
  }
}

/**
 * Preset configurations for common test scenarios
 */
export const mockResults = {
  success: <T>(data: T): QueryResult => ({ data, error: null }),
  error: (message: string, code?: string): QueryResult => ({
    data: null,
    error: { message, code }
  }),
  notFound: (): QueryResult => ({
    data: null,
    error: { message: 'Row not found', code: 'PGRST116' }
  }),
  empty: (): QueryResult => ({ data: [], error: null }),
}

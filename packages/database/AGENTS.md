# Database Package - Agent Guide

## Overview
This package provides Supabase client configurations and database query functions for the DreamTeam platform.

## Structure
- `client.ts` - Browser Supabase client
- `server.ts` - Server Supabase client (with auth)
- `queries.ts` - Database query functions (~1000 lines)
- `auto-deploy.ts` - Team deployment utilities
- `types.ts` - TypeScript type definitions

## Adding Tests (Option A - Tests Only)
When adding tests:
1. Create mocked Supabase client (don't use real DB)
2. Test query functions in isolation
3. Do NOT modify production code
4. Test files go in `src/__tests__/` directory

## Test Pattern
```typescript
import { describe, it, expect, vi } from 'vitest'
import { mockSupabase } from './mocks/supabase'
import { getAccounts } from '../queries'

describe('getAccounts', () => {
  it('should return accounts', async () => {
    const mockData = [{ id: '1', name: 'Test Account' }]
    const supabase = mockSupabase({ data: mockData })
    
    const result = await getAccounts(supabase)
    
    expect(result).toEqual(mockData)
  })
})
```

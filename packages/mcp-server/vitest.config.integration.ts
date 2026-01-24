/**
 * Vitest Configuration for Integration Tests
 *
 * Integration tests run against a real Supabase instance (local or remote)
 * and verify that MCP tools work correctly with actual database operations.
 *
 * Usage:
 *   pnpm --filter=@dreamteam/mcp-server test:integration
 *
 * Prerequisites:
 *   1. Start local Supabase: supabase start
 *   2. Apply migrations + seed: supabase db reset
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Only include integration test files
    include: ['src/__tests__/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**'],

    // Environment and globals
    globals: true,
    environment: 'node',

    // Longer timeout for real database operations
    testTimeout: 30000,

    // Run tests serially to avoid race conditions on shared test data
    // This is important because integration tests modify real database state
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // No setup file - tests call setupIntegrationTest() explicitly
    // This allows for more control and better error messages when Supabase isn't running

    // Coverage settings (optional, usually not needed for integration tests)
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/tools/**/*.ts'],
      exclude: ['src/tools/**/index.ts', 'src/__tests__/**'],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

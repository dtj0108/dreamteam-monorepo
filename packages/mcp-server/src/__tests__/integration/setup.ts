/**
 * Integration Test Setup
 *
 * This file configures tests to run against a real Supabase instance
 * (local Docker or test project) instead of mocks.
 *
 * Usage:
 * 1. Start local Supabase: `supabase start`
 * 2. Apply migrations + seed: `supabase db reset`
 * 3. Run tests: `pnpm --filter=@dreamteam/mcp-server test:integration`
 *
 * Environment Variables (optional overrides):
 * - TEST_SUPABASE_URL: Supabase API URL (default: http://127.0.0.1:54321)
 * - TEST_SUPABASE_SERVICE_KEY: Service role key (default: local dev key)
 */

import { initializeSupabase, getSupabase } from '../../auth.js'

// ============================================
// TEST DATA CONSTANTS
// ============================================
// These match the UUIDs in supabase/seed-test-workspace.sql

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
export const TEST_WORKSPACE_ID = '00000000-0000-0000-0000-000000000010'

// Finance
export const TEST_ACCOUNT_ID = '00000000-0000-0000-0000-000000000100'
export const TEST_TRANSACTION_ID = '00000000-0000-0000-0000-000000000101'
export const TEST_CATEGORY_ID = '00000000-0000-0000-0000-000000000102'

// Team
export const TEST_CHANNEL_ID = '00000000-0000-0000-0000-000000000200'
export const TEST_MESSAGE_ID = '00000000-0000-0000-0000-000000000201'

// Projects
export const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000300'
export const TEST_TASK_ID = '00000000-0000-0000-0000-000000000301'
export const TEST_MILESTONE_ID = '00000000-0000-0000-0000-000000000302'

// Knowledge
export const TEST_KNOWLEDGE_PAGE_ID = '00000000-0000-0000-0000-000000000400'

// Agents
export const TEST_AGENT_ID = '00000000-0000-0000-0000-000000000500'

// CRM
export const TEST_LEAD_ID = '00000000-0000-0000-0000-000000000600'
export const TEST_CONTACT_ID = '00000000-0000-0000-0000-000000000601'
export const TEST_PIPELINE_ID = '00000000-0000-0000-0000-000000000610'

// ============================================
// LOCAL SUPABASE DEFAULTS
// ============================================
// These are the default values for `supabase start`
// See: https://supabase.com/docs/guides/cli/local-development

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321'

// Default service role key for local Supabase
// This is NOT a secret - it's the same for everyone's local dev environment
const LOCAL_SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// ============================================
// SETUP FUNCTIONS
// ============================================

let isInitialized = false

/**
 * Initialize the Supabase client for integration tests.
 * Uses environment variables or falls back to local Supabase defaults.
 *
 * SAFETY: Refuses to run against production-like URLs to prevent accidents.
 */
export function setupIntegrationTest(): void {
  if (isInitialized) {
    return
  }

  // Get config from environment or use local defaults
  const supabaseUrl = process.env.TEST_SUPABASE_URL || LOCAL_SUPABASE_URL
  const supabaseKey =
    process.env.TEST_SUPABASE_SERVICE_KEY || LOCAL_SUPABASE_SERVICE_KEY

  // SAFETY CHECK: Refuse to run against production databases
  const isLocalUrl =
    supabaseUrl.includes('127.0.0.1') ||
    supabaseUrl.includes('localhost') ||
    supabaseUrl.includes('host.docker.internal')

  if (!isLocalUrl) {
    // Allow explicit override for dedicated test projects
    if (process.env.ALLOW_REMOTE_TEST_DB !== 'true') {
      throw new Error(
        `SAFETY: Refusing to run integration tests against non-local URL: ${supabaseUrl}\n` +
          `Integration tests should only run against:\n` +
          `  - Local Supabase (supabase start)\n` +
          `  - A dedicated test project (set ALLOW_REMOTE_TEST_DB=true to override)\n\n` +
          `If you have a dedicated test Supabase project, set:\n` +
          `  ALLOW_REMOTE_TEST_DB=true\n` +
          `  TEST_SUPABASE_URL=<your-test-project-url>\n` +
          `  TEST_SUPABASE_SERVICE_KEY=<your-test-project-key>`
      )
    }
    console.warn('⚠️  Running integration tests against REMOTE database!')
    console.warn(`   URL: ${supabaseUrl}`)
    console.warn('   Make sure this is a TEST project, not production!')
  }

  // Initialize the real Supabase client
  initializeSupabase(supabaseUrl, supabaseKey)

  // Set context environment variables (simulates agent-server)
  process.env.WORKSPACE_ID = TEST_WORKSPACE_ID
  process.env.USER_ID = TEST_USER_ID

  isInitialized = true

  console.log('Integration test setup complete')
  console.log(`  Supabase URL: ${supabaseUrl}`)
  console.log(`  Workspace ID: ${TEST_WORKSPACE_ID}`)
  console.log(`  User ID: ${TEST_USER_ID}`)
}

/**
 * Get the Supabase client for direct database access in tests.
 * Useful for verifying data or setting up test-specific state.
 */
export function getTestSupabase() {
  if (!isInitialized) {
    setupIntegrationTest()
  }
  return getSupabase()
}

/**
 * Helper to check if the test database is available.
 * Use this in beforeAll to skip tests gracefully if Supabase isn't running.
 */
export async function isTestDatabaseAvailable(): Promise<boolean> {
  try {
    const supabase = getTestSupabase()
    const { error } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', TEST_WORKSPACE_ID)
      .single()

    if (error) {
      console.warn(
        'Test database not available or test workspace not found:',
        error.message
      )
      return false
    }

    return true
  } catch (err) {
    console.warn('Failed to connect to test database:', err)
    return false
  }
}

/**
 * Helper to check if test data exists.
 * Returns details about what test data is present.
 */
export async function checkTestData(): Promise<{
  workspace: boolean
  account: boolean
  channel: boolean
  project: boolean
  knowledgePage: boolean
  agent: boolean
  lead: boolean
}> {
  const supabase = getTestSupabase()

  const checks = await Promise.all([
    supabase
      .from('workspaces')
      .select('id')
      .eq('id', TEST_WORKSPACE_ID)
      .single(),
    supabase
      .from('accounts')
      .select('id')
      .eq('id', TEST_ACCOUNT_ID)
      .single(),
    supabase
      .from('channels')
      .select('id')
      .eq('id', TEST_CHANNEL_ID)
      .single(),
    supabase
      .from('projects')
      .select('id')
      .eq('id', TEST_PROJECT_ID)
      .single(),
    supabase
      .from('knowledge_pages')
      .select('id')
      .eq('id', TEST_KNOWLEDGE_PAGE_ID)
      .single(),
    supabase.from('agents').select('id').eq('id', TEST_AGENT_ID).single(),
    supabase.from('leads').select('id').eq('id', TEST_LEAD_ID).single(),
  ])

  return {
    workspace: !checks[0].error,
    account: !checks[1].error,
    channel: !checks[2].error,
    project: !checks[3].error,
    knowledgePage: !checks[4].error,
    agent: !checks[5].error,
    lead: !checks[6].error,
  }
}

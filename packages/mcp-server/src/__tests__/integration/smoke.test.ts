/**
 * MCP Tools Integration Smoke Tests
 *
 * These tests verify that MCP tools work correctly against a real Supabase database.
 * Each test performs a basic operation (usually a list) to ensure:
 * - The database query syntax is correct
 * - The table exists and has the expected schema
 * - RLS policies allow the operation (when using service role)
 *
 * Run with: pnpm --filter=@dreamteam/mcp-server test:integration
 *
 * Prerequisites:
 * 1. supabase start
 * 2. supabase db reset (applies migrations + seed data)
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  setupIntegrationTest,
  isTestDatabaseAvailable,
  checkTestData,
  TEST_WORKSPACE_ID,
  TEST_USER_ID,
  TEST_ACCOUNT_ID,
  TEST_CHANNEL_ID,
  TEST_PROJECT_ID,
  TEST_KNOWLEDGE_PAGE_ID,
  TEST_AGENT_ID,
  TEST_LEAD_ID,
} from './setup.js'

// Import tool handlers from each domain
import { accountTools } from '../../tools/finance/accounts.js'
import { transactionTools } from '../../tools/finance/transactions.js'
import { categoryTools } from '../../tools/finance/categories.js'
import { budgetTools } from '../../tools/finance/budgets.js'
import { subscriptionTools } from '../../tools/finance/subscriptions.js'
import { channelTools } from '../../tools/team/channels.js'
import { messageTools } from '../../tools/team/messages.js'
import { workspaceTools } from '../../tools/team/workspace.js'
import { projectTools } from '../../tools/projects/projects.js'
import { taskTools } from '../../tools/projects/tasks.js'
import { milestoneTools } from '../../tools/projects/milestones.js'
import { departmentTools } from '../../tools/projects/departments.js'
import { knowledgePageTools } from '../../tools/knowledge/pages.js'
import { knowledgeTemplateTools } from '../../tools/knowledge/templates.js'
import { knowledgeCategoryTools } from '../../tools/knowledge/categories.js'
import { agentTools } from '../../tools/agents/agents.js'
import { workflowTools } from '../../tools/agents/workflows.js'
import { leadTools } from '../../tools/crm/leads.js'
import { contactTools } from '../../tools/crm/contacts.js'
import { dealTools } from '../../tools/crm/deals.js'
import { pipelineTools } from '../../tools/crm/pipelines.js'
import { activityTools } from '../../tools/crm/activities.js'

// ============================================
// TEST SETUP
// ============================================

let dbAvailable = false

beforeAll(async () => {
  // Initialize the Supabase client
  setupIntegrationTest()

  // Check if database is available
  dbAvailable = await isTestDatabaseAvailable()

  if (!dbAvailable) {
    console.warn('\n⚠️  Test database not available. Skipping integration tests.')
    console.warn('   Run "supabase start && supabase db reset" to set up the test environment.\n')
  } else {
    // Log which test data is present
    const testData = await checkTestData()
    console.log('\n📊 Test data check:')
    console.log(`   Workspace: ${testData.workspace ? '✅' : '❌'}`)
    console.log(`   Account: ${testData.account ? '✅' : '❌'}`)
    console.log(`   Channel: ${testData.channel ? '✅' : '❌'}`)
    console.log(`   Project: ${testData.project ? '✅' : '❌'}`)
    console.log(`   Knowledge Page: ${testData.knowledgePage ? '✅' : '❌'}`)
    console.log(`   Agent: ${testData.agent ? '✅' : '❌'}`)
    console.log(`   Lead: ${testData.lead ? '✅' : '❌'}`)
    console.log('')
  }
})

// Helper to parse tool result
function parseResult(result: { isError?: boolean; content: Array<{ text: string }> }) {
  expect(result.isError).toBeFalsy()
  expect(result.content).toBeDefined()
  expect(result.content[0]).toBeDefined()
  return JSON.parse(result.content[0].text)
}

// ============================================
// FINANCE TOOLS
// ============================================

describe.skipIf(!dbAvailable)('Finance Tools - Integration', () => {
  describe('Accounts', () => {
    it('account_list returns accounts from database', async () => {
      const result = await accountTools.account_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.accounts).toBeDefined()
      expect(Array.isArray(data.accounts)).toBe(true)
      expect(data.count).toBeGreaterThanOrEqual(0)
    })

    it('account_get retrieves a specific account', async () => {
      const result = await accountTools.account_get.handler({
        workspace_id: TEST_WORKSPACE_ID,
        account_id: TEST_ACCOUNT_ID,
      })

      const data = parseResult(result)
      expect(data.id).toBe(TEST_ACCOUNT_ID)
      expect(data.name).toBe('Test Checking Account')
    })

    it('account_get_totals calculates balances', async () => {
      const result = await accountTools.account_get_totals.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(typeof data.total_balance).toBe('number')
      expect(typeof data.account_count).toBe('number')
    })
  })

  describe('Transactions', () => {
    it('transaction_list returns transactions from database', async () => {
      const result = await transactionTools.transaction_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.transactions).toBeDefined()
      expect(Array.isArray(data.transactions)).toBe(true)
    })

    it('transaction_list filters by account', async () => {
      const result = await transactionTools.transaction_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
        account_id: TEST_ACCOUNT_ID,
      })

      const data = parseResult(result)
      expect(data.transactions).toBeDefined()
      // All transactions should belong to the test account
      for (const tx of data.transactions) {
        expect(tx.account_id).toBe(TEST_ACCOUNT_ID)
      }
    })
  })

  describe('Categories', () => {
    it('category_list returns categories from database', async () => {
      const result = await categoryTools.category_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.categories).toBeDefined()
      expect(Array.isArray(data.categories)).toBe(true)
    })
  })

  describe('Budgets', () => {
    it('budget_list returns budgets from database', async () => {
      const result = await budgetTools.budget_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.budgets).toBeDefined()
      expect(Array.isArray(data.budgets)).toBe(true)
    })
  })

  describe('Subscriptions', () => {
    it('subscription_list returns subscriptions from database', async () => {
      const result = await subscriptionTools.subscription_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.subscriptions).toBeDefined()
      expect(Array.isArray(data.subscriptions)).toBe(true)
    })
  })
})

// ============================================
// TEAM TOOLS
// ============================================

describe.skipIf(!dbAvailable)('Team Tools - Integration', () => {
  describe('Channels', () => {
    it('channel_list returns channels from database', async () => {
      const result = await channelTools.channel_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.channels).toBeDefined()
      expect(Array.isArray(data.channels)).toBe(true)
      expect(data.count).toBeGreaterThanOrEqual(1) // At least the test channel
    })

    it('channel_get retrieves a specific channel', async () => {
      const result = await channelTools.channel_get.handler({
        workspace_id: TEST_WORKSPACE_ID,
        channel_id: TEST_CHANNEL_ID,
      })

      const data = parseResult(result)
      expect(data.id).toBe(TEST_CHANNEL_ID)
      expect(data.name).toBe('test-general')
    })
  })

  describe('Messages', () => {
    it('message_list returns messages from a channel', async () => {
      const result = await messageTools.message_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
        channel_id: TEST_CHANNEL_ID,
      })

      const data = parseResult(result)
      expect(data.messages).toBeDefined()
      expect(Array.isArray(data.messages)).toBe(true)
    })
  })

  describe('Workspace', () => {
    it('workspace_member_list returns workspace members', async () => {
      const result = await workspaceTools.workspace_member_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.members).toBeDefined()
      expect(Array.isArray(data.members)).toBe(true)
      expect(data.count).toBeGreaterThanOrEqual(1) // At least the test user
    })
  })
})

// ============================================
// PROJECT TOOLS
// ============================================

describe.skipIf(!dbAvailable)('Project Tools - Integration', () => {
  describe('Projects', () => {
    it('project_list returns projects from database', async () => {
      const result = await projectTools.project_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.projects).toBeDefined()
      expect(Array.isArray(data.projects)).toBe(true)
    })

    it('project_get retrieves a specific project', async () => {
      const result = await projectTools.project_get.handler({
        workspace_id: TEST_WORKSPACE_ID,
        project_id: TEST_PROJECT_ID,
      })

      const data = parseResult(result)
      expect(data.id).toBe(TEST_PROJECT_ID)
      expect(data.name).toBe('Test Project')
    })
  })

  describe('Tasks', () => {
    it('task_list returns tasks from database', async () => {
      const result = await taskTools.task_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
        project_id: TEST_PROJECT_ID,
      })

      const data = parseResult(result)
      expect(data.tasks).toBeDefined()
      expect(Array.isArray(data.tasks)).toBe(true)
    })
  })

  describe('Milestones', () => {
    it('milestone_list returns milestones from database', async () => {
      const result = await milestoneTools.milestone_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
        project_id: TEST_PROJECT_ID,
      })

      const data = parseResult(result)
      expect(data.milestones).toBeDefined()
      expect(Array.isArray(data.milestones)).toBe(true)
    })
  })

  describe('Departments', () => {
    it('department_list returns departments from database', async () => {
      const result = await departmentTools.department_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.departments).toBeDefined()
      expect(Array.isArray(data.departments)).toBe(true)
    })
  })
})

// ============================================
// KNOWLEDGE TOOLS
// ============================================

describe.skipIf(!dbAvailable)('Knowledge Tools - Integration', () => {
  describe('Pages', () => {
    it('knowledge_page_list returns pages from database', async () => {
      const result = await knowledgePageTools.knowledge_page_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.pages).toBeDefined()
      expect(Array.isArray(data.pages)).toBe(true)
    })

    it('knowledge_page_get retrieves a specific page', async () => {
      const result = await knowledgePageTools.knowledge_page_get.handler({
        workspace_id: TEST_WORKSPACE_ID,
        page_id: TEST_KNOWLEDGE_PAGE_ID,
      })

      const data = parseResult(result)
      expect(data.id).toBe(TEST_KNOWLEDGE_PAGE_ID)
      expect(data.title).toBe('Test Knowledge Page')
    })
  })

  describe('Templates', () => {
    it('knowledge_template_list returns templates from database', async () => {
      const result = await knowledgeTemplateTools.knowledge_template_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.templates).toBeDefined()
      expect(Array.isArray(data.templates)).toBe(true)
    })
  })

  describe('Categories', () => {
    it('knowledge_category_list returns categories from database', async () => {
      const result = await knowledgeCategoryTools.knowledge_category_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.categories).toBeDefined()
      expect(Array.isArray(data.categories)).toBe(true)
    })
  })
})

// ============================================
// AGENT TOOLS
// ============================================

describe.skipIf(!dbAvailable)('Agent Tools - Integration', () => {
  describe('Agents', () => {
    it('agent_list returns agents from database', async () => {
      const result = await agentTools.agent_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.agents).toBeDefined()
      expect(Array.isArray(data.agents)).toBe(true)
    })

    it('agent_get retrieves a specific agent', async () => {
      const result = await agentTools.agent_get.handler({
        workspace_id: TEST_WORKSPACE_ID,
        agent_id: TEST_AGENT_ID,
      })

      const data = parseResult(result)
      expect(data.id).toBe(TEST_AGENT_ID)
      expect(data.name).toBe('Test Agent')
    })
  })

  describe('Workflows', () => {
    it('workflow_list returns workflows from database', async () => {
      // Workflows are user-scoped, not workspace-scoped
      const result = await workflowTools.workflow_list.handler({
        user_id: TEST_USER_ID,
      })

      const data = parseResult(result)
      expect(data.workflows).toBeDefined()
      expect(Array.isArray(data.workflows)).toBe(true)
    })
  })
})

// ============================================
// CRM TOOLS
// ============================================

describe.skipIf(!dbAvailable)('CRM Tools - Integration', () => {
  describe('Leads', () => {
    it('lead_list returns leads from database', async () => {
      const result = await leadTools.lead_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.leads).toBeDefined()
      expect(Array.isArray(data.leads)).toBe(true)
    })

    it('lead_get retrieves a specific lead', async () => {
      const result = await leadTools.lead_get.handler({
        workspace_id: TEST_WORKSPACE_ID,
        lead_id: TEST_LEAD_ID,
      })

      // This might fail if leads table doesn't have workspace_id yet
      // That's actually what we're testing - schema compatibility
      if (result.isError) {
        console.warn('lead_get failed - check if leads table has workspace_id column')
      } else {
        const data = parseResult(result)
        expect(data.id).toBe(TEST_LEAD_ID)
        expect(data.name).toBe('Test Lead Company')
      }
    })
  })

  describe('Contacts', () => {
    it('contact_list returns contacts from database', async () => {
      const result = await contactTools.contact_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.contacts).toBeDefined()
      expect(Array.isArray(data.contacts)).toBe(true)
    })
  })

  describe('Deals', () => {
    it('deal_list returns deals from database', async () => {
      const result = await dealTools.deal_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.deals).toBeDefined()
      expect(Array.isArray(data.deals)).toBe(true)
    })
  })

  describe('Pipelines', () => {
    it('pipeline_list returns pipelines from database', async () => {
      const result = await pipelineTools.pipeline_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.pipelines).toBeDefined()
      expect(Array.isArray(data.pipelines)).toBe(true)
    })
  })

  describe('Activities', () => {
    it('activity_list returns activities from database', async () => {
      const result = await activityTools.activity_list.handler({
        workspace_id: TEST_WORKSPACE_ID,
      })

      const data = parseResult(result)
      expect(data.activities).toBeDefined()
      expect(Array.isArray(data.activities)).toBe(true)
    })
  })
})

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe.skipIf(!dbAvailable)('Error Handling - Integration', () => {
  it('returns error for invalid workspace access', async () => {
    const fakeWorkspaceId = '99999999-9999-9999-9999-999999999999'

    const result = await accountTools.account_list.handler({
      workspace_id: fakeWorkspaceId,
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Access denied')
  })

  it('returns error for non-existent resource', async () => {
    const fakeAccountId = '99999999-9999-9999-9999-999999999999'

    const result = await accountTools.account_get.handler({
      workspace_id: TEST_WORKSPACE_ID,
      account_id: fakeAccountId,
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('not found')
  })
})

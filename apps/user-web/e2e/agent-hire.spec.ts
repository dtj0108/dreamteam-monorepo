import { test, expect } from '@playwright/test';

/**
 * E2E tests for Agent Hiring flow
 *
 * Tests the complete user journey:
 * - Browse available agents
 * - View agent details
 * - Hire an agent
 * - Verify agent appears in hired list
 *
 * NOTE: These tests require a seeded test database with:
 * - A test user with workspace
 * - Available AI agents to hire
 */

test.describe('Agent Hiring', () => {
  test.describe.configure({ mode: 'serial' });

  // Store hired agent ID for cleanup
  let hiredAgentId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Navigate to agents section
    // In a real test, we'd authenticate first via login or test cookies
    await page.goto('/agents');
  });

  test('agents page loads', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.locator('body')).toBeVisible();
  });

  test('can view hired agents list', async ({ page }) => {
    await page.goto('/agents/hired');

    // Page should load
    await expect(page.locator('body')).toBeVisible();

    // Should have some kind of list or empty state
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('can view agent configurations', async ({ page }) => {
    await page.goto('/agents/configurations');

    await expect(page.locator('body')).toBeVisible();

    // Should show configurations page content
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('can view agent schedules', async ({ page }) => {
    await page.goto('/agents/schedules');

    await expect(page.locator('body')).toBeVisible();

    // Should show schedules page content
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test.describe('Hiring Flow', () => {
    test.skip(true, 'Requires authenticated user and seeded database');

    test('can browse available agents', async ({ page }) => {
      // Navigate to browse agents page
      await page.goto('/agents');

      // Click browse/discover agents
      await page.click('[data-testid="browse-agents"]');

      // Should show agent cards
      const agentCards = page.locator('[data-testid^="agent-card-"]');
      await expect(agentCards.first()).toBeVisible();
    });

    test('can view agent details', async ({ page }) => {
      await page.goto('/agents');

      // Click on an agent card
      await page.click('[data-testid="agent-card-ops-agent"]');

      // Should show agent details modal or page
      const agentDetails = page.locator('[data-testid="agent-details"]');
      await expect(agentDetails).toBeVisible();

      // Should show agent name
      await expect(agentDetails.locator('h1, h2')).toContainText(/Agent/i);

      // Should show hire button
      const hireButton = page.locator('[data-testid="hire-button"]');
      await expect(hireButton).toBeVisible();
    });

    test('can hire an agent', async ({ page }) => {
      await page.goto('/agents');

      // Find an available agent
      await page.click('[data-testid="agent-card-ops-agent"]');

      // Click hire button
      await page.click('[data-testid="hire-button"]');

      // Wait for confirmation
      await expect(page.locator('[data-testid="hire-success"]')).toBeVisible({ timeout: 10000 });

      // Extract the hired agent ID for verification
      const url = page.url();
      const match = url.match(/\/agents\/hired\/([^/]+)/);
      if (match) {
        hiredAgentId = match[1];
      }
    });

    test('hired agent appears in list', async ({ page }) => {
      test.skip(!hiredAgentId, 'No agent was hired in previous test');

      await page.goto('/agents/hired');

      // Should see the hired agent in the list
      const hiredAgentCard = page.locator(`[data-testid="hired-agent-${hiredAgentId}"]`);
      await expect(hiredAgentCard).toBeVisible();
    });

    test('cannot hire same agent twice', async ({ page }) => {
      test.skip(!hiredAgentId, 'No agent was hired in previous test');

      await page.goto('/agents');

      // Try to find and hire the same agent
      await page.click('[data-testid="agent-card-ops-agent"]');

      // Hire button should be disabled or show "Already Hired"
      const hireButton = page.locator('[data-testid="hire-button"]');

      // Either the button is disabled or shows different text
      const isDisabled = await hireButton.isDisabled();
      const buttonText = await hireButton.textContent();

      expect(isDisabled || buttonText?.toLowerCase().includes('hired')).toBeTruthy();
    });
  });
});

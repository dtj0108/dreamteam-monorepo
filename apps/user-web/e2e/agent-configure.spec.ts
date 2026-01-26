import { test, expect } from '@playwright/test';

/**
 * E2E tests for Agent Configuration
 *
 * Tests the agent configuration flow:
 * - Open agent configuration
 * - Change style settings
 * - Add custom instructions
 * - Save changes
 * - Verify persistence
 *
 * NOTE: These tests require a seeded test database with:
 * - A test user with workspace
 * - At least one hired agent
 */

test.describe('Agent Configuration', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/agents/configurations');
  });

  test('configurations page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test.describe('Configuration Flow', () => {
    test.skip(true, 'Requires authenticated user and seeded database');

    test('can view agent configuration list', async ({ page }) => {
      // Should show list of configured agents
      const configList = page.locator('[data-testid="config-list"]');
      await expect(configList).toBeVisible();
    });

    test('can open agent configuration', async ({ page }) => {
      // Click on first agent configuration
      await page.click('[data-testid^="config-card-"]');

      // Should show configuration panel
      const configPanel = page.locator('[data-testid="config-panel"]');
      await expect(configPanel).toBeVisible();
    });

    test('can change verbosity style', async ({ page }) => {
      // Open first agent's config
      await page.click('[data-testid^="config-card-"]');

      // Find verbosity selector
      const verbositySelect = page.locator('[data-testid="verbosity-select"]');
      await expect(verbositySelect).toBeVisible();

      // Change to 'concise'
      await verbositySelect.click();
      await page.click('[data-testid="verbosity-option-concise"]');

      // Verify selection
      await expect(verbositySelect).toContainText(/concise/i);
    });

    test('can change tone style', async ({ page }) => {
      await page.click('[data-testid^="config-card-"]');

      const toneSelect = page.locator('[data-testid="tone-select"]');
      await expect(toneSelect).toBeVisible();

      // Change to 'formal'
      await toneSelect.click();
      await page.click('[data-testid="tone-option-formal"]');

      await expect(toneSelect).toContainText(/formal/i);
    });

    test('can change examples style', async ({ page }) => {
      await page.click('[data-testid^="config-card-"]');

      const examplesSelect = page.locator('[data-testid="examples-select"]');
      await expect(examplesSelect).toBeVisible();

      // Change to 'many'
      await examplesSelect.click();
      await page.click('[data-testid="examples-option-many"]');

      await expect(examplesSelect).toContainText(/many/i);
    });

    test('can add custom instructions', async ({ page }) => {
      await page.click('[data-testid^="config-card-"]');

      // Find custom instructions textarea
      const instructionsInput = page.locator('[data-testid="custom-instructions"]');
      await expect(instructionsInput).toBeVisible();

      // Clear and type new instructions
      await instructionsInput.clear();
      await instructionsInput.fill('Always format responses as bullet points. Include timestamps.');

      // Verify text was entered
      await expect(instructionsInput).toHaveValue(/bullet points/i);
    });

    test('can save configuration changes', async ({ page }) => {
      await page.click('[data-testid^="config-card-"]');

      // Make a change
      const verbositySelect = page.locator('[data-testid="verbosity-select"]');
      await verbositySelect.click();
      await page.click('[data-testid="verbosity-option-detailed"]');

      // Click save
      const saveButton = page.locator('[data-testid="save-config"]');
      await saveButton.click();

      // Wait for success indicator
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible({ timeout: 5000 });
    });

    test('configuration persists after page refresh', async ({ page }) => {
      // Open and make changes
      await page.click('[data-testid^="config-card-"]');

      const verbositySelect = page.locator('[data-testid="verbosity-select"]');
      await verbositySelect.click();
      await page.click('[data-testid="verbosity-option-concise"]');

      // Save
      await page.click('[data-testid="save-config"]');
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible({ timeout: 5000 });

      // Refresh page
      await page.reload();

      // Re-open configuration
      await page.click('[data-testid^="config-card-"]');

      // Verify setting persisted
      const verbosityValue = page.locator('[data-testid="verbosity-select"]');
      await expect(verbosityValue).toContainText(/concise/i);
    });

    test('can set reports_to for agent', async ({ page }) => {
      await page.click('[data-testid^="config-card-"]');

      // Find reports_to selector
      const reportsToSelect = page.locator('[data-testid="reports-to-select"]');
      await expect(reportsToSelect).toBeVisible();

      // Select a team member
      await reportsToSelect.click();
      await page.click('[data-testid^="reports-to-option-"]');

      // Verify selection
      await expect(reportsToSelect).not.toBeEmpty();
    });

    test('shows validation error for invalid instructions', async ({ page }) => {
      await page.click('[data-testid^="config-card-"]');

      const instructionsInput = page.locator('[data-testid="custom-instructions"]');

      // Enter extremely long text (if there's a limit)
      const longText = 'A'.repeat(10001); // Assuming 10k char limit
      await instructionsInput.fill(longText);

      // Try to save
      await page.click('[data-testid="save-config"]');

      // Should show validation error
      const errorMessage = page.locator('[data-testid="validation-error"]');
      await expect(errorMessage).toBeVisible();
    });
  });
});

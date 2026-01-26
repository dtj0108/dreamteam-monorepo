import { test, expect } from '@playwright/test';

/**
 * E2E tests for Agent Scheduling
 *
 * Tests the schedule management flow:
 * - Create a new schedule
 * - View schedule in list
 * - Edit schedule
 * - Enable/disable schedule
 * - Delete schedule
 *
 * NOTE: These tests require a seeded test database with:
 * - A test user with workspace
 * - At least one hired agent
 */

test.describe('Agent Scheduling', () => {
  test.describe.configure({ mode: 'serial' });

  // Store created schedule ID for subsequent tests
  let createdScheduleId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto('/agents/schedules');
  });

  test('schedules page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test.describe('Schedule Management Flow', () => {
    test.skip(true, 'Requires authenticated user and seeded database');

    test('can view schedules list', async ({ page }) => {
      // Should show schedules list or empty state
      const schedulesList = page.locator('[data-testid="schedules-list"]');
      await expect(schedulesList).toBeVisible();
    });

    test('can open create schedule dialog', async ({ page }) => {
      // Click create schedule button
      const createButton = page.locator('[data-testid="create-schedule-button"]');
      await createButton.click();

      // Dialog should appear
      const dialog = page.locator('[data-testid="create-schedule-dialog"]');
      await expect(dialog).toBeVisible();
    });

    test('can create a new schedule', async ({ page }) => {
      // Open create dialog
      await page.click('[data-testid="create-schedule-button"]');

      // Fill in schedule details
      await page.fill('[data-testid="schedule-name"]', 'E2E Test Schedule');
      await page.fill('[data-testid="task-prompt"]', 'Generate a test report for E2E testing');

      // Select agent
      await page.click('[data-testid="agent-select"]');
      await page.click('[data-testid^="agent-option-"]');

      // Select schedule frequency
      await page.click('[data-testid="frequency-select"]');
      await page.click('[data-testid="frequency-option-daily"]');

      // Set time (9:00 AM)
      await page.fill('[data-testid="schedule-time"]', '09:00');

      // Select timezone
      await page.click('[data-testid="timezone-select"]');
      await page.click('[data-testid="timezone-option-america-new_york"]');

      // Toggle requires approval
      await page.click('[data-testid="requires-approval-toggle"]');

      // Submit
      await page.click('[data-testid="create-schedule-submit"]');

      // Wait for success
      await expect(page.locator('[data-testid="create-success"]')).toBeVisible({ timeout: 5000 });

      // Get the created schedule ID from URL or response
      const scheduleCard = page.locator('[data-testid^="schedule-card-"]').filter({ hasText: 'E2E Test Schedule' });
      const testId = await scheduleCard.getAttribute('data-testid');
      createdScheduleId = testId?.replace('schedule-card-', '') || null;
    });

    test('created schedule appears in list', async ({ page }) => {
      test.skip(!createdScheduleId, 'No schedule was created in previous test');

      // Find the schedule in the list
      const scheduleCard = page.locator(`[data-testid="schedule-card-${createdScheduleId}"]`);
      await expect(scheduleCard).toBeVisible();

      // Verify details
      await expect(scheduleCard).toContainText('E2E Test Schedule');
      await expect(scheduleCard).toContainText('9:00');
    });

    test('can view schedule details', async ({ page }) => {
      test.skip(!createdScheduleId, 'No schedule was created');

      // Click on schedule card
      await page.click(`[data-testid="schedule-card-${createdScheduleId}"]`);

      // Should show details page or panel
      const detailsPanel = page.locator('[data-testid="schedule-details"]');
      await expect(detailsPanel).toBeVisible();

      // Verify content
      await expect(detailsPanel).toContainText('E2E Test Schedule');
      await expect(detailsPanel).toContainText('test report');
    });

    test('can edit schedule name', async ({ page }) => {
      test.skip(!createdScheduleId, 'No schedule was created');

      // Open schedule
      await page.click(`[data-testid="schedule-card-${createdScheduleId}"]`);

      // Click edit
      await page.click('[data-testid="edit-schedule-button"]');

      // Update name
      await page.fill('[data-testid="schedule-name"]', 'Updated E2E Schedule');

      // Save
      await page.click('[data-testid="save-schedule-button"]');

      // Verify update
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible({ timeout: 5000 });

      // Go back to list
      await page.goto('/agents/schedules');

      // Verify name changed
      const scheduleCard = page.locator(`[data-testid="schedule-card-${createdScheduleId}"]`);
      await expect(scheduleCard).toContainText('Updated E2E Schedule');
    });

    test('can disable schedule', async ({ page }) => {
      test.skip(!createdScheduleId, 'No schedule was created');

      // Open schedule
      await page.click(`[data-testid="schedule-card-${createdScheduleId}"]`);

      // Find and click toggle
      const enableToggle = page.locator('[data-testid="enable-schedule-toggle"]');
      await expect(enableToggle).toBeChecked();

      await enableToggle.click();

      // Verify toggled off
      await expect(enableToggle).not.toBeChecked();

      // Verify indicator shows disabled
      const statusBadge = page.locator('[data-testid="schedule-status"]');
      await expect(statusBadge).toContainText(/disabled|paused/i);
    });

    test('can re-enable schedule', async ({ page }) => {
      test.skip(!createdScheduleId, 'No schedule was created');

      await page.click(`[data-testid="schedule-card-${createdScheduleId}"]`);

      const enableToggle = page.locator('[data-testid="enable-schedule-toggle"]');

      // Should be disabled from previous test
      await expect(enableToggle).not.toBeChecked();

      // Enable it
      await enableToggle.click();

      await expect(enableToggle).toBeChecked();

      const statusBadge = page.locator('[data-testid="schedule-status"]');
      await expect(statusBadge).toContainText(/enabled|active/i);
    });

    test('can view execution history', async ({ page }) => {
      test.skip(!createdScheduleId, 'No schedule was created');

      await page.click(`[data-testid="schedule-card-${createdScheduleId}"]`);

      // Click on executions tab or section
      await page.click('[data-testid="executions-tab"]');

      // Should show executions list (may be empty for new schedule)
      const executionsList = page.locator('[data-testid="executions-list"]');
      await expect(executionsList).toBeVisible();
    });

    test('can delete schedule', async ({ page }) => {
      test.skip(!createdScheduleId, 'No schedule was created');

      await page.click(`[data-testid="schedule-card-${createdScheduleId}"]`);

      // Click delete button
      await page.click('[data-testid="delete-schedule-button"]');

      // Confirm deletion dialog
      const confirmDialog = page.locator('[data-testid="confirm-delete-dialog"]');
      await expect(confirmDialog).toBeVisible();

      await page.click('[data-testid="confirm-delete"]');

      // Wait for deletion
      await expect(page.locator('[data-testid="delete-success"]')).toBeVisible({ timeout: 5000 });

      // Verify schedule no longer in list
      await page.goto('/agents/schedules');

      const deletedCard = page.locator(`[data-testid="schedule-card-${createdScheduleId}"]`);
      await expect(deletedCard).not.toBeVisible();

      createdScheduleId = null;
    });
  });

  test.describe('Schedule Validation', () => {
    test.skip(true, 'Requires authenticated user');

    test('shows error for empty schedule name', async ({ page }) => {
      await page.click('[data-testid="create-schedule-button"]');

      // Leave name empty, fill other required fields
      await page.fill('[data-testid="task-prompt"]', 'Test task');
      await page.click('[data-testid="agent-select"]');
      await page.click('[data-testid^="agent-option-"]');
      await page.click('[data-testid="frequency-select"]');
      await page.click('[data-testid="frequency-option-daily"]');
      await page.fill('[data-testid="schedule-time"]', '09:00');

      // Try to submit
      await page.click('[data-testid="create-schedule-submit"]');

      // Should show validation error
      const nameError = page.locator('[data-testid="name-error"]');
      await expect(nameError).toBeVisible();
      await expect(nameError).toContainText(/required|name/i);
    });

    test('shows error for empty task prompt', async ({ page }) => {
      await page.click('[data-testid="create-schedule-button"]');

      await page.fill('[data-testid="schedule-name"]', 'Valid Name');
      // Leave task prompt empty
      await page.click('[data-testid="agent-select"]');
      await page.click('[data-testid^="agent-option-"]');
      await page.click('[data-testid="frequency-select"]');
      await page.click('[data-testid="frequency-option-daily"]');
      await page.fill('[data-testid="schedule-time"]', '09:00');

      await page.click('[data-testid="create-schedule-submit"]');

      const promptError = page.locator('[data-testid="prompt-error"]');
      await expect(promptError).toBeVisible();
    });

    test('shows next run time preview', async ({ page }) => {
      await page.click('[data-testid="create-schedule-button"]');

      // Set schedule for daily at 9am
      await page.click('[data-testid="frequency-select"]');
      await page.click('[data-testid="frequency-option-daily"]');
      await page.fill('[data-testid="schedule-time"]', '09:00');

      // Select timezone
      await page.click('[data-testid="timezone-select"]');
      await page.click('[data-testid="timezone-option-utc"]');

      // Should show next run preview
      const nextRunPreview = page.locator('[data-testid="next-run-preview"]');
      await expect(nextRunPreview).toBeVisible();
      await expect(nextRunPreview).toContainText(/next run|scheduled for/i);
    });
  });

  test.describe('Cron Pattern Options', () => {
    test.skip(true, 'Requires authenticated user');

    test('can select hourly frequency', async ({ page }) => {
      await page.click('[data-testid="create-schedule-button"]');

      await page.click('[data-testid="frequency-select"]');
      await page.click('[data-testid="frequency-option-hourly"]');

      // Verify selection
      const frequencyValue = page.locator('[data-testid="frequency-select"]');
      await expect(frequencyValue).toContainText(/hourly|every hour/i);
    });

    test('can select weekly frequency', async ({ page }) => {
      await page.click('[data-testid="create-schedule-button"]');

      await page.click('[data-testid="frequency-select"]');
      await page.click('[data-testid="frequency-option-weekly"]');

      // Should show day-of-week selector
      const daySelector = page.locator('[data-testid="day-of-week-select"]');
      await expect(daySelector).toBeVisible();
    });

    test('can select monthly frequency', async ({ page }) => {
      await page.click('[data-testid="create-schedule-button"]');

      await page.click('[data-testid="frequency-select"]');
      await page.click('[data-testid="frequency-option-monthly"]');

      // Should show day-of-month selector
      const daySelector = page.locator('[data-testid="day-of-month-select"]');
      await expect(daySelector).toBeVisible();
    });

    test('can use custom cron expression', async ({ page }) => {
      await page.click('[data-testid="create-schedule-button"]');

      await page.click('[data-testid="frequency-select"]');
      await page.click('[data-testid="frequency-option-custom"]');

      // Should show cron input
      const cronInput = page.locator('[data-testid="custom-cron-input"]');
      await expect(cronInput).toBeVisible();

      // Enter valid cron
      await cronInput.fill('0 */6 * * *'); // Every 6 hours

      // Should show interpretation
      const cronPreview = page.locator('[data-testid="cron-preview"]');
      await expect(cronPreview).toContainText(/6 hours|6h/i);
    });

    test('shows error for invalid custom cron', async ({ page }) => {
      await page.click('[data-testid="create-schedule-button"]');

      await page.click('[data-testid="frequency-select"]');
      await page.click('[data-testid="frequency-option-custom"]');

      const cronInput = page.locator('[data-testid="custom-cron-input"]');
      await cronInput.fill('invalid cron');

      // Should show error
      const cronError = page.locator('[data-testid="cron-error"]');
      await expect(cronError).toBeVisible();
      await expect(cronError).toContainText(/invalid/i);
    });
  });
});

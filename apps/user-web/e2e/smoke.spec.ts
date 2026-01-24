import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/./); // Has any title
  });

  test('demo dashboard loads', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('body')).toBeVisible();
  });

  test('demo transactions page loads', async ({ page }) => {
    await page.goto('/demo/transactions');
    await expect(page.locator('body')).toBeVisible();
  });

  test('demo sales page loads', async ({ page }) => {
    await page.goto('/demo/sales');
    await expect(page.locator('body')).toBeVisible();
  });

  test('demo learn page loads', async ({ page }) => {
    await page.goto('/demo/learn');
    await expect(page.locator('body')).toBeVisible();
  });
});

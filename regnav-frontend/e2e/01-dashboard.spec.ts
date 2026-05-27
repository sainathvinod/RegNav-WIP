import { test, expect } from '@playwright/test';
import { mockAllApis } from './helpers/mock-api';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
  });

  test('shows welcome heading and stat cards', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Welcome to RegNav.AI')).toBeVisible();
    await expect(page.getByText('AI-Powered Regulatory Compliance Navigator')).toBeVisible();
  });

  test('stat cards load live values from analytics API', async ({ page }) => {
    await page.goto('/');

    // Wait for analytics to load — cards should show numbers, not the pulsing dash
    await expect(page.getByText('5')).toBeVisible();          // Documents: 5
    await expect(page.getByText('2')).toBeVisible();          // Active Rules (approved): 2
    await expect(page.getByText('87%')).toBeVisible();        // Compliance Score: 87%
  });

  test('regulatory pipeline steps are visible', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Discover')).toBeVisible();
    await expect(page.getByText('Ingest')).toBeVisible();
    await expect(page.getByText('Extract Rules')).toBeVisible();
    await expect(page.getByText('Chat & Search')).toBeVisible();
    await expect(page.getByText('Validate Files')).toBeVisible();
  });

  test('notification bell shows unread count', async ({ page }) => {
    await page.goto('/');

    // Bell badge — mocked unread-count returns 3
    await expect(page.locator('span').filter({ hasText: '3' }).first()).toBeVisible();
  });
});

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

    // Compliance Score is unique on the page — wait for analytics to resolve
    await expect(page.getByText('87%')).toBeVisible({ timeout: 8000 });

    // Each stat card: label is visible alongside its value
    const docsCard = page.locator('.card').filter({ hasText: 'Documents' }).first();
    await expect(docsCard.getByText('5')).toBeVisible();

    const rulesCard = page.locator('.card').filter({ hasText: 'Active Rules' }).first();
    await expect(rulesCard.getByText('2')).toBeVisible();
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

    // The unread badge is a span.rounded-full inside the bell button
    const badge = page.locator('button[title="Notifications"] span.rounded-full');
    await expect(badge).toBeVisible({ timeout: 8000 });
    await expect(badge).toHaveText('3');
  });
});

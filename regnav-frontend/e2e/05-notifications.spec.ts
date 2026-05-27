import { test, expect } from '@playwright/test';
import { mockAllApis } from './helpers/mock-api';

test.describe('Notification Bell', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/');
  });

  test('shows unread badge with count from API', async ({ page }) => {
    // unread-count API returns 3
    const badge = page.locator('span.rounded-full').filter({ hasText: '3' });
    await expect(badge).toBeVisible();
  });

  test('opens dropdown on click', async ({ page }) => {
    await page.getByTitle('Notifications').click();

    // Dropdown panel header — exact:true matches only the <span> directly
    // containing "Notifications", not ancestor containers.
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
  });

  test('shows empty state when no notifications', async ({ page }) => {
    // Mock returns empty array on list — "No notifications" is shown
    const bell = page.getByTitle('Notifications');
    await bell.click();

    await expect(page.getByText('No notifications')).toBeVisible({ timeout: 3000 });
  });
});

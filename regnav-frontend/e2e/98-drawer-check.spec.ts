/**
 * Quick visual check: mobile drawer opens correctly on tap.
 */
import { test, devices } from '@playwright/test';
import { mockAllApis } from './helpers/mock-api';

test.use({ viewport: devices['iPhone 12'].viewport });

test('mobile drawer opens', async ({ page }) => {
  await mockAllApis(page);
  await page.goto('/');

  // Snapshot 1: closed
  await page.screenshot({
    path: 'e2e/__screenshots__/mobile/_drawer-closed.png',
    fullPage: false,
  });

  // Tap hamburger
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.waitForTimeout(400);

  // Snapshot 2: open
  await page.screenshot({
    path: 'e2e/__screenshots__/mobile/_drawer-open.png',
    fullPage: false,
  });
});

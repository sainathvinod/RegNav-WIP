import { test, expect } from '@playwright/test';
import { mockAllApis, RULE_ID } from './helpers/mock-api';

test.describe('RuleMiner', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/ruleminer');
  });

  test('renders stat cards', async ({ page }) => {
    // Stat-card labels live in <p class="text-sm text-gray-400">. The same
    // strings ("Draft", "Approved", "Rejected") also appear as <option>s in
    // the status filter and as lowercase status badges in rule rows, so we
    // must scope to the stats grid to avoid strict-mode violations.
    const statsGrid = page.locator('.grid').filter({ hasText: 'Total Rules' }).first();
    await expect(statsGrid.getByText('Total Rules', { exact: true })).toBeVisible();
    await expect(statsGrid.getByText('Draft', { exact: true })).toBeVisible();
    await expect(statsGrid.getByText('Approved', { exact: true })).toBeVisible();
    await expect(statsGrid.getByText('Rejected', { exact: true })).toBeVisible();
  });

  test('extraction panel is present', async ({ page }) => {
    await expect(page.getByText('Extract Rules from Document')).toBeVisible();
    await expect(page.getByPlaceholder(/Document UUID/i)).toBeVisible();

    const extractBtn = page.getByRole('button', { name: /Extract Rules/i });
    await expect(extractBtn).toBeDisabled();

    await page.getByPlaceholder(/Document UUID/i).fill('some-document-id');
    await expect(extractBtn).toBeEnabled();
  });

  test('rule appears in list and can be expanded', async ({ page }) => {
    // Mock returns one draft rule
    await expect(page.getByText('TX-WC-0001')).toBeVisible();
    await expect(page.getByText('Coverage must include all employees')).toBeVisible();

    // The status badge has class border-yellow-700 for draft status.
    // The description paragraph also contains a <span>draft</span> (text-yellow-400)
    // but no border class, so scoping by the badge's border colour is unique.
    await expect(page.locator('span.border-yellow-700').filter({ hasText: 'draft' })).toBeVisible();

    // Expand the rule row
    await page.getByText('Coverage must include all employees').click();
    await expect(page.getByText('All employees must be covered under the WC policy.')).toBeVisible();
    await expect(page.getByText('State statute §401.021')).toBeVisible();
  });

  test('approve action updates rule status', async ({ page }) => {
    // Expand rule
    await page.getByText('Coverage must include all employees').click();

    // Click Approve
    const approveBtn = page.getByRole('button', { name: /^Approve$/ });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // After approval the badge re-renders with green border (approved).
    // The yellow-border draft badge must be gone; the description-text
    // <span class="text-yellow-400">draft</span> never has a border class,
    // so toHaveCount(0) on span.border-yellow-700 is unambiguous.
    await expect(page.locator('span.border-green-700').filter({ hasText: 'approved' })).toBeVisible();
    await expect(page.locator('span.border-yellow-700')).toHaveCount(0);
  });

  test('extraction triggers job progress modal', async ({ page }) => {
    await page.getByPlaceholder(/Document UUID/i).fill(RULE_ID);
    await page.getByRole('button', { name: /Extract Rules/i }).click();

    await expect(page.getByRole('heading', { name: /Extracting Rules/i })).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /Close/i }).last().click();
  });
});

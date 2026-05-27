import { test, expect } from '@playwright/test';
import { mockAllApis, RULE_ID } from './helpers/mock-api';

test.describe('RuleMiner', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/ruleminer');
  });

  test('renders stat cards', async ({ page }) => {
    await expect(page.getByText('Total Rules')).toBeVisible();
    await expect(page.getByText('Draft')).toBeVisible();
    await expect(page.getByText('Approved')).toBeVisible();
    await expect(page.getByText('Rejected')).toBeVisible();
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

    // Status badge shows draft
    await expect(page.getByText('draft').first()).toBeVisible();

    // Expand the rule row
    await page.getByText('Coverage must include all employees').click();
    await expect(page.getByText('All employees must be covered under the WC policy.')).toBeVisible();
    await expect(page.getByText('State statute §401.021')).toBeVisible();
  });

  test('approve action updates rule status', async ({ page }) => {
    // Expand rule
    await page.getByText('Coverage must include all employees').click();

    // Click Approve
    const approveBtn = page.getByRole('button', { name: /Approve/i });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Status badge should update to "approved"
    await expect(page.getByText('approved').first()).toBeVisible();
    await expect(page.getByText('draft').first()).not.toBeVisible();
  });

  test('extraction triggers job progress modal', async ({ page }) => {
    await page.getByPlaceholder(/Document UUID/i).fill(RULE_ID);
    await page.getByRole('button', { name: /Extract Rules/i }).click();

    await expect(page.getByRole('heading', { name: /Extracting Rules/i })).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /Close/i }).click();
  });
});

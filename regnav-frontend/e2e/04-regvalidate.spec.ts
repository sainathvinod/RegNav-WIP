import { test, expect } from '@playwright/test';
import { mockAllApis, RUN_ID } from './helpers/mock-api';

test.describe('RegValidate', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/regvalidate');
  });

  test('page renders with pre-filled WCPOLS sample', async ({ page }) => {
    await expect(page.getByText('Validate a File')).toBeVisible();

    // The textarea should be pre-filled with WCPOLS CSV sample
    const textarea = page.locator('textarea');
    const value = await textarea.inputValue();
    expect(value).toContain('POLICY_NO,STATE,INSURED_NAME');
    expect(value).toContain('WC-2024-001,TX');
  });

  test('validation history shows existing run', async ({ page }) => {
    await expect(page.getByText('Validation History')).toBeVisible();
    await expect(page.getByText('policy.wcpols')).toBeVisible();
  });

  test('run validation and see results', async ({ page }) => {
    // Run validation with pre-filled content
    const validateBtn = page.getByRole('button', { name: /Run Validation/i });
    await expect(validateBtn).toBeEnabled();
    await validateBtn.click();

    // The mock returns a completed run — results should load automatically
    await expect(page.getByText('Invalid state code: XX')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Missing class code')).toBeVisible();
  });

  test('selecting a run from history shows its results', async ({ page }) => {
    // Click the existing run card in history
    await page.getByText('policy.wcpols').click();

    await expect(page.getByText('Invalid state code: XX')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Missing class code')).toBeVisible();
  });

  test('run validation button is disabled when content is empty', async ({ page }) => {
    // Clear the textarea
    await page.locator('textarea').fill('');
    await expect(page.getByRole('button', { name: /Run Validation/i })).toBeDisabled();
  });
});

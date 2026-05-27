import { test, expect } from '@playwright/test';
import { mockAllApis } from './helpers/mock-api';

test.describe('RegIngest', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/regingest');
  });

  test('renders tab navigation', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Ingest from URL/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Ingest from text/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Documents/i })).toBeVisible();
  });

  test('documents tab shows ingested document from API', async ({ page }) => {
    await page.getByRole('tab', { name: /Documents/i }).click();

    // The row contains the document title; assert the State and LOB cells
    // within that specific row to avoid matching "TX" in the title text too.
    const row = page.locator('tr').filter({ hasText: 'TX WC Notice 2026-12' });
    await expect(row).toBeVisible();
    await expect(row.locator('td', { hasText: /^TX$/ })).toBeVisible();
    await expect(row.locator('td', { hasText: 'workers_comp' })).toBeVisible();
  });

  test('text ingest form submits and shows job progress modal', async ({ page }) => {
    await page.getByRole('tab', { name: /Ingest from text/i }).click();

    await page.getByPlaceholder(/TX WC Notice/i).fill('TX WC E2E Test Document');
    await page.getByPlaceholder(/Paste the regulatory/i).fill(
      'Section 1: All workers compensation policies must include coverage for occupational disease.'
    );

    // Button becomes enabled once both required fields are filled
    const submitBtn = page.getByRole('button', { name: /Ingest text/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Job progress modal should appear
    await expect(page.getByRole('heading', { name: /Ingesting text/i })).toBeVisible();

    // SSE stream returns immediate done — modal should show "Done" status
    await expect(page.getByText('Done')).toBeVisible({ timeout: 5000 });

    // Close the modal — use .last() because the modal has two "Close" buttons:
    // the header X (aria-label="Close") and the footer "Close" text button.
    await page.getByRole('button', { name: /Close/i }).last().click();
    await expect(page.getByRole('heading', { name: /Ingesting text/i })).not.toBeVisible();
  });

  test('URL ingest button is disabled when URL is empty', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /Ingest URL/i });
    await expect(submitBtn).toBeDisabled();
  });
});

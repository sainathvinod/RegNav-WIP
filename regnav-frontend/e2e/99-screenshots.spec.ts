/**
 * Visual harness — captures full-page screenshots of every screen in both
 * mobile (iPhone 12 ~ 390x844) and desktop (1440x900) viewports. The output
 * lives under e2e/__screenshots__/{viewport}/{slug}.png so we can visually
 * inspect each screen and verify mobile responsiveness.
 *
 * Run only this spec via:
 *    npx playwright test e2e/99-screenshots.spec.ts --project=screenshots
 *
 * The spec deliberately does NOT assert on anything — it's a capture tool.
 */
import { test, expect, devices } from '@playwright/test';
import { mockAllApis } from './helpers/mock-api';

const ROUTES: Array<{ path: string; slug: string; title?: string }> = [
  { path: '/',              slug: '01-dashboard',     title: 'Dashboard' },
  { path: '/organizations', slug: '02-organizations', title: 'Organizations' },
  { path: '/users',         slug: '03-users',         title: 'Users' },
  { path: '/configuration', slug: '04-configuration', title: 'Configuration' },
  { path: '/profiles',      slug: '05-profiles',      title: 'Portfolios' },
  { path: '/regscout',      slug: '06-regscout',      title: 'RegScout' },
  { path: '/regingest',     slug: '07-regingest',     title: 'RegIngest' },
  { path: '/ruleminer',     slug: '08-ruleminer',     title: 'RuleMiner' },
  { path: '/rulesense',     slug: '09-rulesense',     title: 'RuleSense' },
  { path: '/regvalidate',   slug: '10-regvalidate',   title: 'RegValidate' },
  { path: '/analytics',     slug: '11-analytics',     title: 'Analytics' },
  { path: '/reports',       slug: '12-reports',       title: 'Reports' },
  { path: '/audit',         slug: '13-audit',         title: 'Audit Log' },
];

const VIEWPORTS = [
  { name: 'mobile',  viewport: devices['iPhone 12'].viewport },
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
];

for (const v of VIEWPORTS) {
  test.describe(`screenshots — ${v.name}`, () => {
    test.use({ viewport: v.viewport });

    for (const route of ROUTES) {
      test(`${route.slug}`, async ({ page }) => {
        await mockAllApis(page);
        await page.goto(route.path);
        // Let any data fetches settle
        await page.waitForLoadState('networkidle').catch(() => {
          /* some pages stream forever; ignore */
        });
        await page.waitForTimeout(400);

        await page.screenshot({
          path: `e2e/__screenshots__/${v.name}/${route.slug}.png`,
          fullPage: true,
        });

        // sanity: page rendered something — not a blank canvas
        const body = await page.locator('body').textContent();
        expect((body ?? '').trim().length).toBeGreaterThan(0);
      });
    }
  });
}

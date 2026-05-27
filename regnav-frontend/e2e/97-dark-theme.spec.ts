/**
 * Dark theme spot check — capture a few pages with `data-theme="dark"`
 * set on the document root so we can eyeball that nothing is broken
 * after the light-theme cleanup.
 */
import { test, devices } from '@playwright/test';
import { mockAllApis } from './helpers/mock-api';

const PAGES = [
  { path: '/',              slug: '01-dashboard' },
  { path: '/configuration', slug: '04-configuration' },
  { path: '/profiles',      slug: '05-profiles' },
  { path: '/rulesense',     slug: '09-rulesense' },
];

const VIEWPORTS = [
  { name: 'mobile',  viewport: devices['iPhone 12'].viewport },
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
];

for (const v of VIEWPORTS) {
  test.describe(`dark theme — ${v.name}`, () => {
    test.use({ viewport: v.viewport });

    for (const page of PAGES) {
      test(page.slug, async ({ page: p }) => {
        await mockAllApis(p);
        // Force dark theme before any React mounts.
        await p.addInitScript(() => {
          try {
            const prefs = { state: { themeMode: 'dark' }, version: 0 };
            localStorage.setItem('regnav-user-preferences', JSON.stringify(prefs));
          } catch {
            /* ignore */
          }
        });
        await p.goto(page.path);
        await p.waitForLoadState('networkidle').catch(() => null);
        // Force the data-theme even if the store didn't pick up our localStorage
        await p.evaluate(() => {
          document.documentElement.setAttribute('data-theme', 'dark');
        });
        await p.waitForTimeout(300);
        await p.screenshot({
          path: `e2e/__screenshots__/dark-${v.name}/${page.slug}.png`,
          fullPage: true,
        });
      });
    }
  });
}

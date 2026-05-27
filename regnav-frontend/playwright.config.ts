import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github', {}]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Allow callers to point at a pre-installed chromium binary when the
    // sandbox doesn't allow Playwright to download its own (remote dev env).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/9?-*.spec.ts'],
    },
    {
      // Mobile project — same functional specs on a phone viewport so we
      // catch responsive regressions in CI.
      name: 'mobile',
      use: {
        ...devices['iPhone 12'],
        browserName: 'chromium',
        defaultBrowserType: 'chromium',
      },
      testIgnore: ['**/9?-*.spec.ts'],
    },
    {
      // Visual harness — local screenshot capture only, not in default run.
      name: 'screenshots',
      use: { browserName: 'chromium' },
      testMatch: ['**/9?-*.spec.ts'],
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

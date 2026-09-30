import { defineConfig, devices } from '@playwright/test';

const BACKEND_PORT = 4310;
const FRONTEND_PORT = 5310;

export default defineConfig({
  testDir: 'tests',
  timeout: 120_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    // Uses the locally installed Chrome when present (no browser download needed for dev);
    // CI installs Playwright's Chromium instead: `npx playwright install chromium`.
    channel: process.env.CI ? undefined : 'chrome',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, channel: process.env.CI ? undefined : 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.CI ? undefined : 'chrome' }, testIgnore: /visual\// },
  ],
  webServer: [
    {
      command: 'node tests/support/start-test-backend.mjs',
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      env: { E2E_BACKEND_PORT: String(BACKEND_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm --prefix frontend run dev -- --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      env: { VITE_API_BASE: `http://localhost:${BACKEND_PORT}` },
      reuseExistingServer: !process.env.CI,
    },
  ],
});

export { BACKEND_PORT, FRONTEND_PORT };

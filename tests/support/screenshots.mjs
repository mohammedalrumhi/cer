// Capture UI screenshots (light and dark) for the phase reports.
//   node tests/support/screenshots.mjs <out-dir> <route> [<route>…]
// Expects the e2e servers (tests/support/start-test-backend.mjs on 4310, Vite on 5310).
// A route may carry a name and options: "dashboard=/" or "editor=/templates/<id>/edit@1440x900".
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { login } from './api.js';

const [outDir, ...routes] = process.argv.slice(2);
const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:5310';
mkdirSync(outDir, { recursive: true });

const token = await login();
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
for (const spec of routes) {
  const [nameAndPath, size = '1440x900'] = spec.split('@');
  const [name, route] = nameAndPath.includes('=') ? nameAndPath.split('=') : [nameAndPath.replace(/\W+/g, '_') || 'root', nameAndPath];
  const [width, height] = size.split('x').map(Number);
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await context.addInitScript(([value, mode]) => {
      localStorage.setItem('auth_token', value);
      localStorage.setItem('cer:theme', mode);
    }, [token, theme]);
    const page = await context.newPage();
    await page.goto(`${BASE}${route}`);
    await page.waitForLoadState('networkidle');
    if (route.includes('/edit')) await page.locator('[data-testid=editor-canvas][data-scene-ready=true]').waitFor({ timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${outDir}/${name}-${theme}.png` });
    await context.close();
  }
}
await browser.close();
console.log(`saved ${routes.length * 2} screenshots to ${outDir}`);

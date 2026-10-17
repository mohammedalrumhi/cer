// Screenshots of the generation wizard steps (light and dark) for the phase report.
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { login } from './api.js';

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const token = await login();
const browser = await chromium.launch({ channel: 'chrome' });
for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(([t, m]) => { localStorage.setItem('auth_token', t); localStorage.setItem('cer:theme', m); }, [token, theme]);
  const page = await context.newPage();
  await page.goto('http://localhost:5310/generate?template=itqan-template-5-students');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/wizard-1-template-${theme}.png` });
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('select-all-saved').click();
  await page.screenshot({ path: `${out}/wizard-2-students-${theme}.png` });
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('review-preview').locator('img').waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/wizard-3-review-${theme}.png` });
  await page.getByTestId('wizard-next').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/wizard-4-output-${theme}.png` });
  await context.close();
}
await browser.close();

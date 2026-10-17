// The generation wizard end to end: 200 students from a spreadsheet, review, PDF job, verification.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { authed, authenticate, login } from '../support/api.js';

let token;
test.skip(({ isMobile }) => isMobile, 'desktop wizard');

test.beforeAll(async () => {
  token = await login();
});

function csv(rows) {
  const escape = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return `﻿${rows.map((r) => r.map(escape).join(',')).join('\n')}`;
}

test('generates 200 certificates from a spreadsheet with mapping, review and a background job', async ({ context, page }) => {
  test.setTimeout(240000);
  await authenticate(context, token);
  const dir = mkdtempSync(path.join(tmpdir(), 'cer-wizard-'));
  const header = ['اسم الطالب', 'المعلم', 'اسم المسار', 'نوع الاستظهار', 'نص السور', 'التقويم', 'عدد الأخطاء', 'الصف'];
  const rows = Array.from({ length: 200 }, (_, i) => [
    i === 7 ? 'عبدالرحمن بن محمد بن سالم بن عبدالله بن خميس الحارثي الكبير' : `${i % 2 ? 'مريم' : 'أحمد'}، ابن ${i + 1}`,
    'منى الذهلية', 'الحافظ المتقن', 'استظهار الحصة السابعة', 'من سورة الأعراف إلى سورة إبراهيم', 'ممتاز', String(i % 4), `الصف ${i % 6 + 1}`,
  ]);
  const file = path.join(dir, 'طلاب.csv');
  writeFileSync(file, csv([header, ...rows, rows[3]])); // one duplicate row

  await page.goto('/generate?template=itqan-template-5-students');
  await expect(page.getByTestId('wizard-template').filter({ has: page.locator('[aria-checked=true]') }).or(page.locator('[data-testid=wizard-template][aria-checked=true]'))).toHaveCount(1);
  await page.getByTestId('wizard-next').click();

  await page.getByRole('radio', { name: /استيراد ملف/ }).click();
  await page.getByTestId('wizard-file').setInputFiles(file);
  await expect(page.getByTestId('map-اسم الطالب')).toHaveValue('name');
  await expect(page.getByTestId('map-الصف')).toHaveValue('custom');
  await expect(page.getByTestId('wizard-total')).toContainText('٢٠٠');
  await expect(page.getByTestId('wizard-total')).toContainText('مكرر');
  await page.getByTestId('wizard-next').click();

  // Review: the very long name is flagged, gender can be set per row.
  await expect(page.getByTestId('review-grid')).toBeVisible();
  await expect(page.getByText(/صُغّر الخط ليتسع|انقسم إلى أسطر أكثر|النص أطول من مساحته/).first()).toBeVisible({ timeout: 60000 });
  const firstRow = page.getByTestId('review-row').first();
  await firstRow.getByRole('radio', { name: 'مؤنث' }).click();
  await expect(page.getByTestId('review-preview').locator('img')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('wizard-next').click();

  // Output: one merged PDF with serials.
  await page.getByTestId('format-pdf').click();
  await page.getByTestId('verification').check();
  const download = page.waitForEvent('download', { timeout: 180000 });
  await page.getByTestId('start-generate').click();
  await expect(page.getByTestId('job-progress')).toHaveAttribute('data-status', 'done', { timeout: 180000 });
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);

  const jobs = await authed(token).get('/jobs');
  const job = jobs.find((item) => item.total === 200 && item.status === 'done');
  expect(job.serials.first).toMatch(/^\d{4}-\d{6}$/);

  // The public verification page needs no login.
  const anonymous = await context.browser().newContext();
  const verify = await anonymous.newPage();
  await verify.goto(`/verify/${job.serials.first}`);
  await expect(verify.getByTestId('verify-card')).toHaveAttribute('data-status', 'valid');
  await anonymous.close();
});

test('the old quick page redirects to the wizard and a pasted list keeps commas in names', async ({ context, page }) => {
  await authenticate(context, token);
  await page.goto('/generate-simple?template=c0574e38-b6a6-4770-b0a9-4637ab6d1e61');
  await expect(page).toHaveURL(/\/generate/);
  await page.goto('/generate?template=c0574e38-b6a6-4770-b0a9-4637ab6d1e61');
  await page.getByTestId('wizard-next').click();
  await page.getByRole('radio', { name: /لصق قائمة/ }).click();
  await page.getByTestId('wizard-paste').fill('محمد بن علي، الحافظ\nفاطمة بنت سعيد\n\nمحمد بن علي، الحافظ');
  await expect(page.getByTestId('wizard-total')).toContainText('٢ طالبًا');
});

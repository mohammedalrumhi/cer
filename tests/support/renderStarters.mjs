// Render every starter template through the PDF renderer to PNGs (design review):
//   node tests/support/renderStarters.mjs <out-dir> [paletteKey] [scale]
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { STARTERS, buildStarter } from '../../shared/templates/index.js';
import { authed, login } from './api.js';
import { rasterizePdf } from './pdfRaster.js';

const [outDir, paletteKey, scale = '0.5'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const api = authed(await login());
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext();
const student = { name: 'عبدالرحمن بن محمد بن سالم الحارثي', recitalType: 'استظهار الحصة السابعة (ثُمن القرآن ونصف)', surahRange: 'من سورة الأعراف إلى سورة إبراهيم', programName: 'الحافظ المتقن', calendar: 'تفوق عالٍ', mistakesCount: 'لا يوجد', teacherName: 'منى الذهلية', serial: '2026-000123', verifyUrl: 'https://example.org/verify/2026-000123' };
for (const starter of STARTERS) {
  const template = buildStarter(starter.id, paletteKey);
  const response = await api.post('/certificates/preview', { template, students: [student] });
  if (!response.ok) { console.log('FAIL', starter.id, response.status, await response.text()); continue; }
  const png = await rasterizePdf(context, Buffer.from(await response.arrayBuffer()), { scale: Number(scale) });
  writeFileSync(`${outDir}/${starter.id}.png`, png);
  console.log('ok', starter.id);
}
await browser.close();

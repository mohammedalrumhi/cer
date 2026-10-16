// Rasterize page 1 of a PDF to PNG: node tests/support/rasterize.mjs <in.pdf> <out.png> [scale]
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { rasterizePdf } from './pdfRaster.js';
const [input, output, scale = '0.6'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext();
writeFileSync(output, await rasterizePdf(context, readFileSync(input), { scale: Number(scale) }));
await browser.close();

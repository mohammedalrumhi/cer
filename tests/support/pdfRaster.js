import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pdfjsBuild = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../node_modules/pdfjs-dist/build');
const ORIGIN = 'https://pdfjs.test';

/**
 * Rasterise page 1 of a PDF in the browser with pdf.js at 1 PDF unit = `scale` px, optionally
 * only `region` ({ x, y, width, height } in PDF units). Returns a PNG buffer.
 * Uses its own page so the app page is untouched.
 */
export async function rasterizePdf(context, pdfBytes, { scale = 1, region = null } = {}) {
  const page = await context.newPage();
  try {
    await page.route(`${ORIGIN}/**`, (route) => {
      const file = path.join(pdfjsBuild, new URL(route.request().url()).pathname.slice(1));
      route.fulfill({ body: readFileSync(file), contentType: 'text/javascript' });
    });
    await page.route(`${ORIGIN}/`, (route) => route.fulfill({ body: '<!doctype html><title>pdf</title>', contentType: 'text/html' }));
    await page.goto(`${ORIGIN}/`);
    const dataUrl = await page.evaluate(async ({ base64, scale: s, origin, region: r }) => {
      const pdfjs = await import(`${origin}/pdf.mjs`);
      pdfjs.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.mjs`;
      const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const doc = await pdfjs.getDocument({ data }).promise;
      const pdfPage = await doc.getPage(1);
      const viewport = pdfPage.getViewport({ scale: s, offsetX: r ? -r.x * s : 0, offsetY: r ? -r.y * s : 0 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(r ? r.width * s : viewport.width);
      canvas.height = Math.round(r ? r.height * s : viewport.height);
      await pdfPage.render({ canvas, viewport }).promise;
      return canvas.toDataURL('image/png');
    }, { base64: Buffer.from(pdfBytes).toString('base64'), scale, origin: ORIGIN, region });
    return Buffer.from(dataUrl.split(',')[1], 'base64');
  } finally {
    await page.close();
  }
}

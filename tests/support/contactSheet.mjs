// Tile PNGs into one contact sheet: node tests/support/contactSheet.mjs <out.png> <cell> <cols> <png…>
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const [out, cellArg, colsArg, ...files] = process.argv.slice(2);
const cell = Number(cellArg);
const cols = Number(colsArg);
const rows = Math.ceil(files.length / cols);
const sheet = new PNG({ width: cols * cell, height: rows * cell });
sheet.data.fill(235);
files.forEach((file, index) => {
  const img = PNG.sync.read(readFileSync(file));
  const scale = Math.min((cell - 10) / img.width, (cell - 10) / img.height);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const ox = (index % cols) * cell + Math.round((cell - w) / 2);
  const oy = Math.floor(index / cols) * cell + Math.round((cell - h) / 2);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      // Box-average the source pixels that map onto this cell pixel.
      const sx0 = Math.floor(x / scale); const sx1 = Math.max(sx0 + 1, Math.floor((x + 1) / scale));
      const sy0 = Math.floor(y / scale); const sy1 = Math.max(sy0 + 1, Math.floor((y + 1) / scale));
      let r = 0; let g = 0; let b = 0; let n = 0;
      for (let yy = sy0; yy < sy1 && yy < img.height; yy += 1) {
        for (let xx = sx0; xx < sx1 && xx < img.width; xx += 1) {
          const i = (yy * img.width + xx) * 4;
          r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n += 1;
        }
      }
      const o = ((oy + y) * sheet.width + ox + x) * 4;
      sheet.data[o] = r / n; sheet.data[o + 1] = g / n; sheet.data[o + 2] = b / n; sheet.data[o + 3] = 255;
    }
  }
});
writeFileSync(out, PNG.sync.write(sheet));

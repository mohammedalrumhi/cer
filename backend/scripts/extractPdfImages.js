// Extract the images embedded in a reference PDF as lossless PNG files (no JPEG recompression).
//   node scripts/extractPdfImages.js <file.pdf> <out-dir> [minWidth=400]
// Handles uncompressed and Flate-compressed DeviceRGB / DeviceGray / DeviceCMYK images, and JPEGs
// (DCTDecode) which are written out unchanged.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PNG } = require('pngjs');
const { PDFDocument, PDFName, PDFRawStream } = require('pdf-lib');

function toRgba(data, width, height, colorSpace) {
  const out = Buffer.alloc(width * height * 4);
  const channels = colorSpace === 'cmyk' ? 4 : colorSpace === 'gray' ? 1 : 3;
  for (let i = 0, p = 0; p < width * height; p += 1, i += channels) {
    let r;
    let g;
    let b;
    if (channels === 4) {
      const c = data[i] / 255; const m = data[i + 1] / 255; const y = data[i + 2] / 255; const k = data[i + 3] / 255;
      r = 255 * (1 - c) * (1 - k); g = 255 * (1 - m) * (1 - k); b = 255 * (1 - y) * (1 - k);
    } else if (channels === 1) {
      r = g = b = data[i];
    } else {
      r = data[i]; g = data[i + 1]; b = data[i + 2];
    }
    out[p * 4] = Math.round(r); out[p * 4 + 1] = Math.round(g); out[p * 4 + 2] = Math.round(b); out[p * 4 + 3] = 255;
  }
  return out;
}

async function main() {
  const [input, outDir, minWidthArg] = process.argv.slice(2);
  if (!input || !outDir) throw new Error('usage: extractPdfImages.js <file.pdf> <out-dir> [minWidth]');
  const minWidth = Number(minWidthArg || 400);
  fs.mkdirSync(outDir, { recursive: true });
  const doc = await PDFDocument.load(fs.readFileSync(input));
  const base = path.basename(input, '.pdf');
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (dict.get(PDFName.of('Subtype'))?.toString() !== '/Image') continue;
    const width = Number(dict.get(PDFName.of('Width'))?.toString());
    const height = Number(dict.get(PDFName.of('Height'))?.toString());
    if (width < minWidth) continue;
    const filter = dict.get(PDFName.of('Filter'))?.toString() || '';
    const cs = dict.get(PDFName.of('ColorSpace'))?.toString() || '';
    const name = `${base}-${ref.objectNumber}-${width}x${height}`;
    if (filter.includes('DCTDecode')) {
      fs.writeFileSync(path.join(outDir, `${name}.jpg`), Buffer.from(obj.contents));
      console.log('jpeg', name);
      continue;
    }
    let data = Buffer.from(obj.contents);
    if (filter.includes('FlateDecode')) data = zlib.inflateSync(data);
    const space = cs.includes('CMYK') ? 'cmyk' : cs.includes('Gray') ? 'gray' : 'rgb';
    const png = new PNG({ width, height });
    png.data = toRgba(data, width, height, space);
    fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(png));
    console.log('png ', name, space);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

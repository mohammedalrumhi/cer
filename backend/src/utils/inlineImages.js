const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { uploadsDir } = require('./storagePaths');

const DATA_URL = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,(.+)$/i;
const EXT = { png: '.png', jpg: '.jpg', jpeg: '.jpg', webp: '.webp', gif: '.gif', 'svg+xml': '.svg' };

/**
 * Templates must reference image files, never inline base64 (it bloats JSON files and MySQL rows).
 * Inline images are written once to the uploads directory (named by content hash, so the same image
 * is stored once) and replaced by their path.
 * @returns {{ template: object, extracted: number }}
 */
function extractInlineImages(template) {
  let extracted = 0;
  const swap = (value) => {
    const match = DATA_URL.exec(String(value || ''));
    if (!match) return value;
    const buffer = Buffer.from(match[2], 'base64');
    const name = `inline-${crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16)}${EXT[match[1].toLowerCase()] || '.png'}`;
    const target = path.join(uploadsDir, name);
    if (!fs.existsSync(target)) fs.writeFileSync(target, buffer);
    extracted += 1;
    return `uploads/${name}`;
  };
  const elements = (template.elements || []).map((element) => (typeof element.src === 'string' && element.src.startsWith('data:') ? { ...element, src: swap(element.src) } : element));
  const background = template.background?.imagePath?.startsWith?.('data:') ? { ...template.background, imagePath: swap(template.background.imagePath) } : template.background;
  return { template: extracted ? { ...template, elements, background } : template, extracted };
}

module.exports = { extractInlineImages };

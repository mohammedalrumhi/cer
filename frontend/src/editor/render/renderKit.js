import bidiFactory from 'bidi-js';
import { createFontRegistry, createTextEngine } from '@shared/render/index.js';
import { buildAssetUrl, fetchFonts } from '../../api/client';

/*
 * Lazily-created singleton: HarfBuzz (WASM) + bidi + font registry. The same engine code runs in
 * the backend PDF renderer, which is what makes the editor and the PDF identical.
 */

let kitPromise = null;
const fontLoads = new Map();

export function loadRenderKit() {
  if (!kitPromise) {
    kitPromise = (async () => {
      const [hb, fonts, qr] = await Promise.all([import('harfbuzzjs'), fetchFonts().catch(() => []), import('qrcode-generator')]);
      return {
        engine: createTextEngine({ hb, bidi: bidiFactory() }),
        qrcode: qr.default || qr,
        registry: createFontRegistry(fonts.map((font) => font.fileName)),
        fonts,
      };
    })();
    kitPromise.catch(() => { kitPromise = null; });
  }
  return kitPromise;
}

/** Register a font uploaded during this session. */
export async function addFontToKit(font) {
  const kit = await loadRenderKit();
  if (!kit.fonts.some((item) => item.fileName === font.fileName)) {
    kit.fonts = [...kit.fonts, font];
    kit.registry = createFontRegistry(kit.fonts.map((item) => item.fileName));
  }
  return kit;
}

/**
 * Fetch and register font files by key. Resolves to the number of newly registered fonts.
 * @param {{ engine: object, fonts: object[] }} kit
 * @param {Iterable<string>} keys
 */
export async function ensureFonts(kit, keys) {
  const loads = [];
  for (const key of keys) {
    if (kit.engine.hasFont(key)) continue;
    const font = kit.fonts.find((item) => item.value === key);
    if (!font) continue;
    if (!fontLoads.has(key)) {
      fontLoads.set(key, fetch(buildAssetUrl(font.url))
        .then((response) => {
          if (!response.ok) throw new Error(`Font ${key}: HTTP ${response.status}`);
          return response.arrayBuffer();
        })
        .then((bytes) => { kit.engine.registerFont(key, new Uint8Array(bytes)); })
        .catch((error) => {
          fontLoads.delete(key);
          console.warn(error);
        }));
    }
    loads.push(fontLoads.get(key));
  }
  await Promise.all(loads);
  return loads.length;
}

const cssFaces = new Map();

/** Register a CSS @font-face for a font key (used by HTML overlays such as the text editor). */
export function ensureCssFontFace(kit, key) {
  if (!cssFaces.has(key)) {
    const font = kit.fonts.find((item) => item.value === key);
    if (!font || typeof FontFace === 'undefined') return Promise.resolve();
    const face = new FontFace(key, `url(${buildAssetUrl(font.url)})`);
    cssFaces.set(key, face.load().then((loaded) => { document.fonts.add(loaded); }).catch(() => {}));
  }
  return cssFaces.get(key);
}

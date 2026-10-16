import { buildScene, requiredFontKeys } from '@shared/render/index.js';
import { migrateTemplate as migrate } from '@shared/model/index.js';
import { buildAssetUrl } from '../../api/client';
import { buildPreviewValues } from '../model/sampleData';
import { filteredImage, imageSourceUrl, loadImage } from './imageSource';
import { ensureFonts, loadRenderKit } from './renderKit';
import { paintSceneOnCanvas } from './paintOps';

/**
 * Render a template (with sample or real student data) to a canvas, outside the editor: template
 * thumbnails, the generator's live preview and PNG/JPG output. Same scene and painter as the editor.
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderTemplateToCanvas(rawTemplate, { branding, student, scale = 1, extra, canvas } = {}) {
  const kit = await loadRenderKit();
  const template = migrate(rawTemplate);
  await ensureFonts(kit, requiredFontKeys(template, kit.registry));
  const values = { ...buildPreviewValues(template, branding, student || undefined), ...(extra || {}) };
  const scene = buildScene(template, { engine: kit.engine, registry: kit.registry, values, qrcode: kit.qrcode });

  // Load every image the scene needs before painting.
  const urls = new Map();
  for (const op of scene.ops) {
    if (op.kind !== 'image' || op.placeholder) continue;
    const url = imageSourceUrl(op.source, branding);
    if (url) urls.set(op, url);
  }
  const loaded = new Map(await Promise.all([...new Set(urls.values())].map(async (url) => [url, await loadImage(url)])));
  const backgroundImage = scene.background.imagePath ? await loadImage(buildAssetUrl(scene.background.imagePath)) : null;

  const target = canvas || document.createElement('canvas');
  target.width = Math.max(1, Math.round(scene.width * scale));
  target.height = Math.max(1, Math.round(scene.height * scale));
  const ctx = target.getContext('2d');
  ctx.save();
  ctx.scale(scale, scale);
  paintSceneOnCanvas(ctx, scene, {
    engine: kit.engine,
    backgroundImage,
    imageFor: (op) => {
      const url = urls.get(op);
      return url ? filteredImage(loaded.get(url), url, op.filters) : null;
    },
  });
  ctx.restore();
  return { canvas: target, scene };
}

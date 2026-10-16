import { useEffect, useMemo, useState } from 'react';
import { elementToOp, requiredFontKeys, resolvePaint } from '@shared/render/index.js';
import { ensureFonts, loadRenderKit } from '../render/renderKit';
import { buildPreviewValues } from '../model/sampleData';

/**
 * Scene ops for the current document. Each element's op is cached by object identity (the
 * store keeps unchanged elements identical), so editing one element re-lays-out only that one.
 *
 * @param {object} document
 * @param {object} branding
 * @param {object|null} [student] real student for preview mode (null = sample data)
 */
export function useSceneOps(document, branding, student = null) {
  const [kit, setKit] = useState(null);
  const [fontsVersion, setFontsVersion] = useState(0);
  const [cache] = useState(() => new WeakMap());

  useEffect(() => {
    let alive = true;
    loadRenderKit().then((loaded) => { if (alive) setKit(loaded); }).catch(console.error);
    return () => { alive = false; };
  }, []);

  // Load every font the document needs; re-render once they arrive.
  useEffect(() => {
    if (!kit) return undefined;
    let alive = true;
    ensureFonts(kit, requiredFontKeys(document, kit.registry)).then((loaded) => {
      if (alive && loaded > 0) setFontsVersion((version) => version + 1);
    });
    return () => { alive = false; };
  }, [kit, document]);

  const { audienceType, detailLevel, digits } = document;
  const values = useMemo(
    () => buildPreviewValues({ audienceType, detailLevel }, branding, student || undefined),
    [audienceType, detailLevel, branding, student],
  );

  const ops = useMemo(() => {
    if (!kit) return [];
    const ctx = { engine: kit.engine, registry: kit.registry, values, qrcode: kit.qrcode, digits: digits || 'keep' };
    return document.elements.map((element) => {
      const hit = cache.get(element);
      if (hit && hit.values === values && hit.fontsVersion === fontsVersion && hit.registry === kit.registry && hit.digits === ctx.digits) return hit.op;
      const op = elementToOp(element, ctx);
      cache.set(element, { op, values, fontsVersion, registry: kit.registry, digits: ctx.digits });
      return op;
    }).filter(Boolean);
  }, [kit, cache, document.elements, values, fontsVersion, digits]);

  const width = Number(document.width) || 1123;
  const height = Number(document.height) || 794;
  const bg = document.background || {};
  const scene = useMemo(() => ({
    width,
    height,
    background: {
      fill: resolvePaint(bg.fill || bg.color || '#f8f4ea', width, height),
      imagePath: bg.imagePath || null,
      imageOpacity: bg.imageOpacity ?? 1,
    },
  }), [width, height, bg.fill, bg.color, bg.imagePath, bg.imageOpacity]);

  return { ops, scene, values, engine: kit?.engine, kit, ready: Boolean(kit), fontsVersion };
}

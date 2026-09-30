import { useEffect, useMemo, useState } from 'react';
import { elementToOp, requiredFontKeys } from '@shared/render/index.js';
import { ensureFonts, loadRenderKit } from '../render/renderKit';
import { buildPreviewValues } from '../model/sampleData';

/**
 * Scene ops for the current document. Each element's op is cached by object identity (the
 * store keeps unchanged elements identical), so editing one element re-lays-out only that one.
 */
export function useSceneOps(document, branding) {
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

  const { audienceType, detailLevel } = document;
  const values = useMemo(
    () => buildPreviewValues({ audienceType, detailLevel }, branding),
    [audienceType, detailLevel, branding],
  );

  const ops = useMemo(() => {
    if (!kit) return [];
    const ctx = { engine: kit.engine, registry: kit.registry, values };
    return document.elements.map((element) => {
      const hit = cache.get(element);
      if (hit && hit.values === values && hit.fontsVersion === fontsVersion && hit.registry === kit.registry) return hit.op;
      const op = elementToOp(element, ctx);
      cache.set(element, { op, values, fontsVersion, registry: kit.registry });
      return op;
    }).filter(Boolean);
  }, [kit, cache, document.elements, values, fontsVersion]);

  return { ops, engine: kit?.engine, kit, ready: Boolean(kit), fontsVersion };
}

import { useEffect, useRef, useState } from 'react';
import { buildAssetUrl } from '../../api/client';
import { renderTemplateToCanvas } from '../../editor/render/renderScene';
import { cx } from '../../ui/cx';

const cache = new Map(); // id|updatedAt|variant → data URL
const THUMB_WIDTH = 360;
let queue = Promise.resolve();

/** Render one at a time so a gallery of 30 cards doesn't freeze the page. */
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

/**
 * Real rendered thumbnail of a template with sample data (fixes cards that printed field keys or
 * only the background). Rendered lazily when the card scrolls into view, cached per version.
 */
export function TemplateThumbnail({ template, branding, className, variantKey }) {
  const ref = useRef(null);
  const key = `${template.id}|${template.updatedAt || ''}|${template.version || ''}|${variantKey || ''}`;
  const [rendered, setRendered] = useState(null);
  const url = cache.get(key) || (rendered?.key === key ? rendered.url : null);
  const ratio = (Number(template.width) || 1123) / (Number(template.height) || 794);

  useEffect(() => {
    if (cache.has(key)) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    let alive = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      enqueue(async () => {
        if (!alive) return;
        let source = template;
        if (variantKey) {
          const variant = template.availableBackgroundVariants?.find((item) => item.key === variantKey);
          if (variant) source = { ...template, background: { ...template.background, type: 'image', imagePath: variant.imagePath, color: variant.color, accentColor: variant.accentColor } };
        }
        const scale = THUMB_WIDTH / (Number(template.width) || 1123);
        const { canvas } = await renderTemplateToCanvas(source, { branding, scale });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
        cache.set(key, dataUrl);
        if (alive) setRendered({ key, url: dataUrl });
      }).catch(() => {});
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [key, template, branding, variantKey]);

  const fallbackImage = buildAssetUrl(template.background?.imagePath);
  return (
    <div
      ref={ref}
      className={cx('relative overflow-hidden bg-white', className)}
      style={{ aspectRatio: ratio, background: url ? undefined : template.background?.color || '#f8f4ea' }}
      data-testid="template-thumbnail"
      data-rendered={url ? 'true' : 'false'}
    >
      {url ? (
        <img src={url} alt={template.name || ''} className="h-full w-full object-contain" draggable={false} />
      ) : (
        <>
          {fallbackImage && <img src={fallbackImage} alt="" className="h-full w-full object-cover opacity-60" loading="lazy" />}
          <div className="skeleton absolute inset-0 opacity-40" />
        </>
      )}
    </div>
  );
}

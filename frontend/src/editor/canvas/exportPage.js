/**
 * Rasterise just the page (no selection handles, grid or shadow) at `scale` × template px.
 *
 * The page group is temporarily reset to the origin at 1:1 so the output does not depend on the
 * current zoom/pan: exporting a region at a fractional viewport offset makes Konva round the
 * crop, shifting everything by up to half a screen pixel (over a pixel in template units when
 * zoomed out).
 *
 * @param {import('konva').default.Stage} stage
 * @param {{ width: number, height: number }} document
 */
export function exportPageDataUrl(stage, document, _viewport, { scale = 2, mimeType = 'image/png' } = {}) {
  const page = stage.findOne('.page');
  const hidden = [...stage.find('.ui'), ...stage.find('.grid'), ...stage.find('.page-shadow')].filter((node) => node.visible());
  const previous = { x: page.x(), y: page.y(), scaleX: page.scaleX(), scaleY: page.scaleY() };

  hidden.forEach((node) => node.hide());
  page.position({ x: 0, y: 0 });
  page.scale({ x: 1, y: 1 });
  try {
    return stage.toDataURL({
      x: 0,
      y: 0,
      width: Math.round(document.width),
      height: Math.round(document.height),
      pixelRatio: scale,
      mimeType,
    });
  } finally {
    page.position({ x: previous.x, y: previous.y });
    page.scale({ x: previous.scaleX, y: previous.scaleY });
    hidden.forEach((node) => node.show());
  }
}

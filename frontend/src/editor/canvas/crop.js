/** Keep the image covering the whole box. */
export function clampCover(r, boxW, boxH) {
  const scale = Math.max(1, boxW / r.width, boxH / r.height);
  const width = r.width * scale;
  const height = r.height * scale;
  return { width, height, x: Math.min(0, Math.max(boxW - width, r.x)), y: Math.min(0, Math.max(boxH - height, r.y)) };
}

/** Crop fractions for an image rectangle behind a box (with fit = cover). */
export function cropFromRect(r, boxW, boxH) {
  const f = (n) => Math.min(1, Math.max(0, Math.round(n * 10000) / 10000));
  return { x: f(-r.x / r.width), y: f(-r.y / r.height), width: Math.max(0.0001, f(boxW / r.width)), height: Math.max(0.0001, f(boxH / r.height)) };
}


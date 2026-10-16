import { useEffect, useRef } from 'react';
import { union } from './geometry';

export const RULER_SIZE = 20;
const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

function colors(el) {
  const css = getComputedStyle(el);
  return {
    bg: css.getPropertyValue('--surface').trim() || '#fff',
    fg: css.getPropertyValue('--fg-muted').trim() || '#666',
    line: css.getPropertyValue('--border').trim() || '#ddd',
    band: 'rgba(15,157,116,0.18)',
  };
}

const DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arabic = (n) => String(n).replace(/\d/g, (d) => DIGITS[d]);

function draw(canvas, axis, origin, zoom, band) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const c = canvas.getContext('2d');
  const col = colors(canvas);
  c.scale(dpr, dpr);
  c.fillStyle = col.bg;
  c.fillRect(0, 0, rect.width, rect.height);
  if (band) {
    c.fillStyle = col.band;
    const a = origin + band[0] * zoom;
    const b = origin + band[1] * zoom;
    if (axis === 'x') c.fillRect(a, 0, b - a, RULER_SIZE);
    else c.fillRect(0, a, RULER_SIZE, b - a);
  }
  const length = axis === 'x' ? rect.width : rect.height;
  const step = STEPS.find((s) => s * zoom >= 60) ?? 1000;
  const minor = step / (step % 5 === 0 ? 5 : 2);
  const start = Math.floor(-origin / zoom / minor) * minor;
  const end = (length - origin) / zoom;
  c.strokeStyle = col.line;
  c.fillStyle = col.fg;
  c.font = '10px "IBM Plex Sans Arabic", sans-serif';
  c.textBaseline = 'top';
  c.beginPath();
  for (let v = start; v <= end; v += minor) {
    const pos = Math.round(origin + v * zoom) + 0.5;
    const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
    const tick = major ? 8 : 4;
    if (axis === 'x') {
      c.moveTo(pos, RULER_SIZE);
      c.lineTo(pos, RULER_SIZE - tick);
      if (major) c.fillText(arabic(Math.round(v)), pos + 3, 2);
    } else {
      c.moveTo(0, pos);
      c.lineTo(tick, pos);
      if (major) {
        c.save();
        c.translate(RULER_SIZE - 2, pos + 3);
        c.rotate(Math.PI / 2);
        c.fillText(arabic(Math.round(v)), 0, 0);
        c.restore();
      }
    }
  }
  c.stroke();
}

/**
 * Rulers in page px along the top and on the right (RTL inline-start) edge of the canvas,
 * highlighting the selection's extent. They overlay the stage; the page is fitted with padding.
 */
export default function Rulers({ viewport, boxes, selectedIds }) {
  const top = useRef(null);
  const side = useRef(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const box = union(selectedIds.map((id) => boxes.get(id)).filter(Boolean));
      const t = top.current;
      const s = side.current;
      if (!t || !s) return;
      draw(t, 'x', viewport.x, viewport.zoom, box ? [box.x, box.x + box.width] : null);
      draw(s, 'y', viewport.y - RULER_SIZE, viewport.zoom, box ? [box.y, box.y + box.height] : null);
    });
    return () => cancelAnimationFrame(frame);
  });
  return (
    <>
      <canvas ref={top} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-5 w-full border-b border-border" />
      <canvas ref={side} aria-hidden className="pointer-events-none absolute start-0 top-5 z-10 h-[calc(100%-20px)] w-5 border-e border-border" />
    </>
  );
}

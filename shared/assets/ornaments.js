import { ellipsePath, fmt, polygonPoints, polylinePath, rectPath, roundedPolygonPath, transformPath } from '../render/path.js';

/**
 * Parametric vector library: shapes (filled/stroked like rectangles) and Islamic ornaments.
 *
 * Every entry builds its paths for the element's actual size, so ornaments stay crisp and borders
 * repeat their motif to fill the width instead of stretching. A generator returns path items:
 *   { d, role: 'primary'|'accent', mode: 'fill'|'stroke', width?: number, evenOdd?: boolean }
 * `width` (stroke) is a multiple of the element's line weight (`strokeWidth`, default 2).
 */

const TAU = Math.PI * 2;

function star(cx, cy, outer, inner, points, rotation = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotation + (i * Math.PI) / points;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return polylinePath(pts);
}

function circle(cx, cy, r) {
  return ellipsePath(cx, cy, r, r);
}

/** Lens (vesica) petal from the centre outwards at angle a. */
function petal(cx, cy, a, inner, outer, widthRatio = 0.32) {
  const x1 = cx + Math.cos(a) * inner;
  const y1 = cy + Math.sin(a) * inner;
  const x2 = cx + Math.cos(a) * outer;
  const y2 = cy + Math.sin(a) * outer;
  const mid = (inner + outer) / 2;
  const half = (outer - inner) * widthRatio;
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const mx = cx + Math.cos(a) * mid;
  const my = cy + Math.sin(a) * mid;
  return `M${fmt(x1)} ${fmt(y1)}Q${fmt(mx + nx * half * 2)} ${fmt(my + ny * half * 2)} ${fmt(x2)} ${fmt(y2)}Q${fmt(mx - nx * half * 2)} ${fmt(my - ny * half * 2)} ${fmt(x1)} ${fmt(y1)}Z`;
}

function diamond(cx, cy, rx, ry) {
  return polylinePath([[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]]);
}

/** Leaf for laurels: a lens between two points with a bulge. */
function leaf(x1, y1, x2, y2, bulge) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  return `M${fmt(x1)} ${fmt(y1)}Q${fmt(mx + nx * bulge)} ${fmt(my + ny * bulge)} ${fmt(x2)} ${fmt(y2)}Q${fmt(mx - nx * bulge * 0.35)} ${fmt(my - ny * bulge * 0.35)} ${fmt(x1)} ${fmt(y1)}Z`;
}

/** Rub el Hizb: two overlapping squares, with a ring and a centre hole. */
function star8(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2;
  const inner = R * (Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8));
  return [
    { d: star(cx, cy, R, inner, 8, -Math.PI / 2) + circle(cx, cy, R * 0.42), role: 'primary', mode: 'fill', evenOdd: true },
    { d: circle(cx, cy, R * 0.3), role: 'accent', mode: 'fill' },
  ];
}

function rosette(petals, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2;
  let d = '';
  for (let i = 0; i < petals; i += 1) d += petal(cx, cy, (i / petals) * TAU - Math.PI / 2, R * 0.2, R, petals > 10 ? 0.22 : 0.3);
  let accent = '';
  for (let i = 0; i < petals; i += 1) accent += petal(cx, cy, ((i + 0.5) / petals) * TAU - Math.PI / 2, R * 0.22, R * 0.62, 0.26);
  return [
    { d: accent, role: 'accent', mode: 'fill' },
    { d, role: 'primary', mode: 'fill' },
    { d: circle(cx, cy, R * 0.2) + circle(cx, cy, R * 0.11), role: 'primary', mode: 'fill', evenOdd: true },
  ];
}

function sunburstSeal(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2;
  return [
    { d: star(cx, cy, R, R * 0.86, 24), role: 'primary', mode: 'fill' },
    { d: circle(cx, cy, R * 0.76), role: 'accent', mode: 'fill' },
    { d: circle(cx, cy, R * 0.7) + circle(cx, cy, R * 0.66), role: 'primary', mode: 'fill', evenOdd: true },
  ];
}

function star10(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2;
  return [
    { d: star(cx, cy, R, R * 0.62, 10), role: 'primary', mode: 'fill' },
    { d: star(cx, cy, R * 0.5, R * 0.31, 10, -Math.PI / 2 + Math.PI / 10), role: 'accent', mode: 'fill' },
  ];
}

/** Corner flourish in the top-left corner of the box: bands along both edges ending in curls. */
function cornerClassic(w, h) {
  const s = Math.min(w, h);
  const band = s * 0.05;
  const d = [
    rectPath(0, 0, w, band),
    rectPath(0, 0, band, h),
    rectPath(band * 2.2, band * 2.2, w * 0.72, band * 0.5),
    rectPath(band * 2.2, band * 2.2, band * 0.5, h * 0.72),
  ].join('');
  const curlR = s * 0.11;
  const curls = circle(w - curlR * 0.2, band * 2.45, curlR * 0.18) + circle(band * 2.45, h - curlR * 0.2, curlR * 0.18);
  const rosetteR = s * 0.22;
  let petals = '';
  for (let i = 0; i < 8; i += 1) petals += petal(rosetteR * 1.05, rosetteR * 1.05, (i / 8) * TAU, rosetteR * 0.18, rosetteR * 0.9, 0.3);
  return [
    { d: d + curls, role: 'primary', mode: 'fill' },
    { d: petals, role: 'accent', mode: 'fill' },
    { d: circle(rosetteR * 1.05, rosetteR * 1.05, rosetteR * 0.16), role: 'primary', mode: 'fill' },
  ];
}

function cornerArabesque(w, h) {
  const s = Math.min(w, h);
  // Quarter-circle bands nested in the corner, plus a teardrop toward the centre.
  const arc = (r, t) => {
    const k = 0.5522847498;
    const outer = `M${fmt(r)} 0C${fmt(r)} ${fmt(r * k)} ${fmt(r * k)} ${fmt(r)} 0 ${fmt(r)}`;
    const ri = r - t;
    const inner = `L0 ${fmt(ri)}C${fmt(ri * k)} ${fmt(ri)} ${fmt(ri)} ${fmt(ri * k)} ${fmt(ri)} 0Z`;
    return outer + inner;
  };
  const band = s * 0.045;
  return [
    { d: arc(s * 0.62, band) + arc(s * 0.46, band * 0.6), role: 'primary', mode: 'fill' },
    { d: rectPath(0, 0, w, band * 0.8) + rectPath(0, 0, band * 0.8, h), role: 'primary', mode: 'fill' },
    { d: leaf(s * 0.18, s * 0.18, s * 0.42, s * 0.42, s * 0.09) + circle(s * 0.12, s * 0.12, s * 0.06), role: 'accent', mode: 'fill' },
  ];
}

function cornerGeometric(w, h) {
  const s = Math.min(w, h);
  const t = s * 0.04;
  let steps = '';
  for (let i = 0; i < 3; i += 1) {
    const o = i * t * 2.5;
    steps += rectPath(o, o, w - o, t) + rectPath(o, o, t, h - o);
  }
  return [
    { d: steps, role: 'primary', mode: 'fill' },
    { d: star(s * 0.3, s * 0.3, s * 0.13, s * 0.13 * 0.7654, 8, -Math.PI / 2), role: 'accent', mode: 'fill' },
  ];
}

/** Repeating band along the width; the motif count follows the aspect ratio. */
function border(motif, w, h) {
  const unit = h;
  const count = Math.max(1, Math.round(w / unit));
  const step = w / count;
  let d = '';
  let accent = '';
  for (let i = 0; i < count; i += 1) {
    const cx = step * (i + 0.5);
    const cy = h / 2;
    if (motif === 'diamonds') {
      d += diamond(cx, cy, step * 0.42, h * 0.42);
      accent += circle(cx, cy, h * 0.1);
    } else if (motif === 'stars') {
      d += star(cx, cy, h * 0.46, h * 0.46 * 0.7654, 8);
      accent += circle(cx + step / 2, cy, h * 0.07);
    } else if (motif === 'scallops') {
      const r = step / 2;
      d += `M${fmt(cx - r)} ${fmt(h)}C${fmt(cx - r)} ${fmt(h - r * 1.1)} ${fmt(cx + r)} ${fmt(h - r * 1.1)} ${fmt(cx + r)} ${fmt(h)}Z`;
      accent += circle(cx, h - r * 0.45, Math.min(r, h) * 0.14);
    } else if (motif === 'chain') {
      d += ellipsePath(cx, cy, step * 0.42, h * 0.38) + ellipsePath(cx, cy, step * 0.28, h * 0.22);
      accent += diamond(cx + step / 2, cy, h * 0.12, h * 0.12);
    } else if (motif === 'zigzag') {
      const pts = [[cx - step / 2, h * 0.75], [cx, h * 0.15], [cx + step / 2, h * 0.75], [cx + step / 2, h * 0.95], [cx, h * 0.38], [cx - step / 2, h * 0.95]];
      d += polylinePath(pts);
    }
  }
  return [
    { d, role: 'primary', mode: 'fill', evenOdd: motif === 'chain' },
    { d: accent, role: 'accent', mode: 'fill' },
  ];
}

/** Full rectangular frame bands with ornaments at the corners. */
function frameDouble(w, h) {
  const s = Math.min(w, h);
  const t = Math.max(1.5, s * 0.008);
  const gap = s * 0.022;
  const outer = rectPath(0, 0, w, h) + rectPath(t * 2, t * 2, w - t * 4, h - t * 4);
  const innerO = gap + t * 2;
  const inner = rectPath(innerO, innerO, w - innerO * 2, h - innerO * 2) + rectPath(innerO + t, innerO + t, w - (innerO + t) * 2, h - (innerO + t) * 2);
  const c = s * 0.045;
  let corners = '';
  for (const [x, y] of [[innerO, innerO], [w - innerO, innerO], [innerO, h - innerO], [w - innerO, h - innerO]]) corners += diamond(x, y, c, c);
  return [
    { d: outer + inner, role: 'primary', mode: 'fill', evenOdd: true },
    { d: corners, role: 'accent', mode: 'fill' },
  ];
}

function frameOrnate(w, h) {
  const s = Math.min(w, h);
  const t = Math.max(2, s * 0.012);
  const o = s * 0.035;
  const band = rectPath(o, o, w - o * 2, h - o * 2) + rectPath(o + t, o + t, w - (o + t) * 2, h - (o + t) * 2);
  const hair = rectPath(0, 0, w, h) + rectPath(t * 0.4, t * 0.4, w - t * 0.8, h - t * 0.8);
  const r = s * 0.075;
  let rosettes = '';
  let centres = '';
  for (const [x, y] of [[o, o], [w - o, o], [o, h - o], [w - o, h - o]]) {
    for (let i = 0; i < 8; i += 1) rosettes += petal(x, y, (i / 8) * TAU, r * 0.2, r, 0.3);
    centres += circle(x, y, r * 0.22);
  }
  let mids = '';
  for (const [x, y] of [[w / 2, o], [w / 2, h - o], [o, h / 2], [w - o, h / 2]]) mids += diamond(x, y, r * 0.55, r * 0.55) + circle(x, y, r * 0.16);
  return [
    { d: hair + band, role: 'primary', mode: 'fill', evenOdd: true },
    { d: rosettes + mids, role: 'accent', mode: 'fill', evenOdd: true },
    { d: centres, role: 'primary', mode: 'fill' },
  ];
}

/** Pointed (mihrab) arch outline as a band: the box is the arch's bounding rectangle. */
function archPath(w, h, inset = 0) {
  const x0 = inset;
  const x1 = w - inset;
  const top = inset;
  const spring = Math.min(h * 0.42, (x1 - x0) * 0.75) + inset;
  const cx = w / 2;
  return `M${fmt(x0)} ${fmt(h - inset)}L${fmt(x0)} ${fmt(spring)}C${fmt(x0)} ${fmt(spring - (spring - top) * 0.62)} ${fmt(cx - (x1 - x0) * 0.18)} ${fmt(top + (spring - top) * 0.18)} ${fmt(cx)} ${fmt(top)}C${fmt(cx + (x1 - x0) * 0.18)} ${fmt(top + (spring - top) * 0.18)} ${fmt(x1)} ${fmt(spring - (spring - top) * 0.62)} ${fmt(x1)} ${fmt(spring)}L${fmt(x1)} ${fmt(h - inset)}Z`;
}

function frameArch(w, h) {
  const t = Math.max(2, Math.min(w, h) * 0.012);
  return [
    { d: archPath(w, h) + archPath(w, h, t), role: 'primary', mode: 'fill', evenOdd: true },
    { d: archPath(w, h, t * 3) + archPath(w, h, t * 3.6), role: 'accent', mode: 'fill', evenOdd: true },
  ];
}

function divider(kind, w, h) {
  const cy = h / 2;
  const t = Math.max(1, h * 0.08);
  const c = Math.min(h * 0.5, w * 0.08);
  const left = rectPath(0, cy - t / 2, w / 2 - c * 1.6, t);
  const right = rectPath(w / 2 + c * 1.6, cy - t / 2, w / 2 - c * 1.6, t);
  if (kind === 'star') {
    return [
      { d: left + right, role: 'primary', mode: 'fill' },
      { d: star(w / 2, cy, c, c * 0.7654, 8), role: 'accent', mode: 'fill' },
      { d: circle(w / 2 - c * 2.2, cy, t * 1.2) + circle(w / 2 + c * 2.2, cy, t * 1.2), role: 'accent', mode: 'fill' },
    ];
  }
  if (kind === 'flourish') {
    // Tapered strokes that thin toward the ends, with a lens in the middle.
    const taper = (x0, x1) => `M${fmt(x0)} ${fmt(cy)}Q${fmt((x0 + x1) / 2)} ${fmt(cy - t * 1.4)} ${fmt(x1)} ${fmt(cy)}Q${fmt((x0 + x1) / 2)} ${fmt(cy + t * 1.4)} ${fmt(x0)} ${fmt(cy)}Z`;
    return [
      { d: taper(0, w / 2 - c * 1.3) + taper(w, w / 2 + c * 1.3), role: 'primary', mode: 'fill' },
      { d: petal(w / 2 - c * 1.2, cy, 0, 0, c * 2.4, 0.22) + petal(w / 2, cy - c * 1.2, Math.PI / 2, 0, c * 2.4, 0.22), role: 'accent', mode: 'fill' },
    ];
  }
  return [
    { d: left + right, role: 'primary', mode: 'fill' },
    { d: diamond(w / 2, cy, c, c) + circle(w / 2 - c * 2, cy, t * 1.3) + circle(w / 2 + c * 2, cy, t * 1.3), role: 'accent', mode: 'fill' },
  ];
}

function laurel(w, h) {
  // Two branches curving up from the bottom centre, leaves alternating along each arc.
  const cx = w / 2;
  const bottom = h * 0.96;
  const R = Math.min(w / 2, h) * 0.9;
  let leaves = '';
  let stem = '';
  for (const side of [-1, 1]) {
    const steps = 9;
    let prev = null;
    for (let i = 0; i <= steps; i += 1) {
      const a = Math.PI / 2 + side * (0.15 + (i / steps) * 1.9);
      const x = cx + Math.cos(a) * R * 0.92;
      const y = bottom - R + Math.sin(a) * R * 0.92 + R * 0.06;
      if (prev) stem += `M${fmt(prev[0])} ${fmt(prev[1])}L${fmt(x)} ${fmt(y)}`;
      prev = [x, y];
      if (i === 0) continue;
      const size = R * (0.2 - i * 0.008);
      const out = a - side * 0.6;
      const inn = a + side * 0.5 + Math.PI;
      leaves += leaf(x, y, x + Math.cos(out) * size, y + Math.sin(out) * size, size * 0.32);
      leaves += leaf(x, y, x + Math.cos(inn + Math.PI) * size * 0.85, y + Math.sin(inn + Math.PI) * size * 0.85, size * 0.28);
    }
  }
  return [
    { d: stem, role: 'primary', mode: 'stroke', width: 1 },
    { d: leaves, role: 'primary', mode: 'fill' },
  ];
}

function medallion(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2;
  let scallop = '';
  const n = 20;
  for (let i = 0; i < n; i += 1) scallop += circle(cx + Math.cos((i / n) * TAU) * R * 0.86, cy + Math.sin((i / n) * TAU) * R * 0.86, R * 0.15);
  return [
    { d: scallop + circle(cx, cy, R * 0.86), role: 'primary', mode: 'fill' },
    { d: circle(cx, cy, R * 0.72), role: 'accent', mode: 'fill' },
    { d: circle(cx, cy, R * 0.66) + circle(cx, cy, R * 0.63), role: 'primary', mode: 'fill', evenOdd: true },
  ];
}

function lantern(w, h) {
  const cx = w / 2;
  const body = archPath(w * 0.7, h * 0.62);
  const placedBody = transformPath(body, [1, 0, 0, 1, w * 0.15, h * 0.2]);
  return [
    { d: rectPath(cx - w * 0.06, 0, w * 0.12, h * 0.08, w * 0.03) + polylinePath([[cx - w * 0.22, h * 0.2], [cx + w * 0.22, h * 0.2], [cx + w * 0.1, h * 0.08], [cx - w * 0.1, h * 0.08]]), role: 'primary', mode: 'fill' },
    { d: placedBody, role: 'primary', mode: 'fill' },
    { d: star(cx, h * 0.55, w * 0.16, w * 0.16 * 0.7654, 8), role: 'accent', mode: 'fill' },
    { d: rectPath(w * 0.2, h * 0.82, w * 0.6, h * 0.06, h * 0.02) + polylinePath([[cx - w * 0.15, h * 0.88], [cx + w * 0.15, h * 0.88], [cx, h]]), role: 'primary', mode: 'fill' },
  ];
}

export const ORNAMENTS = {
  star8: { label: 'نجمة ثمانية', category: 'rosettes', aspect: 1, build: star8, keywords: 'نجمة ربع الحزب ثماني' },
  star10: { label: 'نجمة عشارية', category: 'rosettes', aspect: 1, build: star10, keywords: 'نجمة عشر' },
  rosette8: { label: 'وردة ثمانية', category: 'rosettes', aspect: 1, build: (w, h) => rosette(8, w, h), keywords: 'وردة زهرة' },
  rosette12: { label: 'وردة اثنا عشرية', category: 'rosettes', aspect: 1, build: (w, h) => rosette(12, w, h), keywords: 'وردة زهرة' },
  medallion: { label: 'وسام', category: 'rosettes', aspect: 1, build: medallion, keywords: 'وسام ختم ميدالية' },
  sunburst: { label: 'ختم مشعّ', category: 'rosettes', aspect: 1, build: sunburstSeal, keywords: 'ختم شمس أشعة' },
  'corner-classic': { label: 'زاوية كلاسيكية', category: 'corners', aspect: 1, build: cornerClassic, keywords: 'زاوية ركن' },
  'corner-arabesque': { label: 'زاوية أرابيسك', category: 'corners', aspect: 1, build: cornerArabesque, keywords: 'زاوية ركن أرابيسك' },
  'corner-geometric': { label: 'زاوية هندسية', category: 'corners', aspect: 1, build: cornerGeometric, keywords: 'زاوية ركن هندسي' },
  'border-diamonds': { label: 'شريط معينات', category: 'borders', aspect: 10, build: (w, h) => border('diamonds', w, h), keywords: 'شريط حد إطار معين' },
  'border-stars': { label: 'شريط نجوم', category: 'borders', aspect: 10, build: (w, h) => border('stars', w, h), keywords: 'شريط حد نجوم' },
  'border-scallops': { label: 'شريط أقواس', category: 'borders', aspect: 10, build: (w, h) => border('scallops', w, h), keywords: 'شريط حد قوس' },
  'border-chain': { label: 'شريط سلسلة', category: 'borders', aspect: 10, build: (w, h) => border('chain', w, h), keywords: 'شريط حد سلسلة' },
  'border-zigzag': { label: 'شريط متعرّج', category: 'borders', aspect: 10, build: (w, h) => border('zigzag', w, h), keywords: 'شريط متعرج' },
  'frame-double': { label: 'إطار مزدوج', category: 'frames', aspect: 1.414, build: frameDouble, keywords: 'إطار برواز مزدوج' },
  'frame-ornate': { label: 'إطار مزخرف', category: 'frames', aspect: 1.414, build: frameOrnate, keywords: 'إطار برواز زخرفة' },
  'frame-arch': { label: 'إطار محراب', category: 'arches', aspect: 0.72, build: frameArch, keywords: 'محراب قوس إطار' },
  'divider-diamond': { label: 'فاصل معيّن', category: 'dividers', aspect: 12, build: (w, h) => divider('diamond', w, h), keywords: 'فاصل خط معين' },
  'divider-star': { label: 'فاصل نجمة', category: 'dividers', aspect: 12, build: (w, h) => divider('star', w, h), keywords: 'فاصل خط نجمة' },
  'divider-flourish': { label: 'فاصل زخرفي', category: 'dividers', aspect: 10, build: (w, h) => divider('flourish', w, h), keywords: 'فاصل زخرفة' },
  laurel: { label: 'إكليل غار', category: 'awards', aspect: 1.2, build: laurel, keywords: 'إكليل غار تكريم فوز' },
  lantern: { label: 'فانوس', category: 'awards', aspect: 0.6, build: lantern, keywords: 'فانوس رمضان' },
};

export const ORNAMENT_CATEGORIES = [
  { id: 'frames', label: 'إطارات' },
  { id: 'corners', label: 'زوايا' },
  { id: 'borders', label: 'أشرطة' },
  { id: 'dividers', label: 'فواصل' },
  { id: 'rosettes', label: 'نجوم وورود' },
  { id: 'arches', label: 'محاريب وأقواس' },
  { id: 'awards', label: 'أوسمة وزينة' },
];

/* ── Shapes (fill + stroke like rectangles) ─────────────────────────────────────── */

function ribbon(w, h) {
  const notch = Math.min(w * 0.08, h * 0.5);
  return polylinePath([[0, 0], [w, 0], [w - notch, h / 2], [w, h], [0, h], [notch, h / 2]]);
}

function banner(w, h) {
  // Central band with folded tails behind it.
  const tail = w * 0.12;
  const drop = h * 0.22;
  return polylinePath([[tail, 0], [w - tail, 0], [w - tail, h - drop], [tail, h - drop]])
    + polylinePath([[0, drop], [tail, drop], [tail, h], [0, h], [tail * 0.45, (drop + h) / 2]])
    + polylinePath([[w, drop], [w - tail, drop], [w - tail, h], [w, h], [w - tail * 0.45, (drop + h) / 2]]);
}

function shield(w, h) {
  return `M0 0L${fmt(w)} 0L${fmt(w)} ${fmt(h * 0.45)}C${fmt(w)} ${fmt(h * 0.75)} ${fmt(w * 0.72)} ${fmt(h * 0.9)} ${fmt(w / 2)} ${fmt(h)}C${fmt(w * 0.28)} ${fmt(h * 0.9)} 0 ${fmt(h * 0.75)} 0 ${fmt(h * 0.45)}Z`;
}

function heart(w, h) {
  return `M${fmt(w / 2)} ${fmt(h)}C${fmt(w * 0.15)} ${fmt(h * 0.72)} 0 ${fmt(h * 0.5)} 0 ${fmt(h * 0.28)}C0 ${fmt(h * 0.08)} ${fmt(w * 0.18)} 0 ${fmt(w * 0.3)} 0C${fmt(w * 0.4)} 0 ${fmt(w * 0.47)} ${fmt(h * 0.06)} ${fmt(w / 2)} ${fmt(h * 0.15)}C${fmt(w * 0.53)} ${fmt(h * 0.06)} ${fmt(w * 0.6)} 0 ${fmt(w * 0.7)} 0C${fmt(w * 0.82)} 0 ${fmt(w)} ${fmt(h * 0.08)} ${fmt(w)} ${fmt(h * 0.28)}C${fmt(w)} ${fmt(h * 0.5)} ${fmt(w * 0.85)} ${fmt(h * 0.72)} ${fmt(w / 2)} ${fmt(h)}Z`;
}

function cloud(w, h) {
  return `M${fmt(w * 0.22)} ${fmt(h)}C${fmt(w * 0.08)} ${fmt(h)} 0 ${fmt(h * 0.82)} 0 ${fmt(h * 0.66)}C0 ${fmt(h * 0.48)} ${fmt(w * 0.1)} ${fmt(h * 0.36)} ${fmt(w * 0.24)} ${fmt(h * 0.38)}C${fmt(w * 0.27)} ${fmt(h * 0.14)} ${fmt(w * 0.42)} 0 ${fmt(w * 0.58)} 0C${fmt(w * 0.76)} 0 ${fmt(w * 0.86)} ${fmt(h * 0.16)} ${fmt(w * 0.86)} ${fmt(h * 0.36)}C${fmt(w * 0.96)} ${fmt(h * 0.4)} ${fmt(w)} ${fmt(h * 0.52)} ${fmt(w)} ${fmt(h * 0.66)}C${fmt(w)} ${fmt(h * 0.85)} ${fmt(w * 0.9)} ${fmt(h)} ${fmt(w * 0.76)} ${fmt(h)}Z`;
}

function scallopCircle(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const n = 16;
  let d = '';
  const rx = w / 2;
  const ry = h / 2;
  for (let i = 0; i < n; i += 1) {
    const a0 = (i / n) * TAU;
    const a1 = ((i + 1) / n) * TAU;
    const am = (a0 + a1) / 2;
    const p0 = [cx + Math.cos(a0) * rx * 0.9, cy + Math.sin(a0) * ry * 0.9];
    const p1 = [cx + Math.cos(a1) * rx * 0.9, cy + Math.sin(a1) * ry * 0.9];
    const c = [cx + Math.cos(am) * rx * 1.08, cy + Math.sin(am) * ry * 1.08];
    d += `${i === 0 ? `M${fmt(p0[0])} ${fmt(p0[1])}` : ''}Q${fmt(c[0])} ${fmt(c[1])} ${fmt(p1[0])} ${fmt(p1[1])}`;
  }
  return `${d}Z`;
}

function sun(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2;
  return star(cx, cy, R, R * 0.72, 12) + circle(cx, cy, R * 0.6);
}

function book(w, h) {
  // Open book (mushaf) silhouette: two pages meeting at a spine.
  const mid = w / 2;
  const page = (side) => {
    const edge = side < 0 ? 0 : w;
    return `M${fmt(mid)} ${fmt(h * 0.16)}C${fmt(mid + side * w * 0.18)} ${fmt(h * 0.02)} ${fmt(edge - side * w * 0.12)} ${fmt(h * 0.02)} ${fmt(edge)} ${fmt(h * 0.1)}L${fmt(edge)} ${fmt(h * 0.9)}C${fmt(edge - side * w * 0.12)} ${fmt(h * 0.82)} ${fmt(mid + side * w * 0.18)} ${fmt(h * 0.84)} ${fmt(mid)} ${fmt(h)}Z`;
  };
  return page(-1) + page(1);
}

function arch(w, h) {
  return archPath(w, h);
}

function ticket(w, h) {
  const r = Math.min(h * 0.18, w * 0.06);
  const k = 0.5522847498;
  const cy = h / 2;
  return `M0 0L${fmt(w)} 0L${fmt(w)} ${fmt(cy - r)}C${fmt(w - r * k)} ${fmt(cy - r)} ${fmt(w - r)} ${fmt(cy - r * k)} ${fmt(w - r)} ${fmt(cy)}C${fmt(w - r)} ${fmt(cy + r * k)} ${fmt(w - r * k)} ${fmt(cy + r)} ${fmt(w)} ${fmt(cy + r)}L${fmt(w)} ${fmt(h)}L0 ${fmt(h)}L0 ${fmt(cy + r)}C${fmt(r * k)} ${fmt(cy + r)} ${fmt(r)} ${fmt(cy + r * k)} ${fmt(r)} ${fmt(cy)}C${fmt(r)} ${fmt(cy - r * k)} ${fmt(r * k)} ${fmt(cy - r)} 0 ${fmt(cy - r)}Z`;
}

/** Crescent = outer circle minus an offset circle, traced along its real boundary. */
function crescent(w, h) {
  const R = Math.min(w, h) / 2;
  const cx = w / 2;
  const cy = h / 2;
  const ox = cx + R * 0.36;
  const oy = cy - R * 0.12;
  const r = R * 0.82;
  const inside = (x, y, x0, y0, rr) => (x - x0) ** 2 + (y - y0) ** 2 < rr * rr;
  const outer = [];
  const inner = [];
  const n = 180;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * TAU;
    const p = [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    if (!inside(p[0], p[1], ox, oy, r)) outer.push([a, p]);
    const q = [ox + Math.cos(a) * r, oy + Math.sin(a) * r];
    if (inside(q[0], q[1], cx, cy, R)) inner.push([a, q]);
  }
  // Order the outer arc starting after the gap, and the inner arc in the opposite direction.
  const rotate = (list) => {
    let gap = 0;
    for (let i = 1; i < list.length; i += 1) if (list[i][0] - list[i - 1][0] > (TAU / n) * 1.5) gap = i;
    return [...list.slice(gap), ...list.slice(0, gap)].map((item) => item[1]);
  };
  const o = rotate(outer);
  const i = rotate(inner).reverse();
  return polylinePath([...o, ...i]);
}

export const SHAPES = {
  ribbon: { label: 'شريط', aspect: 4, build: ribbon, keywords: 'شريط لافتة' },
  banner: { label: 'لافتة', aspect: 4.5, build: banner, keywords: 'لافتة شريط عنوان' },
  shield: { label: 'درع', aspect: 0.85, build: shield, keywords: 'درع' },
  heart: { label: 'قلب', aspect: 1.1, build: heart, keywords: 'قلب حب' },
  cloud: { label: 'سحابة', aspect: 1.6, build: cloud, keywords: 'سحابة أطفال' },
  scallop: { label: 'دائرة مموجة', aspect: 1, build: scallopCircle, keywords: 'ختم موج دائرة' },
  sun: { label: 'شمس', aspect: 1, build: sun, keywords: 'شمس أطفال' },
  book: { label: 'مصحف مفتوح', aspect: 1.5, build: book, keywords: 'كتاب مصحف قرآن' },
  arch: { label: 'قوس', aspect: 0.7, build: arch, keywords: 'قوس محراب نافذة' },
  ticket: { label: 'بطاقة', aspect: 2.4, build: ticket, keywords: 'بطاقة تذكرة' },
  crescent: { label: 'هلال', aspect: 1, build: crescent, keywords: 'هلال قمر' },
};

/** Clip outline for image frames (same geometry the painters use). */
export function frameClipPath(shape, w, h, radius = 0) {
  switch (shape) {
    case 'circle': return ellipsePath(w / 2, h / 2, w / 2, h / 2);
    case 'rounded': return rectPath(0, 0, w, h, Math.max(Number(radius) || 0, Math.min(w, h) * 0.12));
    case 'arch': return archPath(w, h);
    case 'hexagon': return roundedPolygonPath(polygonPoints(w, h, 6), Math.min(w, h) * 0.04);
    case 'star8': return star(w / 2, h / 2, Math.min(w, h) / 2, (Math.min(w, h) / 2) * 0.7654, 8);
    default: return rectPath(0, 0, w, h, radius);
  }
}

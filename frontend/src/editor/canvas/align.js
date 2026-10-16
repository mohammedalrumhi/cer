import { union } from './geometry';

/**
 * Align and distribute (port of Lawha). Groups move as one unit. A single unit aligns to the page,
 * several align to their combined bounds — Canva's behaviour.
 * @param {Array<{ id: string, groupId?: string|null }>} elements selected elements
 * @param {Map<string, import('./geometry').Box>} boxes element id → bounds
 */
function units(elements, boxes) {
  const byKey = new Map();
  for (const el of elements) {
    if (!boxes.get(el.id)) continue;
    const key = el.groupId || el.id;
    byKey.set(key, [...(byKey.get(key) || []), el]);
  }
  return [...byKey.values()].map((members) => ({ ids: members.map((m) => m.id), box: union(members.map((m) => boxes.get(m.id))) }));
}

/** @returns {Array<{ id: string, dx: number, dy: number }>} */
export function alignMoves(elements, boxes, mode, page, { toPage = false } = {}) {
  const us = units(elements, boxes);
  if (!us.length) return [];
  const ref = us.length === 1 || toPage ? { x: 0, y: 0, width: page.width, height: page.height } : union(us.map((u) => u.box));
  const moves = [];
  for (const u of us) {
    const b = u.box;
    let dx = 0;
    let dy = 0;
    if (mode === 'left') dx = ref.x - b.x;
    else if (mode === 'right') dx = ref.x + ref.width - (b.x + b.width);
    else if (mode === 'centerH') dx = ref.x + ref.width / 2 - (b.x + b.width / 2);
    else if (mode === 'top') dy = ref.y - b.y;
    else if (mode === 'bottom') dy = ref.y + ref.height - (b.y + b.height);
    else if (mode === 'middle') dy = ref.y + ref.height / 2 - (b.y + b.height / 2);
    if (dx || dy) for (const id of u.ids) moves.push({ id, dx, dy });
  }
  return moves;
}

/** Equal gaps between ≥ 3 units, keeping the two outermost in place. */
export function distributeMoves(elements, boxes, axis) {
  const us = units(elements, boxes);
  if (us.length < 3) return [];
  const pos = (b) => (axis === 'horizontal' ? b.x : b.y);
  const size = (b) => (axis === 'horizontal' ? b.width : b.height);
  const sorted = [...us].sort((a, b) => pos(a.box) - pos(b.box));
  const first = sorted[0].box;
  const last = sorted[sorted.length - 1].box;
  const span = pos(last) + size(last) - pos(first);
  const gap = (span - sorted.reduce((s, u) => s + size(u.box), 0)) / (sorted.length - 1);
  const moves = [];
  let cursor = pos(first) + size(first) + gap;
  for (const u of sorted.slice(1, -1)) {
    const d = cursor - pos(u.box);
    if (Math.abs(d) > 0.001) for (const id of u.ids) moves.push({ id, dx: axis === 'horizontal' ? d : 0, dy: axis === 'vertical' ? d : 0 });
    cursor += size(u.box) + gap;
  }
  return moves;
}

/** Ids to select when clicking an element: its whole group, if any. */
export function expandToGroups(ids, all) {
  const groups = new Set(all.filter((e) => ids.includes(e.id) && e.groupId).map((e) => e.groupId));
  return all.filter((e) => ids.includes(e.id) || (e.groupId && groups.has(e.groupId))).map((e) => e.id);
}

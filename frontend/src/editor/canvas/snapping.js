/**
 * Smart guides (port of Lawha's snapping): snap a moving box to page edges and centre, margins and
 * other elements; report guides and the gaps to the nearest neighbours as distance labels.
 */

export function collectTargets(page, others) {
  const targets = [
    { axis: 'x', value: 0, source: null },
    { axis: 'x', value: page.width / 2, source: null },
    { axis: 'x', value: page.width, source: null },
    { axis: 'y', value: 0, source: null },
    { axis: 'y', value: page.height / 2, source: null },
    { axis: 'y', value: page.height, source: null },
  ];
  const m = page.margins;
  if (m) {
    if (m.left > 0) targets.push({ axis: 'x', value: m.left, source: null });
    if (m.right > 0) targets.push({ axis: 'x', value: page.width - m.right, source: null });
    if (m.top > 0) targets.push({ axis: 'y', value: m.top, source: null });
    if (m.bottom > 0) targets.push({ axis: 'y', value: page.height - m.bottom, source: null });
  }
  for (const b of others) {
    targets.push(
      { axis: 'x', value: b.x, source: b },
      { axis: 'x', value: b.x + b.width / 2, source: b },
      { axis: 'x', value: b.x + b.width, source: b },
      { axis: 'y', value: b.y, source: b },
      { axis: 'y', value: b.y + b.height / 2, source: b },
      { axis: 'y', value: b.y + b.height, source: b },
    );
  }
  return targets;
}

const edges = (b, axis) => (axis === 'x' ? [b.x, b.x + b.width / 2, b.x + b.width] : [b.y, b.y + b.height / 2, b.y + b.height]);

function bestOffset(values, targets, axis, threshold) {
  let best = null;
  for (const t of targets) {
    if (t.axis !== axis) continue;
    for (const v of values) {
      const d = t.value - v;
      if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
  }
  return best ?? 0;
}

export function guidesFor(box, targets, page) {
  const guides = new Map();
  for (const axis of ['x', 'y']) {
    const values = edges(box, axis);
    for (const t of targets) {
      if (t.axis !== axis || !values.some((v) => Math.abs(v - t.value) < 0.5)) continue;
      const [bFrom, bTo] = axis === 'x' ? [box.y, box.y + box.height] : [box.x, box.x + box.width];
      const [sFrom, sTo] = t.source
        ? axis === 'x' ? [t.source.y, t.source.y + t.source.height] : [t.source.x, t.source.x + t.source.width]
        : [0, axis === 'x' ? page.height : page.width];
      const key = `${axis}:${Math.round(t.value * 2) / 2}`;
      const prev = guides.get(key);
      guides.set(key, {
        axis,
        value: t.value,
        from: Math.min(bFrom, sFrom, prev?.from ?? Infinity),
        to: Math.max(bTo, sTo, prev?.to ?? -Infinity),
      });
    }
  }
  return [...guides.values()];
}

export function distancesFor(box, others) {
  const out = [];
  const nearest = (candidates) => candidates.filter((c) => c.gap > 0.5).sort((a, b) => a.gap - b.gap)[0];
  const overlapY = others.filter((o) => o.y < box.y + box.height && box.y < o.y + o.height);
  const overlapX = others.filter((o) => o.x < box.x + box.width && box.x < o.x + o.width);
  const midY = (o) => (Math.max(box.y, o.y) + Math.min(box.y + box.height, o.y + o.height)) / 2;
  const midX = (o) => (Math.max(box.x, o.x) + Math.min(box.x + box.width, o.x + o.width)) / 2;
  const left = nearest(overlapY.map((o) => ({ gap: box.x - (o.x + o.width), other: o })));
  if (left) out.push({ axis: 'x', at: midY(left.other), from: left.other.x + left.other.width, to: box.x, distance: left.gap });
  const right = nearest(overlapY.map((o) => ({ gap: o.x - (box.x + box.width), other: o })));
  if (right) out.push({ axis: 'x', at: midY(right.other), from: box.x + box.width, to: right.other.x, distance: right.gap });
  const up = nearest(overlapX.map((o) => ({ gap: box.y - (o.y + o.height), other: o })));
  if (up) out.push({ axis: 'y', at: midX(up.other), from: up.other.y + up.other.height, to: box.y, distance: up.gap });
  const down = nearest(overlapX.map((o) => ({ gap: o.y - (box.y + box.height), other: o })));
  if (down) out.push({ axis: 'y', at: midX(down.other), from: box.y + box.height, to: down.other.y, distance: down.gap });
  return out;
}

/** Snap a moving box to the nearest targets within `threshold` page pixels. */
export function snapMove(box, targets, threshold, page, others = []) {
  const dx = bestOffset(edges(box, 'x'), targets, 'x', threshold);
  const dy = bestOffset(edges(box, 'y'), targets, 'y', threshold);
  const snapped = { ...box, x: box.x + dx, y: box.y + dy };
  return { dx, dy, guides: guidesFor(snapped, targets, page), distances: distancesFor(snapped, others) };
}

/** Snap a single point (resize anchor) on both axes. */
export function snapPoint(point, targets, threshold) {
  const dx = bestOffset([point.x], targets, 'x', threshold);
  const dy = bestOffset([point.y], targets, 'y', threshold);
  return {
    x: point.x + dx,
    y: point.y + dy,
    snappedX: dx !== 0 || targets.some((t) => t.axis === 'x' && t.value === point.x) ? point.x + dx : null,
    snappedY: dy !== 0 || targets.some((t) => t.axis === 'y' && t.value === point.y) ? point.y + dy : null,
  };
}

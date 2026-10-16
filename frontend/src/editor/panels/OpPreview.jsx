import { useMemo } from 'react';
import { elementToOp } from '@shared/render/index.js';

const NO_TEXT = { hasFont: () => false };

function svgPaint(resolved) {
  if (!resolved) return 'none';
  if (resolved.kind === 'solid') return resolved.color;
  return resolved.stops[Math.floor(resolved.stops.length / 2)]?.color || resolved.stops[0].color;
}

/** SVG thumbnail of a shape-like element, built by the same scene code the painters use. */
export function OpPreview({ element, size = 44, className }) {
  const op = useMemo(() => elementToOp({ ...element, id: 'preview', x: 0, y: 0, rotation: 0 }, { engine: NO_TEXT, registry: null, values: {}, digits: 'keep' }), [element]);
  if (!op || op.kind !== 'shape') return null;
  const pad = Math.max(op.width, op.height) * 0.06;
  const viewBox = `${-pad} ${-pad} ${op.width + pad * 2} ${op.height + pad * 2}`;
  return (
    <svg viewBox={viewBox} width={size} height={size} className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      {op.items.map((item, index) => (
        <path
          // Items are painted in order, like the canvas painter.
          key={index}
          d={item.d}
          fill={svgPaint(item.fill)}
          fillRule={item.evenOdd ? 'evenodd' : 'nonzero'}
          stroke={item.stroke || 'none'}
          strokeWidth={item.strokeWidth || 0}
          strokeLinecap={item.lineCap}
          strokeLinejoin={item.lineJoin}
          strokeDasharray={item.dash ? item.dash.join(' ') : undefined}
        />
      ))}
    </svg>
  );
}

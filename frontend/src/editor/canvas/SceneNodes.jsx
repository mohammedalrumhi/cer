import { memo, useEffect, useState } from 'react';
import { Image as KonvaImage, Line, Rect, Shape } from 'react-konva';
import { imageSourceUrl } from '../render/imageSource';
import { paintTextOp } from '../render/glyphPaint';

/*
 * Konva painters for scene ops (shared/render/scene.js). Every node is positioned at the element
 * origin and rotated around it, exactly like the PDF painter.
 */

const imageCache = new Map();

function useImage(src) {
  const [loaded, setLoaded] = useState({ src: '', image: null });

  useEffect(() => {
    if (!src || imageCache.has(src)) return undefined;
    let alive = true;
    const img = new window.Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      if (alive) setLoaded({ src, image: img });
    };
    img.onerror = () => { if (alive) setLoaded({ src, image: null }); };
    img.src = src;
    return () => { alive = false; };
  }, [src]);

  if (!src) return null;
  return imageCache.get(src) || (loaded.src === src ? loaded.image : null);
}

// Drag is handled by the page group (event delegation); this stable no-op only tells
// react-konva the position change is intentional.
const delegatedDrag = () => {};

function common(op, draggable) {
  return {
    id: op.id,
    name: 'element',
    x: op.x,
    y: op.y,
    rotation: op.rotation,
    opacity: op.opacity,
    draggable,
    onDragEnd: delegatedDrag,
  };
}

function TextNode({ op, engine, draggable }) {
  return (
    <Shape
      {...common(op, draggable)}
      width={op.width}
      height={op.height}
      // `fill` only feeds Konva's hit canvas; glyphs are painted by paintTextOp.
      fill={op.fill}
      perfectDrawEnabled={false}
      sceneFunc={(context) => paintTextOp(context._context, op, engine)}
      hitFunc={(context, shape) => {
        context.beginPath();
        context.rect(0, 0, op.width, op.height);
        context.closePath();
        context.fillShape(shape);
      }}
    />
  );
}

function RectNode({ op, draggable }) {
  return (
    <Rect
      {...common(op, draggable)}
      width={op.width}
      height={op.height}
      fill={op.fill || undefined}
      stroke={op.stroke || undefined}
      strokeWidth={op.stroke ? op.strokeWidth : 0}
      cornerRadius={op.cornerRadius}
      hitStrokeWidth={Math.max(12, op.strokeWidth)}
      perfectDrawEnabled={false}
    />
  );
}

function EllipseNode({ op, draggable }) {
  return (
    <Shape
      {...common(op, draggable)}
      width={op.width}
      height={op.height}
      fill={op.fill || undefined}
      stroke={op.stroke || undefined}
      strokeWidth={op.stroke ? op.strokeWidth : 0}
      hitStrokeWidth={Math.max(12, op.strokeWidth)}
      perfectDrawEnabled={false}
      sceneFunc={(context, shape) => {
        context.beginPath();
        context.ellipse(op.width / 2, op.height / 2, op.width / 2, op.height / 2, 0, 0, Math.PI * 2);
        context.closePath();
        context.fillStrokeShape(shape);
      }}
    />
  );
}

function LineNode({ op, draggable }) {
  return (
    <Line
      {...common(op, draggable)}
      points={[0, 0, op.width, 0]}
      stroke={op.stroke}
      strokeWidth={op.strokeWidth}
      hitStrokeWidth={Math.max(14, op.strokeWidth)}
      perfectDrawEnabled={false}
    />
  );
}

function ImageNode({ op, branding, draggable }) {
  const image = useImage(imageSourceUrl(op.source, branding));
  if (!image) {
    return (
      <Rect
        {...common(op, draggable)}
        width={op.width}
        height={op.height}
        stroke="#94a3b8"
        strokeWidth={1}
        dash={[6, 4]}
        fill="rgba(148,163,184,0.08)"
      />
    );
  }
  return <KonvaImage {...common(op, draggable)} width={op.width} height={op.height} image={image} />;
}

/** One scene op. Memoised on the op object, which the scene cache keeps stable per element. */
export const SceneNode = memo(function SceneNode({ op, engine, branding, draggable }) {
  switch (op.kind) {
    case 'text': return <TextNode op={op} engine={engine} draggable={draggable} />;
    case 'rect': return <RectNode op={op} draggable={draggable} />;
    case 'ellipse': return <EllipseNode op={op} draggable={draggable} />;
    case 'line': return <LineNode op={op} draggable={draggable} />;
    case 'image': return <ImageNode op={op} branding={branding} draggable={draggable} />;
    default: return null;
  }
});

export function BackgroundImage({ src, width, height }) {
  const image = useImage(src);
  return image ? <KonvaImage image={image} x={0} y={0} width={width} height={height} listening={false} /> : null;
}

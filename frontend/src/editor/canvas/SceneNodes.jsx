import { memo } from 'react';
import { Group, Image as KonvaImage, Rect, Shape, Text } from 'react-konva';
import { filteredImage, imageSourceUrl } from '../render/imageSource';
import { useImage } from '../render/useImage';
import { canvasPaint, paintImageOp, paintShapeOp, paintTextOp, path2D } from '../render/paintOps';

/*
 * Konva nodes for scene ops (shared/render/scene.js). Each op is one Konva Shape positioned at
 * the element origin; its sceneFunc calls the shared canvas painter (render/paintOps.js), which
 * mirrors the PDF painter. Konva only provides hit testing, selection and transforms.
 */

function nodeProps(op) {
  return {
    id: op.id,
    name: 'element',
    x: op.x,
    y: op.y,
    rotation: op.rotation,
    opacity: op.opacity,
    width: op.width,
    height: op.height,
    offsetY: op.originY || 0,
    perfectDrawEnabled: false,
  };
}

/** The whole box is clickable (not only painted pixels), like Canva. Lines get a fat band. */
function boxHit(op) {
  return (context, shape) => {
    context.beginPath();
    const pad = op.originY ? Math.max(0, 7 - op.height / 2) : 0;
    context.rect(0, -pad, op.width, op.height + pad * 2);
    context.closePath();
    context.fillShape(shape);
  };
}

/** Shapes with no fill (frames, outlines) are clickable only along their strokes, so they don't block the page. */
function strokeHit(op) {
  return (context, shape) => {
    const ctx = context._context;
    ctx.strokeStyle = shape.colorKey;
    ctx.lineJoin = 'round';
    for (const item of op.items) {
      if (!item.d) continue;
      ctx.lineWidth = Math.max(12, (item.strokeWidth || 0) + 8);
      ctx.stroke(path2D(item.d));
    }
  };
}

function ShapeNode({ op }) {
  const outlineOnly = op.items.length > 0 && op.items.every((item) => !item.fill) && !op.originY;
  return <Shape {...nodeProps(op)} fill="#000" sceneFunc={(context) => paintShapeOp(context._context, op)} hitFunc={outlineOnly ? strokeHit(op) : boxHit(op)} />;
}

function TextNode({ op, engine }) {
  return <Shape {...nodeProps(op)} fill="#000" sceneFunc={(context) => paintTextOp(context._context, op, engine)} hitFunc={boxHit(op)} />;
}

function FramePlaceholder({ op }) {
  // Editor-only hint for an empty frame; it is named "ui-placeholder" so exports hide it.
  return (
    <Group {...nodeProps(op)}>
      <Shape
        width={op.width}
        height={op.height}
        sceneFunc={(context) => {
          const ctx = context._context;
          ctx.save();
          ctx.clip(new Path2D(op.clipD || `M0 0H${op.width}V${op.height}H0Z`));
          ctx.fillStyle = 'rgba(15,107,82,0.08)';
          ctx.fillRect(0, 0, op.width, op.height);
          ctx.restore();
          ctx.setLineDash([8, 6]);
          ctx.strokeStyle = 'rgba(15,107,82,0.55)';
          ctx.lineWidth = 2;
          ctx.stroke(new Path2D(op.clipD || `M0 0H${op.width}V${op.height}H0Z`));
        }}
        hitFunc={boxHit(op)}
        fill="#000"
        name="ui-placeholder"
      />
      <Text name="ui-placeholder" width={op.width} height={op.height} align="center" verticalAlign="middle" text="⊕" fontSize={Math.max(18, Math.min(op.width, op.height) / 5)} fill="rgba(15,107,82,0.6)" listening={false} />
    </Group>
  );
}

function ImageNode({ op, branding }) {
  const url = imageSourceUrl(op.source, branding);
  const image = useImage(url);
  if (op.placeholder) return <FramePlaceholder op={op} />;
  if (!image) {
    return <Rect {...nodeProps(op)} stroke="#94a3b8" strokeWidth={1} dash={[6, 4]} fill="rgba(148,163,184,0.08)" name="element" />;
  }
  const source = filteredImage(image, url, op.filters);
  return <Shape {...nodeProps(op)} fill="#000" sceneFunc={(context) => paintImageOp(context._context, op, source)} hitFunc={boxHit(op)} />;
}

/** One scene op. Memoised on the op object, which the scene cache keeps stable per element. */
export const SceneNode = memo(function SceneNode({ op, engine, branding }) {
  switch (op.kind) {
    case 'text': return <TextNode op={op} engine={engine} />;
    case 'shape': return <ShapeNode op={op} />;
    case 'image': return <ImageNode op={op} branding={branding} />;
    default: return null;
  }
});

export function BackgroundImage({ src, width, height, opacity = 1 }) {
  const image = useImage(src);
  return image ? <KonvaImage name="page-background-image" image={image} x={0} y={0} width={width} height={height} opacity={opacity} listening={false} /> : null;
}

/** Page background paint (solid or gradient) drawn with the shared painter. */
export function BackgroundFill({ scene }) {
  return (
    <Shape
      name="page-background"
      width={scene.width}
      height={scene.height}
      listening={false}
      sceneFunc={(context) => {
        const ctx = context._context;
        ctx.fillStyle = canvasPaint(ctx, scene.background.fill) || '#ffffff';
        ctx.fillRect(0, 0, scene.width, scene.height);
      }}
    />
  );
}

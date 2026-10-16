import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import { imageDrawRect } from '@shared/render/index.js';
import { imageSourceUrl } from '../render/imageSource';
import { useImage } from '../render/useImage';
import { useEditorStoreApi } from '../store/EditorStoreContext';
import { clampCover, cropFromRect } from './crop';

/**
 * Crop mode (port of Lawha): the full image is shown dimmed behind the element box and can be
 * dragged or scaled (corners keep the ratio); the box stays put. Enter or a click outside applies;
 * Escape cancels. Coordinates are element-local (the group sits at the element origin, rotated).
 */
export default function CropOverlay({ element, op, branding, zoom }) {
  const store = useEditorStoreApi();
  const image = useImage(imageSourceUrl(op.source, branding));
  const imageRef = useRef(null);
  const trRef = useRef(null);
  const [override, setOverride] = useState(null);
  const rectRef = useRef(null);
  const w = op.width;
  const h = op.height;
  const initial = useMemo(() => {
    if (!image) return null;
    const drawn = imageDrawRect({ ...op, crop: element.crop || null }, image.naturalWidth, image.naturalHeight);
    return clampCover({ x: drawn.x, y: drawn.y, width: drawn.width, height: drawn.height }, w, h);
  }, [image, op, element.crop, w, h]);
  const rect = override || initial;
  useEffect(() => { rectRef.current = rect; }, [rect]);

  useEffect(() => {
    if (imageRef.current && trRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [rect]);

  // Apply on unmount (click outside / Enter); Escape sets cropCancelled first.
  useEffect(() => () => {
    const state = store.getState();
    if (state.ui.cropCancelled) {
      state.setUi({ cropCancelled: false });
      return;
    }
    const r = rectRef.current;
    if (r) state.updateElement(element.id, { crop: cropFromRect(r, w, h), fit: 'cover' }, { label: 'قص الصورة' });
  }, [store, element.id, w, h]);

  if (!image || !rect) return null;
  const update = (next) => setOverride(next);
  const clip = (ctx) => {
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.closePath();
  };

  return (
    <Group x={op.x} y={op.y} rotation={op.rotation}>
      <KonvaImage
        ref={imageRef}
        image={image}
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        opacity={0.35}
        draggable
        onDragMove={(event) => {
          const next = clampCover({ ...rect, x: event.target.x(), y: event.target.y() }, w, h);
          event.target.position({ x: next.x, y: next.y });
          update(next);
        }}
        onTransformEnd={(event) => {
          const node = event.target;
          const next = clampCover({ x: node.x(), y: node.y(), width: node.width() * node.scaleX(), height: node.height() * node.scaleY() }, w, h);
          node.setAttrs({ scaleX: 1, scaleY: 1, x: next.x, y: next.y, width: next.width, height: next.height });
          update(next);
        }}
      />
      <Group clipFunc={clip} listening={false}>
        <KonvaImage image={image} x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
      </Group>
      <Rect width={w} height={h} stroke="#0f9d74" strokeWidth={2 / zoom} dash={[6 / zoom, 4 / zoom]} listening={false} />
      <Transformer ref={trRef} rotateEnabled={false} keepRatio enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} anchorSize={10} anchorStroke="#0f9d74" borderStroke="#0f9d74" borderDash={[4, 4]} flipEnabled={false} />
    </Group>
  );
}

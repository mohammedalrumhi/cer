import { useEffect, useRef, useState } from 'react';
import {
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva';
import {
  getRecipientAchievementSentenceForTemplate,
  getRecipientTitleForTemplate,
} from '../../utils/templateMetadata';

/* ── Hijri date preview helper ───────────────────────────────────────── */
function getHijriDate() {
  try {
    const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-arab', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    const year = get('year').replace(/\s*هـ?$/, '').trim();
    return `${get('day')} / ${get('month')} / ${year} هـ`;
  } catch {
    return new Date().toLocaleDateString('ar');
  }
}

function getDynamicPreview(el, template) {
  if (el.type !== 'dynamicText') return el.text || '';
  switch (el.field) {
    case 'recipientAchievementSentence':
      return getRecipientAchievementSentenceForTemplate(template, 'محمد الحرملي');
    case 'recipientTitle': return getRecipientTitleForTemplate(template, 'محمد الحرملي');
    case 'studentName': return 'اسم الطالب';
    case 'date': return getHijriDate();
    case 'dateLabel': return 'تاريخ الإصدار: ' + getHijriDate();
    case 'recitalType': return 'نوع الاستظهار';
    case 'surahRange': return 'من سورة إلى سورة';
    case 'programName': return 'اسم البرنامج';
    case 'calendar': return 'التقويم';
    case 'mistakesCount': return 'عدد الأخطاء';
    case 'teacherName': return 'المعلم';
    case 'schoolName': return 'اسم المدرسة';
    default: return el.field || '';
  }
}

/* ── per-element image loader ─────────────────────────────────────────── */
function useImg(src) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    if (!src) {
      const t = setTimeout(() => setImg(null), 0);
      return () => clearTimeout(t);
    }
    let alive = true;
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => { if (alive) setImg(i); };
    i.onerror = () => {};
    i.src = src;
    return () => { alive = false; };
  }, [src]);
  return img;
}

function toCssFontStyle(fontStyle) {
  const value = String(fontStyle || 'normal').toLowerCase();
  const italic = value.includes('italic') ? 'italic' : 'normal';
  const weight = value.includes('bold') ? '700' : '400';
  return { italic, weight };
}

function measureTextWidth(text, el) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return Math.max(60, Number(el.width) || 200);

  const fontSize = Number(el.fontSize) || 28;
  const { italic, weight } = toCssFontStyle(el.fontStyle);
  const fontFamily = el.fontFamily || 'Amiri-Regular';
  ctx.font = `${italic} ${weight} ${fontSize}px "${fontFamily}"`;

  const lines = String(text || '').split('\n');
  const letterSpacing = Number(el.letterSpacing) || 0;
  const measured = lines.reduce((max, line) => {
    const base = ctx.measureText(line).width;
    const spacing = Math.max(0, line.length - 1) * letterSpacing;
    return Math.max(max, base + spacing);
  }, 0);

  return Math.max(60, Math.ceil(measured + 16));
}

/* ── individual element components ───────────────────────────────────── */
function TextEl({ el, template, isSelected, onSelect, onDragEnd, onTransformEnd, onStartEdit }) {
  return (
    <Text
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width || 200}
      text={getDynamicPreview(el, template)}
      fontSize={el.fontSize || 28}
      fontFamily={el.fontFamily || 'Amiri-Regular'}
      fontStyle={el.fontStyle || 'normal'}
      textDecoration={el.textDecoration || ''}
      fill={el.fill || '#0f172a'}
      align={el.align || 'center'}
      lineHeight={el.lineHeight || 1.4}
      letterSpacing={el.letterSpacing || 0}
      rotation={el.rotation || 0}
      opacity={el.opacity ?? 1}
      visible={el.visible !== false}
      draggable={!el.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      onDblClick={() => onStartEdit?.(el)}
      onDblTap={() => onStartEdit?.(el)}
      stroke={isSelected ? '#10b981' : undefined}
      strokeWidth={isSelected ? 0.5 : 0}
    />
  );
}

function RectEl({ el, onSelect, onDragEnd, onTransformEnd }) {
  return (
    <Rect
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width || 150}
      height={el.height || 100}
      fill={el.fill || '#e2e8f0'}
      stroke={el.stroke || '#94a3b8'}
      strokeWidth={el.strokeWidth ?? 2}
      cornerRadius={el.cornerRadius ?? 0}
      rotation={el.rotation || 0}
      opacity={el.opacity ?? 1}
      visible={el.visible !== false}
      draggable={!el.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

function CircleEl({ el, onSelect, onDragEnd, onTransformEnd }) {
  const rx = (el.width || 100) / 2;
  const ry = (el.height || 100) / 2;
  return (
    <Rect
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width || 100}
      height={el.height || 100}
      cornerRadius={Math.min(rx, ry)}
      fill={el.fill || '#e2e8f0'}
      stroke={el.stroke || '#94a3b8'}
      strokeWidth={el.strokeWidth ?? 2}
      rotation={el.rotation || 0}
      opacity={el.opacity ?? 1}
      visible={el.visible !== false}
      draggable={!el.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

function LineEl({ el, onSelect, onDragEnd }) {
  return (
    <Line
      id={el.id}
      x={el.x}
      y={el.y}
      points={[0, 0, el.width || 200, 0]}
      stroke={el.stroke || '#0f172a'}
      strokeWidth={el.strokeWidth ?? 3}
      rotation={el.rotation || 0}
      opacity={el.opacity ?? 1}
      visible={el.visible !== false}
      draggable={!el.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      hitStrokeWidth={12}
    />
  );
}

function ImageEl({ el, image, onSelect, onDragEnd, onTransformEnd }) {
  const isDynamic = el.type === 'dynamicImage';
  const dynamicDefaults = el.field === 'signature'
    ? { width: 113, height: 60 }
    : { width: 113, height: 113 };
  const width = el.width || (isDynamic ? dynamicDefaults.width : 120);
  const height = el.height || (isDynamic ? dynamicDefaults.height : 80);

  if (!image) {
    return (
      <Rect
        id={el.id}
        x={el.x}
        y={el.y}
        width={width}
        height={height}
        fillEnabled={false}
        stroke="#94a3b8"
        strokeWidth={1}
        dash={[6, 4]}
        rotation={el.rotation || 0}
        opacity={el.opacity ?? 1}
        visible={el.visible !== false}
        draggable={!el.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      />
    );
  }
  return (
    <KonvaImage
      id={el.id}
      x={el.x}
      y={el.y}
      width={width}
      height={height}
      image={image}
      rotation={el.rotation || 0}
      opacity={el.opacity ?? 1}
      visible={el.visible !== false}
      draggable={!el.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

/* Separate component so the image-load hook can run per element */
function DynamicImageEl({ el, logoImg, signatureImg, stampImg, onSelect, onDragEnd, onTransformEnd }) {
  const image = el.field === 'signature' ? signatureImg : el.field === 'stamp' ? stampImg : logoImg;
  return (
    <ImageEl
      el={el}
      image={image}
      onSelect={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

function UploadedImageEl({ el, onSelect, onDragEnd, onTransformEnd }) {
  const img = useImg(el.src);
  return (
    <ImageEl
      el={el}
      image={img}
      onSelect={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

/* ── Grid overlay ─────────────────────────────────────────────────────── */
function GridLayer({ width, height, step = 40, color = '#e2e8f0' }) {
  const lines = [];
  for (let x = 0; x <= width; x += step) {
    lines.push(<Line key={`v${x}`} points={[x, 0, x, height]} stroke={color} strokeWidth={0.5} listening={false} />);
  }
  for (let y = 0; y <= height; y += step) {
    lines.push(<Line key={`h${y}`} points={[0, y, width, y]} stroke={color} strokeWidth={0.5} listening={false} />);
  }
  return <>{lines}</>;
}

/* ── Context menu ─────────────────────────────────────────────────────── */
function ContextMenu({ menu, onAction, onClose }) {
  useEffect(() => {
    const h = () => onClose();
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [onClose]);

  if (!menu.visible) return null;
  const items = [
    { label: 'إلى المقدمة', action: 'bringToFront' },
    { label: 'للأمام', action: 'bringForward' },
    { label: 'للخلف', action: 'sendBackward' },
    { label: 'إلى الخلفية', action: 'sendToBack' },
    null,
    { label: 'تكرار', action: 'duplicate' },
    { label: 'حذف', action: 'delete', danger: true },
  ];
  return (
    <div
      style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 1000, direction: 'rtl' }}
      className="min-w-35 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={i} className="my-1 border-t border-slate-100" />
        ) : (
          <button
            key={item.action}
            onClick={() => { onAction(item.action); onClose(); }}
            className={`block w-full px-4 py-2 text-right text-sm hover:bg-slate-50 ${item.danger ? 'text-rose-600' : 'text-slate-700'}`}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

/* ── Main CanvasStage ─────────────────────────────────────────────────── */
export default function CanvasStage({
  stageRef,
  template,
  backgroundImageSrc,
  elements,
  selectedIds,
  tool,
  zoom,
  showGrid,
  logoImg,
  signatureImg,
  stampImg,
  isPanMode,
  onSelectIds,
  onElementChange,
  onAddElement,
  onContextAction,
}) {
  const trRef = useRef();
  const layerRef = useRef();
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0 });
  const [editing, setEditing] = useState(null);

  function closeEditor() {
    setEditing(null);
  }

  function startTextEdit(el) {
    if (!el || el.type !== 'text') return;
    const stage = stageRef?.current;
    if (!stage) return;

    const stageRect = stage.container().getBoundingClientRect();
    const scaledX = (Number(el.x) || 0) * zoom;
    const scaledY = (Number(el.y) || 0) * zoom;
    const width = Math.max(80, (Number(el.width) || 200) * zoom);
    const fontSize = (Number(el.fontSize) || 28) * zoom;
    const lineHeight = Number(el.lineHeight) || 1.4;
    const { italic, weight } = toCssFontStyle(el.fontStyle);

    setEditing({
      id: el.id,
      value: String(el.text || ''),
      left: stageRect.left + scaledX,
      top: stageRect.top + scaledY,
      width,
      fontSize,
      lineHeight,
      color: el.fill || '#0f172a',
      align: el.align || 'center',
      fontFamily: el.fontFamily || 'Amiri-Regular',
      italic,
      weight,
    });
  }

  function commitTextEdit(save) {
    if (!editing) return;

    if (!save) {
      closeEditor();
      return;
    }

    const el = elements.find((item) => item.id === editing.id);
    if (!el || el.type !== 'text') {
      closeEditor();
      return;
    }

    const nextText = editing.value;
    const oldWidth = Number(el.width) || 200;
    const nextWidth = measureTextWidth(nextText, el);
    const diff = nextWidth - oldWidth;
    let nextX = Number(el.x) || 0;
    const growDirection = el.growDirection || 'right';

    if (growDirection === 'left') {
      nextX -= diff;
    } else if (growDirection === 'center') {
      nextX -= diff / 2;
    }

    onElementChange(el.id, {
      text: nextText,
      width: nextWidth,
      x: Math.round(nextX),
    });
    closeEditor();
  }

  /* attach Transformer to selected nodes */
  useEffect(() => {
    if (!trRef.current || !layerRef.current) return;
    const nodes = selectedIds
      .map((id) => layerRef.current.findOne(`#${id}`))
      .filter(Boolean);
    trRef.current.nodes(nodes);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedIds, elements]);

  const w = template.width || 1123;
  const h = template.height || 794;
  const bg = template.background?.color || '#f8f4ea';
  const backgroundImage = useImg(backgroundImageSrc);

  function getRelPos(e) {
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();

    // getRelativePointerPosition() already returns coordinates in stage space
    // (it accounts for current stage transforms like zoom/scale).
    // Dividing by zoom again shifts inserted elements away from mouse position.
    return { x: pos.x, y: pos.y };
  }

  function handleStageClick(e) {
    if (isPanMode) return;
    if (editing) commitTextEdit(true);

    if (tool === 'select') {
      if (e.target !== e.target.getStage()) return;
      onSelectIds([]);
      return;
    }

    const { x, y } = getRelPos(e);
    const created = onAddElement(tool, { x, y });

    if (tool === 'text' && created) {
      setTimeout(() => {
        startTextEdit(created);
      }, 0);
    }
  }



  function makeHandlers(el) {
    return {
      onSelect: (e) => {
        if (isPanMode) return;
        if (editing) commitTextEdit(true);

        if (tool !== 'select') {
          // In insertion mode, let the click bubble to the stage so the new
          // element can be placed even when clicking over an existing object.
          return;
        }

        e.cancelBubble = true;
        if (e.evt?.shiftKey) {
          onSelectIds(selectedIds.includes(el.id)
            ? selectedIds.filter((s) => s !== el.id)
            : [...selectedIds, el.id]);
        } else {
          onSelectIds([el.id]);
        }
      },
      onDragEnd: (e) => {
        onElementChange(el.id, { x: e.target.x(), y: e.target.y() });
      },
      onTransformEnd: (e) => {
        const node = e.target;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onElementChange(el.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * sx),
          height: Math.max(5, (node.height() || 50) * sy),
          rotation: node.rotation(),
        });
      },
    };
  }

  return (
    <>
      <Stage
        ref={stageRef}
        width={w * zoom}
        height={h * zoom}
        scaleX={zoom}
        scaleY={zoom}
        onClick={handleStageClick}
        style={{ background: bg }}
      >
        <Layer ref={layerRef}>
          {/* Canvas background */}
          <Rect x={0} y={0} width={w} height={h} fill={bg} listening={false} />
          {backgroundImage && (
            <KonvaImage x={0} y={0} width={w} height={h} image={backgroundImage} listening={false} />
          )}

          {/* Grid */}
          {showGrid && <GridLayer width={w} height={h} />}

          {/* Elements */}
          {elements.map((el) => {
            const handlers = makeHandlers(el);
            const isSelected = selectedIds.includes(el.id);

            if (el.type === 'text' || el.type === 'dynamicText') {
              return (
                <TextEl
                  key={el.id}
                  el={el}
                  template={template}
                  isSelected={isSelected}
                  {...handlers}
                  onStartEdit={startTextEdit}
                  onTransformEnd={handlers.onTransformEnd}
                />
              );
            }
            if (el.type === 'rect') {
              return <RectEl key={el.id} el={el} {...handlers} />;
            }
            if (el.type === 'circle') {
              return <CircleEl key={el.id} el={el} {...handlers} />;
            }
            if (el.type === 'line') {
              return <LineEl key={el.id} el={el} {...handlers} />;
            }
            if (el.type === 'dynamicImage') {
              return (
                <DynamicImageEl
                  key={el.id}
                  el={el}
                  logoImg={logoImg}
                  signatureImg={signatureImg}
                  stampImg={stampImg}
                  {...handlers}
                />
              );
            }
            if (el.type === 'image') {
              return <UploadedImageEl key={el.id} el={el} {...handlers} />;
            }
            return null;
          })}

          {/* Transformer */}
          <Transformer
            ref={trRef}
            rotateEnabled
            keepRatio={false}
            enabledAnchors={[
              'top-left', 'top-center', 'top-right',
              'middle-left', 'middle-right',
              'bottom-left', 'bottom-center', 'bottom-right',
            ]}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
            }
          />
        </Layer>
      </Stage>

      <ContextMenu
        menu={menu}
        onAction={(action) => {
          if (selectedIds.length > 0) onContextAction(action, selectedIds[0]);
        }}
        onClose={() => setMenu((m) => ({ ...m, visible: false }))}
      />

      {editing && (
        <textarea
          autoFocus
          value={editing.value}
          onChange={(e) => setEditing((prev) => prev ? { ...prev, value: e.target.value } : prev)}
          onBlur={() => commitTextEdit(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              commitTextEdit(false);
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitTextEdit(true);
            }
          }}
          style={{
            position: 'fixed',
            left: editing.left,
            top: editing.top,
            width: editing.width,
            minHeight: editing.fontSize * 1.8,
            zIndex: 1100,
            fontFamily: `"${editing.fontFamily}"`,
            fontSize: editing.fontSize,
            lineHeight: editing.lineHeight,
            color: editing.color,
            textAlign: editing.align,
            fontStyle: editing.italic,
            fontWeight: editing.weight,
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '6px 8px',
            outline: 'none',
            resize: 'none',
            direction: 'rtl',
          }}
        />
      )}
    </>
  );
}

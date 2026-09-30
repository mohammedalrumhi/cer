import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Layer, Line, Rect, Stage, Transformer } from 'react-konva';
import { buildAssetUrl } from '../../api/client';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';
import { createElementAt, isTextElement } from '../model/elements';
import { BackgroundImage, SceneNode } from './SceneNodes';
import { useSceneOps } from './useSceneOps';
import ContextMenu from './ContextMenu';
import TextEditOverlay from './TextEditOverlay';

const WHEEL_ZOOM_SPEED = 0.0025;
const SIDE_ANCHORS = new Set(['middle-left', 'middle-right']);

function GridLines({ width, height, step = 40 }) {
  const lines = [];
  for (let x = step; x < width; x += step) lines.push(<Line key={`v${x}`} points={[x, 0, x, height]} stroke="#94a3b8" strokeWidth={0.5} opacity={0.35} listening={false} />);
  for (let y = step; y < height; y += step) lines.push(<Line key={`h${y}`} points={[0, y, width, y]} stroke="#94a3b8" strokeWidth={0.5} opacity={0.35} listening={false} />);
  return lines;
}

/**
 * Editor canvas: a full-viewport Stage. The page lives in a Group transformed by the viewport
 * (zoom + pan); UI chrome (transformer) sits in an unscaled layer so handles keep their size.
 */
export default function Canvas({ stageRef, branding, onInsertText }) {
  const store = useEditorStoreApi();
  const containerRef = useRef(null);
  const trRef = useRef(null);
  const pageRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const fittedRef = useRef(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const [menu, setMenu] = useState(null);

  const document = useEditor((state) => state.document);
  const selectedIds = useEditor((state) => state.selection.ids);
  const viewport = useEditor((state) => state.viewport);
  const tool = useEditor((state) => state.ui.tool);
  const showGrid = useEditor((state) => state.ui.showGrid);
  const editingTextId = useEditor((state) => state.ui.editingTextId);
  const { ops, engine, ready } = useSceneOps(document, branding);
  // Every text op laid out means fonts are loaded; tests wait on this (data-scene-ready).
  const sceneReady = ready && ops.every((op) => op.kind !== 'text' || !op.text || op.layout);

  const elementsById = useMemo(() => new Map(document.elements.map((el) => [el.id, el])), [document.elements]);
  const width = Number(document.width) || 1123;
  const height = Number(document.height) || 794;

  /* ── viewport size + initial fit ─────────────────────────────── */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      store.getState().setViewport({ width: w, height: h });
      if (!fittedRef.current && w > 0 && h > 0) {
        fittedRef.current = true;
        store.getState().zoomToFit(null, { maxZoom: 1 });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [store]);

  /* ── space-to-pan ────────────────────────────────────────────── */
  useEffect(() => {
    const isTyping = (event) => /^(input|textarea|select)$/i.test(event.target?.tagName || '') || event.target?.isContentEditable;
    const down = (event) => {
      if (event.code === 'Space' && !isTyping(event)) {
        event.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (event) => { if (event.code === 'Space') setSpaceDown(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  /* ── transformer follows selection ───────────────────────────── */
  const selectedEditable = selectedIds.filter((id) => elementsById.get(id) && !elementsById.get(id).locked);
  useEffect(() => {
    const transformer = trRef.current;
    const page = pageRef.current;
    if (!transformer || !page) return;
    const nodes = selectedEditable.map((id) => page.findOne(`#${id}`)).filter(Boolean);
    transformer.nodes(editingTextId ? [] : nodes);
    transformer.getLayer()?.batchDraw();
  });

  const selectionTypes = selectedEditable.map((id) => elementsById.get(id)?.type);
  const onlyLines = selectionTypes.length > 0 && selectionTypes.every((type) => type === 'line');
  const keepRatio = selectionTypes.length > 0 && selectionTypes.every((type) => type === 'image' || type === 'dynamicImage' || isTextElement({ type }));

  /* ── coordinates ─────────────────────────────────────────────── */
  const toDocument = useCallback((point) => {
    const { zoom, x, y } = store.getState().viewport;
    return { x: (point.x - x) / zoom, y: (point.y - y) / zoom };
  }, [store]);

  function elementIdFromTarget(target) {
    let node = target;
    while (node && node !== pageRef.current) {
      if (node.name() === 'element') return node.id();
      node = node.getParent();
    }
    return null;
  }

  /* ── pointer: select / insert / pan ──────────────────────────── */
  function handlePointerDown(event) {
    const stage = event.target.getStage();
    const pointer = stage.getPointerPosition();
    setMenu(null);

    if (spaceDown || event.evt.button === 1) {
      const { x, y } = store.getState().viewport;
      panRef.current = { startX: pointer.x, startY: pointer.y, x, y };
      setPanning(true);
      return;
    }
    if (event.evt.button === 2) return;

    const state = store.getState();
    if (state.ui.editingTextId) return;

    if (state.ui.tool !== 'select') {
      const element = createElementAt(state.ui.tool, toDocument(pointer));
      state.addElements([element]);
      state.setUi({ tool: 'select' });
      if (element.type === 'text') onInsertText?.(element.id);
      return;
    }

    const id = elementIdFromTarget(event.target);
    const shift = event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey;
    if (id) {
      if (shift) state.toggleSelect(id);
      else if (!state.selection.ids.includes(id)) state.select([id]);
      return;
    }
    // Clicking the transformer itself keeps the selection.
    if (event.target.getParent()?.className === 'Transformer') return;
    if (!shift) state.clearSelection();
  }

  function handlePointerMove() {
    const pan = panRef.current;
    if (!pan) return;
    const pointer = stageRef.current.getPointerPosition();
    store.getState().setViewport({ x: pan.x + pointer.x - pan.startX, y: pan.y + pointer.y - pan.startY });
  }

  function handlePointerUp() {
    if (!panRef.current) return;
    panRef.current = null;
    setPanning(false);
  }

  function handleWheel(event) {
    event.evt.preventDefault();
    const state = store.getState();
    const { deltaX, deltaY, ctrlKey, metaKey } = event.evt;
    if (ctrlKey || metaKey) {
      const pointer = stageRef.current.getPointerPosition();
      state.zoomTo(state.viewport.zoom * Math.exp(-deltaY * WHEEL_ZOOM_SPEED * (ctrlKey && !metaKey ? 4 : 1)), pointer);
    } else {
      state.setViewport({ x: state.viewport.x - deltaX, y: state.viewport.y - deltaY });
    }
  }

  function handleDoubleClick(event) {
    const id = elementIdFromTarget(event.target);
    const element = id && elementsById.get(id);
    if (element?.type === 'text' && !element.locked) onInsertText?.(id);
  }

  function handleContextMenu(event) {
    event.evt.preventDefault();
    const id = elementIdFromTarget(event.target);
    const state = store.getState();
    if (id && !state.selection.ids.includes(id)) state.select([id]);
    const rect = containerRef.current.getBoundingClientRect();
    const pointer = stageRef.current.getPointerPosition();
    setMenu({ x: rect.left + pointer.x, y: rect.top + pointer.y, hasSelection: Boolean(id) || state.selection.ids.length > 0 });
  }

  /* ── dragging (moves every selected element together) ───────── */
  function handleDragStart(event) {
    const id = elementIdFromTarget(event.target);
    if (!id) return;
    const state = store.getState();
    const ids = state.selection.ids.includes(id) ? state.selection.ids : [id];
    const page = pageRef.current;
    dragRef.current = {
      id,
      origin: { x: event.target.x(), y: event.target.y() },
      nodes: ids.map((itemId) => page.findOne(`#${itemId}`)).filter(Boolean).map((node) => ({ node, x: node.x(), y: node.y() })),
    };
    state.beginTransaction('تحريك');
  }

  function handleDragMove(event) {
    const drag = dragRef.current;
    if (!drag || event.target.id() !== drag.id) return;
    const dx = event.target.x() - drag.origin.x;
    const dy = event.target.y() - drag.origin.y;
    for (const item of drag.nodes) {
      if (item.node !== event.target) item.node.position({ x: item.x + dx, y: item.y + dy });
    }
  }

  function handleDragEnd(event) {
    const drag = dragRef.current;
    if (!drag || event.target.id() !== drag.id) return;
    dragRef.current = null;
    const state = store.getState();
    const positions = new Map(drag.nodes.map(({ node }) => [node.id(), { x: Math.round(node.x() * 100) / 100, y: Math.round(node.y() * 100) / 100 }]));
    state.updateElements([...positions.keys()], (element) => ({ ...element, ...positions.get(element.id) }));
    state.commitTransaction();
  }

  /* ── transforming ────────────────────────────────────────────── */
  function handleTransformStart() {
    store.getState().beginTransaction('تحويل');
  }

  function handleTransform() {
    // Side handles on text change the wrap width live instead of stretching glyphs.
    const transformer = trRef.current;
    if (!SIDE_ANCHORS.has(transformer.getActiveAnchor())) return;
    const state = store.getState();
    for (const node of transformer.nodes()) {
      const element = elementsById.get(node.id());
      if (!element || !isTextElement(element)) continue;
      const nextWidth = Math.max(20, node.width() * node.scaleX());
      node.scaleX(1);
      node.scaleY(1);
      state.updateElement(element.id, { x: node.x(), y: node.y(), width: nextWidth });
    }
  }

  function handleTransformEnd() {
    const transformer = trRef.current;
    const anchor = transformer.getActiveAnchor();
    const state = store.getState();
    const patches = new Map();

    for (const node of transformer.nodes()) {
      const element = elementsById.get(node.id());
      if (!element) continue;
      const sx = node.scaleX();
      const sy = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const patch = { x: node.x(), y: node.y(), rotation: Math.round(node.rotation() * 100) / 100 };

      if (isTextElement(element)) {
        patch.width = Math.max(20, (Number(element.width) || node.width()) * sx);
        if (!SIDE_ANCHORS.has(anchor) && Math.abs(sy - 1) > 0.001) {
          patch.fontSize = Math.max(4, Math.round((Number(element.fontSize) || 28) * sy * 10) / 10);
        }
      } else if (element.type === 'line') {
        patch.width = Math.max(5, (Number(element.width) || 200) * sx);
      } else {
        patch.width = Math.max(5, (Number(element.width) || node.width()) * sx);
        patch.height = Math.max(5, (Number(element.height) || node.height()) * sy);
      }
      patches.set(element.id, patch);
    }

    state.updateElements([...patches.keys()], (element) => ({ ...element, ...patches.get(element.id) }));
    state.commitTransaction();
  }

  const cursor = panning ? 'grabbing' : spaceDown ? 'grab' : tool !== 'select' ? 'crosshair' : 'default';
  const editingElement = editingTextId ? elementsById.get(editingTextId) : null;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-200"
      style={{ cursor, touchAction: 'none' }}
      data-testid="editor-canvas"
      data-scene-ready={sceneReady ? 'true' : 'false'}
    >
      <Stage
        ref={stageRef}
        width={viewport.width || 1}
        height={viewport.height || 1}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <Layer>
          <Group
            ref={pageRef}
            name="page"
            x={viewport.x}
            y={viewport.y}
            scaleX={viewport.zoom}
            scaleY={viewport.zoom}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            <Rect name="page-shadow" width={width} height={height} fill="#fff" shadowColor="#0f172a" shadowOpacity={0.18} shadowBlur={24} shadowOffsetY={6} listening={false} />
            <Rect name="page-background" width={width} height={height} fill={document.background?.color || '#f8f4ea'} />
            <BackgroundImage src={buildAssetUrl(document.background?.imagePath)} width={width} height={height} />
            {ops.map((op) => (op.id === editingTextId ? null : (
              <SceneNode
                key={op.id}
                op={op}
                engine={engine}
                branding={branding}
                draggable={!spaceDown && !elementsById.get(op.id)?.locked}
              />
            )))}
            {showGrid && <Group name="grid" listening={false}><GridLines width={width} height={height} /></Group>}
          </Group>
        </Layer>
        <Layer name="ui">
          <Transformer
            ref={trRef}
            rotateEnabled
            keepRatio={keepRatio}
            ignoreStroke
            anchorSize={10}
            anchorCornerRadius={5}
            anchorStroke="#10b981"
            borderStroke="#10b981"
            rotationSnaps={[0, 90, 180, 270]}
            enabledAnchors={onlyLines ? ['middle-left', 'middle-right'] : undefined}
            boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5 ? oldBox : newBox)}
            onTransformStart={handleTransformStart}
            onTransform={handleTransform}
            onTransformEnd={handleTransformEnd}
          />
        </Layer>
      </Stage>

      {editingElement && (
        <TextEditOverlay element={editingElement} viewport={viewport} />
      )}

      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
}

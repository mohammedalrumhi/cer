import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Label, Layer, Line, Rect, Shape, Stage, Tag, Text, Transformer } from 'react-konva';
import { useDroppable } from '@dnd-kit/core';
import { RATIO_LOCKED_TYPES } from '@shared/model/index.js';
import { ORNAMENTS } from '@shared/assets/ornaments.js';
import { buildAssetUrl } from '../../api/client';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';
import { useViewPrefs } from '../store/viewPrefs';
import { isTextElement } from '../model/elements';
import { BackgroundFill, BackgroundImage, SceneNode } from './SceneNodes';
import { useSceneOps } from './useSceneOps';
import { opBounds, opCorners, intersects, rectFromPoints, round2, union } from './geometry';
import { collectTargets, snapMove, snapPoint } from './snapping';
import { expandToGroups } from './align';
import CanvasContextMenu from './ContextMenu';
import CropOverlay from './CropOverlay';
import TextEditOverlay from './TextEditOverlay';
import Rulers, { RULER_SIZE } from './Rulers';
import { clientToDocument } from './coords';

const WHEEL_ZOOM_SPEED = 0.0025;
const SIDE_ANCHORS = new Set(['middle-left', 'middle-right']);
const SNAP_THRESHOLD_PX = 6;
const DRAG_START_PX = 3;
const SNAP_15 = Array.from({ length: 24 }, (_, i) => i * 15);
const TEXT_ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right'];
const RATIO_ORNAMENT_CATEGORIES = new Set(['rosettes', 'corners', 'awards']);

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function keepsRatio(element) {
  if (!element) return false;
  if (element.type === 'ornament') return RATIO_ORNAMENT_CATEGORIES.has(ORNAMENTS[element.ornament]?.category);
  return RATIO_LOCKED_TYPES.has(element.type) || isTextElement(element);
}

/**
 * Editor canvas: a full-viewport Stage. The page lives in a Group transformed by the viewport
 * (zoom + pan); overlays (guides, hover, marquee) are drawn in page coordinates with strokes that
 * don't scale; the transformer sits in an unscaled layer so its handles keep their size.
 */
export default function Canvas({ stageRef, branding, previewStudent = null, onFilesDropped }) {
  const store = useEditorStoreApi();
  const containerRef = useRef(null);
  const trRef = useRef(null);
  const pageRef = useRef(null);
  const sessionRef = useRef(null);
  const panRef = useRef(null);
  const anchorRef = useRef(null);
  const transformTargetsRef = useRef([]);
  const fittedRef = useRef(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [shiftDown, setShiftDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const [overlay, setOverlay] = useState({ guides: [], distances: [], marquee: null });
  const [hoverId, setHoverId] = useState(null);
  const [fileOver, setFileOver] = useState(false);

  const document = useEditor((state) => state.document);
  const selectedIds = useEditor((state) => state.selection.ids);
  const viewport = useEditor((state) => state.viewport);
  const tool = useEditor((state) => state.ui.tool);
  const mode = useEditor((state) => state.ui.mode);
  const editingTextId = useEditor((state) => state.ui.editingTextId);
  const cropId = useEditor((state) => state.ui.cropId);
  const { rulers, grid, guides: showGuides, gridSize } = useViewPrefs();
  const preview = mode === 'preview';
  const { ops, scene, engine, ready } = useSceneOps(document, branding, preview ? previewStudent : null);
  // Every text op laid out means fonts are loaded; tests wait on this (data-scene-ready).
  const sceneReady = ready && ops.every((op) => op.kind !== 'text' || !op.text || op.layout);

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'editor-canvas' });
  const setContainer = useCallback((node) => {
    containerRef.current = node;
    setDropRef(node);
  }, [setDropRef]);

  const elementsById = useMemo(() => new Map(document.elements.map((el) => [el.id, el])), [document.elements]);
  const opsById = useMemo(() => new Map(ops.map((op) => [op.id, op])), [ops]);
  const width = Number(document.width) || 1123;
  const height = Number(document.height) || 794;
  const page = useMemo(() => ({ width, height, margins: document.page?.margins }), [width, height, document.page?.margins]);
  const bleed = Number(document.page?.bleed) || 0;
  const px = 1 / viewport.zoom;
  const colors = useMemo(() => ({ selection: cssVar('--selection', '#0f9d74'), guide: cssVar('--guide', '#e5484d') }), []);

  // Element bounds for align/distribute (store) — derived from the scene.
  const boxes = useMemo(() => new Map(ops.map((op) => [op.id, opBounds(op)])), [ops]);
  useEffect(() => { store.getState().setBoxes(boxes); }, [store, boxes]);

  /* ── viewport size + initial fit ─────────────────────────────── */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      store.getState().setViewport({ width: w, height: h });
      if (!fittedRef.current && w > 0 && h > 0) {
        fittedRef.current = true;
        store.getState().zoomToFit(null, { maxZoom: 1, padding: 48 });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [store]);

  /* ── modifier keys: Space pans, Shift snaps rotation to 15° ────── */
  useEffect(() => {
    const isTyping = (event) => /^(input|textarea|select)$/i.test(event.target?.tagName || '') || event.target?.isContentEditable;
    const down = (event) => {
      setShiftDown(event.shiftKey);
      if (event.code === 'Space' && !isTyping(event)) {
        event.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (event) => {
      setShiftDown(event.shiftKey);
      if (event.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  /* ── transformer follows selection ───────────────────────────── */
  const selectedEditable = preview ? [] : selectedIds.filter((id) => elementsById.get(id) && !elementsById.get(id).locked && elementsById.get(id).visible !== false);
  useEffect(() => {
    const transformer = trRef.current;
    const pageGroup = pageRef.current;
    if (!transformer || !pageGroup) return;
    const nodes = selectedEditable
      .filter((id) => id !== editingTextId && id !== cropId)
      .map((id) => pageGroup.findOne(`#${id}`))
      .filter(Boolean);
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  });

  const selectedElements = selectedEditable.map((id) => elementsById.get(id));
  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const onlyLines = selectedElements.length > 0 && selectedElements.every((el) => el.type === 'line');
  const keepRatio = selectedElements.length > 1 || (single && keepsRatio(single));
  const anchors = onlyLines ? ['middle-left', 'middle-right'] : single && isTextElement(single) ? TEXT_ANCHORS : undefined;

  /* ── helpers ─────────────────────────────────────────────────── */
  const toDocument = useCallback((point) => {
    const { zoom, x, y } = store.getState().viewport;
    return { x: (point.x - x) / zoom, y: (point.y - y) / zoom };
  }, [store]);

  const pointerFromEvent = useCallback((evt) => {
    const rect = containerRef.current.getBoundingClientRect();
    return toDocument({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
  }, [toDocument]);

  function elementIdFromTarget(target) {
    let node = target;
    while (node && node !== pageRef.current) {
      if (node.name() === 'element' || node.hasName?.('element')) return node.id();
      node = node.getParent();
    }
    return null;
  }

  /* ── pointer sessions: drag (threshold + snapping) and marquee ── */
  const endSession = useCallback((evt) => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setOverlay({ guides: [], distances: [], marquee: null });
    if (!session) return;
    const state = store.getState();
    if (session.kind === 'drag') {
      if (session.moved) {
        const positions = new Map(session.items.map((item) => [item.id, { x: round2(item.node.x()), y: round2(item.node.y()) }]));
        state.updateElements([...positions.keys()], (element) => ({ ...element, ...positions.get(element.id) }), { label: 'تحريك' });
        state.sealHistory();
      } else if (!evt.shiftKey && session.items.length > session.clickedIds.length) {
        // A plain click inside a multi-selection narrows it to the clicked element/group.
        state.select(session.clickedIds);
      }
      return;
    }
    const point = pointerFromEvent(evt);
    const rect = rectFromPoints(session.start.x, session.start.y, point.x, point.y);
    if (rect.width * state.viewport.zoom < 3 && rect.height * state.viewport.zoom < 3) {
      if (session.clickId) state.selectExpanded([session.clickId]);
      return;
    }
    const hits = ops.filter((op) => !elementsById.get(op.id)?.locked && intersects(opBounds(op), rect)).map((op) => op.id);
    const ids = expandToGroups(hits, state.document.elements);
    state.select(session.additive ? [...new Set([...session.base, ...ids])] : ids);
  }, [store, ops, elementsById, pointerFromEvent]);

  const moveSession = useCallback((evt) => {
    const session = sessionRef.current;
    if (!session) return;
    const point = pointerFromEvent(evt);
    const zoom = store.getState().viewport.zoom;
    if (session.kind === 'marquee') {
      setOverlay({ guides: [], distances: [], marquee: rectFromPoints(session.start.x, session.start.y, point.x, point.y) });
      return;
    }
    let dx = point.x - session.start.x;
    let dy = point.y - session.start.y;
    if (!session.moved && Math.hypot(dx, dy) * zoom < DRAG_START_PX) return;
    session.moved = true;
    let next = { guides: [], distances: [], marquee: null };
    if (useViewPrefs.getState().snapping && !evt.altKey) {
      const moved = { ...session.bbox, x: session.bbox.x + dx, y: session.bbox.y + dy };
      const snap = snapMove(moved, session.targets, SNAP_THRESHOLD_PX / zoom, page, session.others);
      dx += snap.dx;
      dy += snap.dy;
      next = { guides: snap.guides, distances: snap.distances, marquee: null };
    }
    for (const item of session.items) item.node.position({ x: item.x + dx, y: item.y + dy });
    session.items[0]?.node.getLayer()?.batchDraw();
    setOverlay(next);
  }, [store, page, pointerFromEvent]);

  useEffect(() => {
    const onMove = (event) => {
      moveSession(event);
      const pan = panRef.current;
      if (pan) store.getState().setViewport({ x: pan.x + event.clientX - pan.startX, y: pan.y + event.clientY - pan.startY });
    };
    const onUp = (event) => {
      endSession(event);
      if (panRef.current) {
        panRef.current = null;
        setPanning(false);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [moveSession, endSession, store]);

  function handlePointerDown(event) {
    const evt = event.evt;
    const state = store.getState();
    if (spaceDown || evt.button === 1) {
      const { x, y } = state.viewport;
      panRef.current = { startX: evt.clientX, startY: evt.clientY, x, y };
      setPanning(true);
      return;
    }
    if (event.target.getParent()?.className === 'Transformer') return;
    if (event.target.findAncestor?.('.crop', true)) return;
    if (state.ui.cropId) state.setUi({ cropId: null });
    if (state.ui.editingTextId) return;
    if (preview) return;

    const point = pointerFromEvent(evt);
    const id = elementIdFromTarget(event.target);
    const element = id ? elementsById.get(id) : null;

    // Empty space and locked elements start a marquee; a plain click on a locked element selects it.
    if (!element || element.locked) {
      if (evt.button !== 0) {
        if (element) state.select([element.id]);
        return;
      }
      if (!evt.shiftKey) state.clearSelection();
      sessionRef.current = { kind: 'marquee', start: point, additive: evt.shiftKey, base: evt.shiftKey ? state.selection.ids : [], clickId: element?.id || null };
      return;
    }

    const clicked = expandToGroups([id], state.document.elements);
    const current = state.selection.ids;
    let next;
    if (evt.shiftKey) {
      next = clicked.every((item) => current.includes(item)) ? current.filter((item) => !clicked.includes(item)) : [...current, ...clicked.filter((item) => !current.includes(item))];
    } else if (clicked.every((item) => current.includes(item)) || current.includes(id)) {
      next = current;
    } else {
      next = clicked;
    }
    state.select(next);
    if (evt.button !== 0 || !next.includes(id)) return;
    const movable = next.map((itemId) => elementsById.get(itemId)).filter(Boolean);
    if (movable.some((el) => el.locked)) return;
    const pageGroup = pageRef.current;
    const others = ops.filter((op) => !next.includes(op.id)).map(opBounds);
    sessionRef.current = {
      kind: 'drag',
      start: point,
      items: movable.map((el) => ({ id: el.id, x: Number(el.x) || 0, y: Number(el.y) || 0, node: pageGroup.findOne(`#${el.id}`) })).filter((item) => item.node),
      bbox: union(movable.map((el) => boxes.get(el.id)).filter(Boolean)) || { x: point.x, y: point.y, width: 0, height: 0 },
      others,
      targets: collectTargets(page, others),
      moved: false,
      clickedIds: clicked,
    };
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
    if (preview) return;
    const id = elementIdFromTarget(event.target);
    const element = id && elementsById.get(id);
    if (!element || element.locked) return;
    const state = store.getState();
    if (isTextElement(element)) {
      state.select([id]);
      state.setUi({ editingTextId: id });
    } else if ((element.type === 'image' || element.type === 'frame') && element.src) {
      state.select([id]);
      state.setUi({ cropId: id });
    } else if (element.groupId) {
      // Double-click enters a group and selects just the member.
      state.select([id]);
    }
  }

  function handleContextMenu(event) {
    // Radix opens the menu from the same DOM event, so it must not be default-prevented here.
    if (preview) {
      event.evt.preventDefault();
      return;
    }
    const id = elementIdFromTarget(event.target);
    const state = store.getState();
    if (id && !state.selection.ids.includes(id)) state.selectExpanded([id]);
    if (!id) state.clearSelection();
  }

  function handleHover(event) {
    if (sessionRef.current) return;
    const id = elementIdFromTarget(event.target);
    setHoverId(id);
    const container = stageRef.current?.container();
    const element = id && elementsById.get(id);
    if (container && !spaceDown) container.style.cursor = element && !element.locked && !preview ? 'move' : 'default';
  }

  /* ── transforming ────────────────────────────────────────────── */
  function handleTransformStart() {
    anchorRef.current = trRef.current?.getActiveAnchor() || null;
    const others = ops.filter((op) => !selectedIds.includes(op.id)).map(opBounds);
    transformTargetsRef.current = collectTargets(page, others);
    store.getState().beginTransaction(anchorRef.current === 'rotater' ? 'تدوير' : 'تغيير الحجم');
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

  function anchorDragBoundFunc(oldPos, nextPos, evt) {
    const transformer = trRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage || !useViewPrefs.getState().snapping || evt?.altKey || anchorRef.current === 'rotater') return nextPos;
    if (transformer.nodes().some((node) => Math.abs(node.rotation() % 360) > 0.01)) return nextPos;
    const pageGroup = pageRef.current;
    const toPage = pageGroup.getAbsoluteTransform().copy().invert();
    const zoom = store.getState().viewport.zoom;
    const snapped = snapPoint(toPage.point(nextPos), transformTargetsRef.current, SNAP_THRESHOLD_PX / zoom);
    const guides = [];
    if (snapped.snappedX !== null) guides.push({ axis: 'x', value: snapped.snappedX, from: 0, to: height });
    if (snapped.snappedY !== null) guides.push({ axis: 'y', value: snapped.snappedY, from: 0, to: width });
    setOverlay({ guides, distances: [], marquee: null });
    return pageGroup.getAbsoluteTransform().point({ x: snapped.x, y: snapped.y });
  }

  function handleTransformEnd() {
    const transformer = trRef.current;
    const anchor = anchorRef.current;
    const state = store.getState();
    const patches = new Map();
    for (const node of transformer.nodes()) {
      const element = elementsById.get(node.id());
      if (!element) continue;
      const sx = Math.abs(node.scaleX());
      const sy = Math.abs(node.scaleY());
      node.scaleX(1);
      node.scaleY(1);
      const patch = { x: round2(node.x()), y: round2(node.y()), rotation: round2(((node.rotation() % 360) + 360) % 360) };
      if (patch.rotation > 180) patch.rotation = round2(patch.rotation - 360);
      if (isTextElement(element)) {
        patch.width = round2(Math.max(20, (Number(element.width) || node.width()) * sx));
        if (!SIDE_ANCHORS.has(anchor) && Math.abs(sy - 1) > 0.001) patch.fontSize = Math.max(4, Math.round((Number(element.fontSize) || 28) * sy * 10) / 10);
        if (Number(element.height) > 0) patch.height = round2(Number(element.height) * sy);
      } else if (element.type === 'line') {
        patch.width = round2(Math.max(5, (Number(element.width) || 200) * sx));
      } else {
        patch.width = round2(Math.max(4, (Number(element.width) || node.width()) * sx));
        patch.height = round2(Math.max(4, (Number(element.height) || node.height()) * sy));
      }
      patches.set(element.id, patch);
    }
    state.updateElements([...patches.keys()], (element) => ({ ...element, ...patches.get(element.id) }));
    state.commitTransaction();
    anchorRef.current = null;
    setOverlay({ guides: [], distances: [], marquee: null });
  }

  /* ── native file drops (images from the desktop) ─────────────── */
  function handleFileDrop(event) {
    event.preventDefault();
    setFileOver(false);
    const files = [...(event.dataTransfer?.files || [])].filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    onFilesDropped?.(files, clientToDocument(store, containerRef.current, event.clientX, event.clientY));
  }

  const cursor = panning ? 'grabbing' : spaceDown ? 'grab' : tool !== 'select' ? 'crosshair' : undefined;
  const editingElement = editingTextId ? elementsById.get(editingTextId) : null;
  const cropElement = cropId ? elementsById.get(cropId) : null;
  const hoverOp = hoverId && !selectedIds.includes(hoverId) && !overlay.marquee && !preview ? opsById.get(hoverId) : null;
  const margins = document.page?.margins || {};
  const hasMargins = (margins.top || 0) + (margins.right || 0) + (margins.bottom || 0) + (margins.left || 0) > 0;
  const missingBackground = document.background?.missing;

  return (
    <CanvasContextMenu disabled={preview}>
      <div
        ref={setContainer}
        className={`canvas-dots relative h-full w-full overflow-hidden ${isOver || fileOver ? 'ring-4 ring-inset ring-primary/40' : ''}`}
        style={{ cursor, touchAction: 'none' }}
        data-testid="editor-canvas"
        data-scene-ready={sceneReady ? 'true' : 'false'}
        aria-label="لوحة التصميم"
        onDragOver={(event) => { if ([...(event.dataTransfer?.types || [])].includes('Files')) { event.preventDefault(); setFileOver(true); } }}
        onDragLeave={() => setFileOver(false)}
        onDrop={handleFileDrop}
      >
        <Stage
          ref={stageRef}
          width={viewport.width || 1}
          height={viewport.height || 1}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onWheel={handleWheel}
          onDblClick={handleDoubleClick}
          onDblTap={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onMouseMove={handleHover}
          onMouseLeave={() => setHoverId(null)}
        >
          <Layer>
            <Group ref={pageRef} name="page" x={viewport.x} y={viewport.y} scaleX={viewport.zoom} scaleY={viewport.zoom}>
              <Rect name="page-shadow" x={-bleed} y={-bleed} width={width + bleed * 2} height={height + bleed * 2} fill="#fff" shadowColor="#1b2a23" shadowOpacity={0.18} shadowBlur={24} shadowOffsetY={6} listening={false} />
              <BackgroundFill scene={scene} />
              <BackgroundImage src={buildAssetUrl(document.background?.imagePath)} width={width} height={height} opacity={document.background?.imageOpacity ?? 1} />
              {ops.map((op) => (op.id === editingTextId ? null : <SceneNode key={op.id} op={op} engine={engine} branding={branding} />))}
            </Group>
          </Layer>

          <Layer name="guides" listening={false}>
            <Group x={viewport.x} y={viewport.y} scaleX={viewport.zoom} scaleY={viewport.zoom}>
              {grid && (
                <Shape
                  name="grid"
                  sceneFunc={(context) => {
                    const ctx = context._context;
                    ctx.beginPath();
                    for (let x = gridSize; x < width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
                    for (let y = gridSize; y < height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
                    ctx.strokeStyle = 'rgba(15,107,82,0.16)';
                    ctx.lineWidth = px;
                    ctx.stroke();
                  }}
                />
              )}
              {showGuides && hasMargins && (
                <Rect x={margins.left || 0} y={margins.top || 0} width={width - (margins.left || 0) - (margins.right || 0)} height={height - (margins.top || 0) - (margins.bottom || 0)} stroke="#2c6aa0" strokeWidth={px} dash={[6 * px, 4 * px]} />
              )}
              {showGuides && (
                // Safe-print area: keep important content 4 mm (~15 px) inside the trim.
                <Rect x={15} y={15} width={width - 30} height={height - 30} stroke="#b8893c" strokeWidth={px} dash={[2 * px, 4 * px]} opacity={0.7} />
              )}
              {showGuides && bleed > 0 && <Rect width={width} height={height} stroke={colors.guide} strokeWidth={px} dash={[4 * px, 4 * px]} />}
              {hoverOp && <Line points={opCorners(hoverOp).flat()} closed stroke={colors.selection} strokeWidth={1.5 * px} />}
              {overlay.guides.map((guide, index) => (
                <Line key={`g${index}`} points={guide.axis === 'x' ? [guide.value, guide.from, guide.value, guide.to] : [guide.from, guide.value, guide.to, guide.value]} stroke={colors.guide} strokeWidth={px} />
              ))}
              {overlay.distances.map((distance, index) => {
                const mid = (distance.from + distance.to) / 2;
                return (
                  <Group key={`d${index}`}>
                    <Line points={distance.axis === 'x' ? [distance.from, distance.at, distance.to, distance.at] : [distance.at, distance.from, distance.at, distance.to]} stroke={colors.guide} strokeWidth={px} dash={[3 * px, 3 * px]} />
                    <Label x={distance.axis === 'x' ? mid : distance.at} y={distance.axis === 'x' ? distance.at : mid} scaleX={px} scaleY={px}>
                      <Tag fill={colors.guide} cornerRadius={4} />
                      <Text text={String(Math.round(distance.distance))} fill="#fff" fontSize={11} fontStyle="bold" padding={3} offsetX={10} offsetY={9} fontFamily="IBM Plex Sans Arabic, sans-serif" />
                    </Label>
                  </Group>
                );
              })}
              {overlay.marquee && <Rect {...overlay.marquee} fill="rgba(15,157,116,0.08)" stroke={colors.selection} strokeWidth={px} />}
            </Group>
          </Layer>

          <Layer name="ui">
            {cropElement && opsById.get(cropElement.id) && (
              <Group name="crop" x={viewport.x} y={viewport.y} scaleX={viewport.zoom} scaleY={viewport.zoom}>
                <CropOverlay element={cropElement} op={opsById.get(cropElement.id)} branding={branding} zoom={viewport.zoom} />
              </Group>
            )}
            <Transformer
              ref={trRef}
              rotateEnabled
              keepRatio={Boolean(keepRatio)}
              enabledAnchors={anchors}
              flipEnabled={false}
              ignoreStroke
              anchorSize={9}
              anchorCornerRadius={5}
              anchorStroke={colors.selection}
              anchorFill="#ffffff"
              borderStroke={colors.selection}
              borderStrokeWidth={1.5}
              rotateAnchorOffset={26}
              rotationSnaps={shiftDown ? SNAP_15 : [0, 90, 180, 270]}
              rotationSnapTolerance={shiftDown ? 7.5 : 4}
              boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 4 || Math.abs(newBox.height) < 1 ? oldBox : newBox)}
              anchorDragBoundFunc={anchorDragBoundFunc}
              onTransformStart={handleTransformStart}
              onTransform={handleTransform}
              onTransformEnd={handleTransformEnd}
            />
          </Layer>
        </Stage>

        {rulers && <Rulers viewport={viewport} boxes={boxes} selectedIds={selectedIds} />}

        {editingElement && <TextEditOverlay element={editingElement} op={opsById.get(editingElement.id)} viewport={viewport} />}

        {missingBackground && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center" style={{ top: rulers ? RULER_SIZE + 12 : 12 }}>
            <span className="rounded-full bg-warning-bg px-4 py-1.5 text-xs font-semibold text-warning shadow-sm">{'صورة الخلفية مفقودة. اختر خلفية جديدة من لوحة «الخلفيات».'}</span>
          </div>
        )}
      </div>
    </CanvasContextMenu>
  );
}

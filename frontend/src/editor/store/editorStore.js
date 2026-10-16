import { createStore } from 'zustand/vanilla';
import { cloneElement, createId, migrateTemplate } from '@shared/model/index.js';
import { alignMoves, distributeMoves, expandToGroups } from '../canvas/align.js';
import { createHistory, pushCommand, redoCommand, sealHistory, undoCommand } from './history.js';

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4;
export const ZOOM_STEPS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.25, 1.5, 2, 3, 4];

export function nextZoomStep(current, direction) {
  const eps = 0.001;
  const step = direction > 0
    ? ZOOM_STEPS.find((s) => s > current + eps)
    : [...ZOOM_STEPS].reverse().find((s) => s < current - eps);
  return step ?? (direction > 0 ? ZOOM_MAX : ZOOM_MIN);
}

/** Deep copies with fresh ids; elements that shared a group share a new group. */
export function cloneWithGroups(elements, offset) {
  const groups = new Map();
  return elements.map((element) => {
    const copy = cloneElement(element, offset);
    if (element.groupId) {
      if (!groups.has(element.groupId)) groups.set(element.groupId, createId('grp'));
      copy.groupId = groups.get(element.groupId);
    }
    return copy;
  });
}
export const PASTE_OFFSET = 20;
const CLIPBOARD_KEY = 'cer:clipboard';

/**
 * @typedef {object} EditorState
 * @property {object} document            the template being edited (schema v2)
 * @property {object} savedDocument       last document known to be persisted
 * @property {{ ids: string[] }} selection
 * @property {{ zoom: number, x: number, y: number, width: number, height: number }} viewport
 * @property {{ tool: string, activePanel: string|null, propertiesOpen: boolean, mode: 'design'|'preview', previewIndex: number,
 *   editingTextId: string|null, cropId: string|null, shortcutsOpen: boolean, dialog: string|null, mobileSheet: string, showGrid: boolean }} ui
 * @property {Map<string, {x:number,y:number,width:number,height:number}>} boxes  element bounds from the latest scene
 * @property {number} serverVersion          template version the document is based on (optimistic saves)
 * @property {import('./history.js').History} history
 * @property {{ label: string, before: object, selectionBefore: string[] } | null} transaction
 */

function shallowEqual(a, b) {
  if (a === b) return true;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => Object.is(a[key], b[key]));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Apply `fn` to the elements in `ids`, keeping object identity for anything unchanged. */
function mapElements(document, ids, fn) {
  const targets = new Set(ids);
  let changed = false;
  const elements = document.elements.map((element) => {
    if (!targets.has(element.id)) return element;
    const next = fn(element);
    if (!next || shallowEqual(next, element)) return element;
    changed = true;
    return next;
  });
  return changed ? { ...document, elements } : document;
}

function reorder(elements, ids, action) {
  const targets = new Set(ids);
  const picked = elements.filter((element) => targets.has(element.id));
  if (picked.length === 0) return elements;
  const rest = elements.filter((element) => !targets.has(element.id));

  if (action === 'bringToFront') return [...rest, ...picked];
  if (action === 'sendToBack') return [...picked, ...rest];

  // Move one step past the nearest non-selected neighbour, keeping the group's relative order.
  const result = [...elements];
  const indices = elements.map((element, index) => (targets.has(element.id) ? index : -1)).filter((i) => i >= 0);
  if (action === 'bringForward') {
    for (const index of [...indices].reverse()) {
      const next = index + 1;
      if (next < result.length && !targets.has(result[next].id)) {
        [result[index], result[next]] = [result[next], result[index]];
      }
    }
  } else if (action === 'sendBackward') {
    for (const index of indices) {
      const prev = index - 1;
      if (prev >= 0 && !targets.has(result[prev].id)) {
        [result[index], result[prev]] = [result[prev], result[index]];
      }
    }
  }
  return result;
}

function readClipboard() {
  try {
    const raw = globalThis.localStorage?.getItem(CLIPBOARD_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed?.elements) ? parsed.elements : null;
  } catch {
    return null;
  }
}

function writeClipboard(elements) {
  try {
    globalThis.localStorage?.setItem(CLIPBOARD_KEY, JSON.stringify({ elements, copiedAt: Date.now() }));
  } catch {
    // Storage may be unavailable (private mode, quota); the in-memory copy still works.
  }
}

/**
 * Create an isolated editor store. The factory (rather than a module singleton) keeps tests and
 * multiple editors independent.
 * @param {object} template
 * @param {{ now?: () => number }} [options]
 */
export function createEditorStore(template, { now = () => Date.now() } = {}) {
  const initial = migrateTemplate(template);
  let memoryClipboard = null;

  return createStore((set, get) => {
    /**
     * Commit a document change as one undoable command.
     * @param {string} label
     * @param {(doc: object) => object} producer
     * @param {{ coalesceKey?: string, selectionAfter?: string[] }} [options]
     */
    function commit(label, producer, { coalesceKey = null, selectionAfter } = {}) {
      const state = get();
      const before = state.document;
      const after = producer(before);
      if (after === before && !selectionAfter) return;

      const existing = new Set(after.elements.map((element) => element.id));
      const nextSelection = (selectionAfter ?? state.selection.ids).filter((id) => existing.has(id));

      if (state.transaction) {
        // Inside a gesture: update live, the transaction records one command at the end.
        set({ document: after, selection: { ids: nextSelection } });
        return;
      }

      const history = pushCommand(state.history, {
        label,
        before,
        after,
        selectionBefore: state.selection.ids,
        selectionAfter: nextSelection,
        coalesceKey,
        time: now(),
      });
      // A coalesced run that came back to where it started was dropped from history; restore the
      // original document object so identity-based dirty tracking sees it as unchanged.
      const reverted = history.past.length < state.history.past.length;
      set({
        document: reverted ? state.history.past[state.history.past.length - 1].before : after,
        selection: { ids: nextSelection },
        history,
      });
    }

    function restore(document, selectionIds) {
      const existing = new Set(document.elements.map((element) => element.id));
      set({ document, selection: { ids: selectionIds.filter((id) => existing.has(id)) } });
    }

    return {
      document: initial,
      savedDocument: initial,
      selection: { ids: [] },
      viewport: { zoom: 1, x: 0, y: 0, width: 0, height: 0 },
      ui: {
        tool: 'select',
        activePanel: 'elements',
        propertiesOpen: true,
        mode: 'design',
        previewIndex: 0,
        editingTextId: null,
        cropId: null,
        shortcutsOpen: false,
        dialog: null,
        mobileSheet: 'closed',
        showGrid: false,
      },
      boxes: new Map(),
      serverVersion: Number(initial?.version) || 1,
      history: createHistory(),
      transaction: null,

      /* ── document lifecycle ─────────────────────────────────────── */
      loadDocument(nextTemplate) {
        const document = migrateTemplate(nextTemplate);
        set({ document, savedDocument: document, selection: { ids: [] }, history: createHistory(), transaction: null, serverVersion: Number(document.version) || 1 });
      },
      markSaved(document = get().document, serverVersion) {
        set(serverVersion ? { savedDocument: document, serverVersion } : { savedDocument: document });
      },
      setServerVersion(serverVersion) {
        set({ serverVersion });
      },
      /** Replace the whole design as one undoable step (apply a template, restore a version). */
      replaceDocument(nextTemplate, { label = 'استبدال التصميم' } = {}) {
        const current = get().document;
        const next = migrateTemplate({ ...nextTemplate, id: current.id, name: nextTemplate.name ?? current.name, version: current.version });
        commit(label, () => next, { selectionAfter: [] });
      },

      /* ── document commands ──────────────────────────────────────── */
      updateDocument(patch, { label = 'تعديل القالب', coalesceKey } = {}) {
        commit(label, (doc) => {
          const next = typeof patch === 'function' ? patch(doc) : { ...doc, ...patch };
          return shallowEqual(next, doc) ? doc : next;
        }, { coalesceKey });
      },
      updateElements(ids, patch, { label = 'تعديل', coalesceKey } = {}) {
        commit(label, (doc) => mapElements(doc, ids, (element) => (
          typeof patch === 'function' ? patch(element) : { ...element, ...patch }
        )), { coalesceKey });
      },
      updateElement(id, patch, options) {
        get().updateElements([id], patch, options);
      },
      addElements(elements, { label = 'إضافة', select = true } = {}) {
        if (elements.length === 0) return;
        commit(label, (doc) => ({ ...doc, elements: [...doc.elements, ...elements] }), {
          selectionAfter: select ? elements.map((element) => element.id) : undefined,
        });
      },
      removeElements(ids, { label = 'حذف' } = {}) {
        const targets = new Set(ids);
        commit(label, (doc) => {
          const elements = doc.elements.filter((element) => !targets.has(element.id));
          return elements.length === doc.elements.length ? doc : { ...doc, elements };
        }, { selectionAfter: get().selection.ids.filter((id) => !targets.has(id)) });
      },
      duplicateElements(ids = get().selection.ids) {
        const targets = new Set(ids);
        const copies = cloneWithGroups(get().document.elements.filter((element) => targets.has(element.id)), { dx: PASTE_OFFSET, dy: PASTE_OFFSET });
        get().addElements(copies, { label: 'تكرار' });
        return copies;
      },
      reorderElements(ids, action) {
        commit('ترتيب الطبقات', (doc) => {
          const elements = reorder(doc.elements, ids, action);
          return elements.every((element, index) => element === doc.elements[index]) ? doc : { ...doc, elements };
        });
      },
      /** Move one element to a stacking index (layers panel drag). */
      moveElementTo(id, index) {
        commit('ترتيب الطبقات', (doc) => {
          const from = doc.elements.findIndex((element) => element.id === id);
          if (from < 0) return doc;
          const to = Math.max(0, Math.min(doc.elements.length - 1, index));
          if (from === to) return doc;
          const elements = [...doc.elements];
          const [moved] = elements.splice(from, 1);
          elements.splice(to, 0, moved);
          return { ...doc, elements };
        });
      },
      /** Shift elements by per-id offsets as one step (align, distribute). */
      applyMoves(moves, label) {
        if (!moves.length) return;
        const byId = new Map(moves.map((move) => [move.id, move]));
        get().updateElements([...byId.keys()], (element) => {
          const move = byId.get(element.id);
          return { ...element, x: Math.round(((Number(element.x) || 0) + move.dx) * 100) / 100, y: Math.round(((Number(element.y) || 0) + move.dy) * 100) / 100 };
        }, { label });
      },
      alignSelection(mode, options) {
        const state = get();
        const selected = state.document.elements.filter((element) => state.selection.ids.includes(element.id) && !element.locked);
        const page = { width: Number(state.document.width) || 1123, height: Number(state.document.height) || 794 };
        state.applyMoves(alignMoves(selected, state.boxes, mode, page, options), 'محاذاة');
      },
      distributeSelection(axis) {
        const state = get();
        const selected = state.document.elements.filter((element) => state.selection.ids.includes(element.id) && !element.locked);
        state.applyMoves(distributeMoves(selected, state.boxes, axis), 'توزيع');
      },
      groupSelection() {
        const { ids } = get().selection;
        if (ids.length < 2) return;
        const groupId = createId('grp');
        get().updateElements(ids, (element) => ({ ...element, groupId }), { label: 'تجميع' });
      },
      ungroupSelection() {
        get().updateElements(get().selection.ids, (element) => {
          if (!element.groupId) return element;
          const { groupId: _drop, ...rest } = element;
          return rest;
        }, { label: 'فك التجميع' });
      },
      toggleLocked(ids = get().selection.ids) {
        const targets = get().document.elements.filter((element) => ids.includes(element.id));
        const lock = !targets.every((element) => element.locked);
        get().updateElements(ids, (element) => ({ ...element, locked: lock }), { label: lock ? 'قفل' : 'فتح القفل' });
      },
      toggleHidden(ids = get().selection.ids) {
        const targets = get().document.elements.filter((element) => ids.includes(element.id));
        const hide = !targets.every((element) => element.visible === false);
        get().updateElements(ids, (element) => ({ ...element, visible: !hide }), { label: hide ? 'إخفاء' : 'إظهار' });
      },
      nudge(ids, dx, dy) {
        const key = `nudge:${[...ids].sort().join(',')}`;
        get().updateElements(ids, (element) => (
          element.locked ? element : { ...element, x: (Number(element.x) || 0) + dx, y: (Number(element.y) || 0) + dy }
        ), { label: 'تحريك', coalesceKey: key });
      },

      /* ── gestures: many live updates, one undo step ─────────────── */
      beginTransaction(label) {
        const state = get();
        if (state.transaction) return;
        set({ transaction: { label, before: state.document, selectionBefore: state.selection.ids } });
      },
      commitTransaction() {
        const state = get();
        const { transaction } = state;
        if (!transaction) return;
        set({
          transaction: null,
          history: pushCommand(sealHistory(state.history), {
            label: transaction.label,
            before: transaction.before,
            after: state.document,
            selectionBefore: transaction.selectionBefore,
            selectionAfter: state.selection.ids,
            coalesceKey: null,
            time: now(),
          }),
        });
      },
      cancelTransaction() {
        const { transaction } = get();
        if (!transaction) return;
        restore(transaction.before, transaction.selectionBefore);
        set({ transaction: null });
      },

      /* ── history ────────────────────────────────────────────────── */
      undo() {
        const state = get();
        if (state.transaction) state.commitTransaction();
        const result = undoCommand(get().history);
        if (!result) return;
        restore(result.command.before, result.command.selectionBefore);
        set({ history: result.history });
      },
      redo() {
        const result = redoCommand(get().history);
        if (!result) return;
        restore(result.command.after, result.command.selectionAfter);
        set({ history: result.history });
      },
      sealHistory() {
        set((state) => ({ history: sealHistory(state.history) }));
      },

      /* ── clipboard (shared across templates via localStorage) ───── */
      copy(ids = get().selection.ids) {
        const targets = new Set(ids);
        const elements = get().document.elements.filter((element) => targets.has(element.id));
        if (elements.length === 0) return;
        memoryClipboard = structuredClone(elements);
        writeClipboard(memoryClipboard);
      },
      cut(ids = get().selection.ids) {
        get().copy(ids);
        get().removeElements(ids, { label: 'قص' });
      },
      paste() {
        const source = readClipboard() || memoryClipboard;
        if (!source?.length) return [];
        const copies = cloneWithGroups(source, { dx: PASTE_OFFSET, dy: PASTE_OFFSET });
        // Successive pastes cascade instead of stacking on the same spot.
        memoryClipboard = copies;
        writeClipboard(copies);
        get().addElements(copies, { label: 'لصق' });
        return copies;
      },

      /* ── selection ──────────────────────────────────────────────── */
      select(ids) {
        const existing = new Set(get().document.elements.map((element) => element.id));
        set({ selection: { ids: [...new Set(ids)].filter((id) => existing.has(id)) } });
      },
      /** Click selection: whole groups, Shift adds/removes. */
      selectExpanded(ids, { additive = false } = {}) {
        const all = get().document.elements;
        const expanded = expandToGroups(ids, all);
        if (!additive) {
          get().select(expanded);
          return;
        }
        const current = get().selection.ids;
        const allIn = expanded.every((id) => current.includes(id));
        get().select(allIn ? current.filter((id) => !expanded.includes(id)) : [...current, ...expanded]);
      },
      toggleSelect(id) {
        const { ids } = get().selection;
        get().select(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
      },
      clearSelection() {
        if (get().selection.ids.length) set({ selection: { ids: [] } });
      },
      selectAll() {
        get().select(get().document.elements.filter((element) => element.visible !== false && !element.locked).map((element) => element.id));
      },

      /* ── viewport ───────────────────────────────────────────────── */
      setViewport(patch) {
        set((state) => {
          const next = { ...state.viewport, ...patch };
          next.zoom = clamp(Number(next.zoom) || 1, ZOOM_MIN, ZOOM_MAX);
          return { viewport: next };
        });
      },
      /** Zoom keeping the document point under `focus` (viewport px) fixed. */
      zoomTo(zoom, focus) {
        const { viewport } = get();
        const nextZoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
        const fx = focus?.x ?? viewport.width / 2;
        const fy = focus?.y ?? viewport.height / 2;
        const docX = (fx - viewport.x) / viewport.zoom;
        const docY = (fy - viewport.y) / viewport.zoom;
        get().setViewport({ zoom: nextZoom, x: fx - docX * nextZoom, y: fy - docY * nextZoom });
      },
      /** Fit a document-space rect (default: whole page) into the viewport. */
      zoomToFit(rect, { padding = 32, maxZoom = ZOOM_MAX } = {}) {
        const { viewport, document } = get();
        if (!viewport.width || !viewport.height) return;
        const target = rect || { x: 0, y: 0, width: document.width, height: document.height };
        const zoom = clamp(Math.min(
          (viewport.width - padding * 2) / Math.max(1, target.width),
          (viewport.height - padding * 2) / Math.max(1, target.height),
          maxZoom,
        ), ZOOM_MIN, ZOOM_MAX);
        get().setViewport({
          zoom,
          x: (viewport.width - target.width * zoom) / 2 - target.x * zoom,
          y: (viewport.height - target.height * zoom) / 2 - target.y * zoom,
        });
      },

      stepZoom(direction) {
        get().zoomTo(nextZoomStep(get().viewport.zoom, direction));
      },

      /* ── ui ───────────────────────────────────────────────────────── */
      setUi(patch) {
        set((state) => ({ ui: { ...state.ui, ...patch } }));
      },
      togglePanel(id) {
        set((state) => ({ ui: { ...state.ui, activePanel: state.ui.activePanel === id ? null : id } }));
      },
      setBoxes(boxes) {
        set({ boxes });
      },
    };
  });
}

/* ── selectors ─────────────────────────────────────────────────────── */
export const selectDocument = (state) => state.document;
export const selectElements = (state) => state.document.elements;
export const selectSelectionIds = (state) => state.selection.ids;
export const selectCanUndo = (state) => state.history.past.length > 0;
export const selectCanRedo = (state) => state.history.future.length > 0;
export const selectIsDirty = (state) => state.document !== state.savedDocument;
export const selectZoom = (state) => state.viewport.zoom;

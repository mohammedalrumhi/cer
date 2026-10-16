import { createElementAt, isTextElement } from './model/elements';

/**
 * Editor commands shared by the context menu, keyboard shortcuts and toolbars, so every entry
 * point behaves the same.
 */

/** Centre of the visible part of the page, in document coordinates. */
export function visibleCenter(store) {
  const { viewport, document } = store.getState();
  if (!viewport.width) return { x: (Number(document.width) || 1123) / 2, y: (Number(document.height) || 794) / 2 };
  return { x: (viewport.width / 2 - viewport.x) / viewport.zoom, y: (viewport.height / 2 - viewport.y) / viewport.zoom };
}

/** Add one or more elements centred on `point` (default: the visible centre) and select them. */
export function insertElements(store, elements, point = visibleCenter(store), { label = 'إضافة' } = {}) {
  const list = Array.isArray(elements) ? elements : [elements];
  if (!list.length) return [];
  const minX = Math.min(...list.map((el) => Number(el.x) || 0));
  const minY = Math.min(...list.map((el) => Number(el.y) || 0));
  const maxX = Math.max(...list.map((el) => (Number(el.x) || 0) + (Number(el.width) || 0)));
  const maxY = Math.max(...list.map((el) => (Number(el.y) || 0) + (Number(el.height) || 40)));
  const dx = point.x - (minX + maxX) / 2;
  const dy = point.y - (minY + maxY) / 2;
  const placed = list.map((el) => ({ ...el, x: Math.round((Number(el.x) || 0) + dx), y: Math.round((Number(el.y) || 0) + dy) }));
  const state = store.getState();
  state.addElements(placed, { label });
  state.setUi({ tool: 'select' });
  return placed;
}

export function insertType(store, type, extra) {
  const [element] = insertElements(store, createElementAt(type, { x: 0, y: 0 }, extra));
  if (element && isTextElement(element)) store.getState().setUi({ editingTextId: element.id });
  return element;
}

export function selectionInfo(state) {
  const selected = state.document.elements.filter((el) => state.selection.ids.includes(el.id));
  const groups = new Set(selected.map((el) => el.groupId || el.id));
  return {
    count: selected.length,
    units: groups.size,
    grouped: selected.some((el) => el.groupId),
    allLocked: selected.length > 0 && selected.every((el) => el.locked),
    anyLocked: selected.some((el) => el.locked),
    allHidden: selected.length > 0 && selected.every((el) => el.visible === false),
    single: selected.length === 1 ? selected[0] : null,
  };
}

export function hasClipboard() {
  try {
    return Boolean(window.localStorage.getItem('cer:clipboard'));
  } catch {
    return false;
  }
}

/** Run a named action on the current selection. */
export function runAction(store, action, arg) {
  const state = store.getState();
  const ids = state.selection.ids;
  const editable = state.document.elements.filter((el) => ids.includes(el.id) && !el.locked).map((el) => el.id);
  switch (action) {
    case 'copy': state.copy(ids); break;
    case 'cut': state.copy(ids); state.removeElements(editable, { label: 'قص' }); break;
    case 'paste': state.paste(); break;
    case 'duplicate': state.duplicateElements(ids); break;
    case 'delete': state.removeElements(editable); break;
    case 'group': state.groupSelection(); break;
    case 'ungroup': state.ungroupSelection(); break;
    case 'lock': state.toggleLocked(ids); break;
    case 'hide': state.toggleHidden(ids); break;
    case 'selectAll': state.selectAll(); break;
    case 'align': state.alignSelection(arg); break;
    case 'alignToPage': state.alignSelection(arg, { toPage: true }); break;
    case 'distribute': state.distributeSelection(arg); break;
    case 'bringForward':
    case 'bringToFront':
    case 'sendBackward':
    case 'sendToBack':
      state.reorderElements(editable, action);
      break;
    case 'editText': {
      const info = selectionInfo(state);
      if (info.single && isTextElement(info.single) && !info.single.locked) state.setUi({ editingTextId: info.single.id });
      break;
    }
    case 'crop': {
      const info = selectionInfo(state);
      if (info.single && ['image', 'frame'].includes(info.single.type) && info.single.src && !info.single.locked) state.setUi({ cropId: info.single.id });
      break;
    }
    default:
      break;
  }
}

import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

/** Selected elements (stable while the selection and those elements are unchanged). */
export function useSelectedElements() {
  return useEditor(useShallow((state) => state.document.elements.filter((el) => state.selection.ids.includes(el.id))));
}

/**
 * Patch the selected elements (or given ids). Consecutive changes of the same keys coalesce into one
 * undo step (typing in a field, dragging a slider) until history is sealed (blur, pointer up).
 */
export function usePatch() {
  const store = useEditorStoreApi();
  return useCallback((patch, { ids, label = 'تعديل', coalesce = true } = {}) => {
    const state = store.getState();
    const targets = ids || state.selection.ids;
    if (!targets.length) return;
    const keys = typeof patch === 'function' ? 'fn' : Object.keys(patch).sort().join(',');
    state.updateElements(targets, (el) => (typeof patch === 'function' ? patch(el) : { ...el, ...patch }), { label, coalesceKey: coalesce ? `${targets.join(',')}:${keys}` : undefined });
  }, [store]);
}

/** Seal the undo step (call on pointer up / commit). */
export function useSeal() {
  const store = useEditorStoreApi();
  return useCallback(() => store.getState().sealHistory(), [store]);
}

/** Value shared by all selected elements, or undefined when they differ. */
export function common(elements, read) {
  if (!elements.length) return undefined;
  const first = read(elements[0]);
  return elements.every((el) => JSON.stringify(read(el)) === JSON.stringify(first)) ? first : undefined;
}

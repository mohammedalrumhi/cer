import { useEffect, useRef } from 'react';
import { useEditorStoreApi } from '../store/EditorStoreContext';

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
}

const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Global editor shortcuts. `e.code` is used for letter shortcuts so they work with an Arabic
 * keyboard layout too (Ctrl+Z is physical Z, whatever the layout prints).
 */
export function useKeyboardShortcuts({ onSave } = {}) {
  const store = useEditorStoreApi();
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (isTypingTarget(event.target)) return;
      const state = store.getState();
      if (state.ui.editingTextId) return;
      const mod = event.ctrlKey || event.metaKey;
      const ids = state.selection.ids;
      const code = event.code;

      if (mod) {
        const handled = {
          KeyZ: () => (event.shiftKey ? state.redo() : state.undo()),
          KeyY: () => state.redo(),
          KeyS: () => onSaveRef.current?.(),
          KeyC: () => state.copy(),
          KeyX: () => state.cut(),
          KeyV: () => state.paste(),
          KeyD: () => state.duplicateElements(),
          KeyA: () => state.selectAll(),
          Equal: () => state.zoomTo(state.viewport.zoom * 1.2),
          NumpadAdd: () => state.zoomTo(state.viewport.zoom * 1.2),
          Minus: () => state.zoomTo(state.viewport.zoom / 1.2),
          NumpadSubtract: () => state.zoomTo(state.viewport.zoom / 1.2),
          Digit0: () => state.zoomTo(1),
          Digit1: () => state.zoomToFit(),
        }[code];
        if (handled) {
          event.preventDefault();
          handled();
        }
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && ids.length) {
        event.preventDefault();
        state.removeElements(ids);
        return;
      }

      if (event.key === 'Escape') {
        state.clearSelection();
        state.setUi({ tool: 'select' });
        return;
      }

      if (ARROWS[event.key] && ids.length) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const [dx, dy] = ARROWS[event.key];
        state.nudge(ids, dx * step, dy * step);
      }
    }

    function handleKeyUp(event) {
      // Arrow nudges coalesce while the key repeats; releasing ends the step.
      if (ARROWS[event.key]) store.getState().sealHistory();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [store]);
}

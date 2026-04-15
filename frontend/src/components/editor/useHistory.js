import { useCallback, useState } from 'react';

/**
 * Undo/redo history for an array of canvas elements.
 * Returns: { elements, setElements, undo, redo, canUndo, canRedo }
 */
export function useHistory(initial) {
  const [state, setState] = useState({
    past: [],
    present: initial ?? [],
    future: [],
  });

  // Push a new snapshot onto the history stack
  const setElements = useCallback((updater) => {
    setState((s) => {
      const next = typeof updater === 'function' ? updater(s.present) : updater;
      return {
        past: [...s.past.slice(-49), s.present],
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        present: prev,
        future: [s.present, ...s.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        past: [...s.past, s.present],
        present: next,
        future: s.future.slice(1),
      };
    });
  }, []);

  return {
    elements: state.present,
    setElements,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}

import { createContext, useContext } from 'react';
import { useStore } from 'zustand';

export const EditorStoreContext = createContext(null);

export function useEditorStoreApi() {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error('useEditor must be used inside <EditorStoreContext.Provider>');
  return store;
}

/** Subscribe to a slice of editor state. */
export function useEditor(selector) {
  return useStore(useEditorStoreApi(), selector);
}

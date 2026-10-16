import { createContext, useContext } from 'react';

/**
 * Data around the document that panels need: branding (logo, colours, text styles), fonts,
 * saved students (preview mode), and callbacks owned by the shell (uploads, saving).
 */
export const EditorDataContext = createContext(null);

export function useEditorData() {
  const value = useContext(EditorDataContext);
  if (!value) throw new Error('useEditorData must be used inside <EditorDataContext.Provider>');
  return value;
}

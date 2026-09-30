import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditorStoreApi } from '../store/EditorStoreContext';
import { ensureCssFontFace, loadRenderKit } from '../render/renderKit';

/**
 * In-place text editing: a textarea over the element, matching its box, rotation and font.
 * The canvas hides the element meanwhile. Enter adds a line; Ctrl/⌘+Enter or blur commits;
 * Escape cancels.
 */
export default function TextEditOverlay({ element, viewport }) {
  const store = useEditorStoreApi();
  const ref = useRef(null);
  const [value, setValue] = useState(String(element.text ?? ''));
  const [fontFamily, setFontFamily] = useState('');
  const doneRef = useRef(false);

  useEffect(() => {
    let alive = true;
    loadRenderKit().then(async (kit) => {
      const { key } = kit.registry.resolve(element.fontFamily, element.fontStyle);
      await ensureCssFontFace(kit, key);
      if (alive) setFontFamily(key);
    });
    return () => { alive = false; };
  }, [element.fontFamily, element.fontStyle]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    node.select();
  }, []);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [value, fontFamily, viewport.zoom]);

  function finish(save) {
    if (doneRef.current) return;
    doneRef.current = true;
    const state = store.getState();
    state.setUi({ editingTextId: null });
    if (save && value !== element.text) state.updateElement(element.id, { text: value }, { label: 'تعديل النص' });
  }

  const zoom = viewport.zoom;
  const fontSize = (Number(element.fontSize) || 28) * zoom;
  const bold = String(element.fontStyle || '').includes('bold');
  const italic = String(element.fontStyle || '').includes('italic');

  return (
    <textarea
      ref={ref}
      dir="auto"
      value={value}
      aria-label="تحرير النص"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(false);
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          finish(true);
        }
      }}
      style={{
        position: 'absolute',
        left: viewport.x + (Number(element.x) || 0) * zoom,
        top: viewport.y + (Number(element.y) || 0) * zoom,
        width: (Number(element.width) || 200) * zoom,
        transform: `rotate(${Number(element.rotation) || 0}deg)`,
        transformOrigin: 'top left',
        fontFamily: fontFamily ? `"${fontFamily}", serif` : 'serif',
        fontSize,
        fontWeight: bold ? 700 : 400,
        fontStyle: italic ? 'italic' : 'normal',
        lineHeight: Number(element.lineHeight) || 1.4,
        letterSpacing: `${(Number(element.letterSpacing) || 0) * zoom}px`,
        color: element.fill || '#0f172a',
        textAlign: element.align || 'center',
        background: 'rgba(255,255,255,0.85)',
        outline: '2px solid #10b981',
        border: 'none',
        borderRadius: 4,
        padding: 0,
        margin: 0,
        resize: 'none',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        zIndex: 20,
      }}
    />
  );
}

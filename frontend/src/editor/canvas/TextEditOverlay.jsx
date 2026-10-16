import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditorStoreApi } from '../store/EditorStoreContext';
import { ensureCssFontFace, loadRenderKit } from '../render/renderKit';
import { fromDisplayTemplate, toDisplayTemplate } from '../model/fieldTokens';
import { editableText } from '../model/textSource';

/**
 * In-place text editing: a textarea over the element (same box, rotation, size and font face).
 * Typing updates the document live and coalesces into a single undo step. Enter adds a line;
 * Ctrl/⌘+Enter, Escape or a click outside finishes. Bound text edits its template, so
 * "{{studentName}}" can be surrounded by words.
 */
export default function TextEditOverlay({ element, op, viewport }) {
  const store = useEditorStoreApi();
  const ref = useRef(null);
  const [fontFamily, setFontFamily] = useState('');
  const source = editableText(element);
  const [value, setValue] = useState(() => toDisplayTemplate(source.value));
  const coalesceKey = `text-edit:${element.id}`;

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

  function change(next) {
    setValue(next);
    store.getState().updateElement(element.id, { [source.key]: fromDisplayTemplate(next) }, { label: 'تعديل النص', coalesceKey });
  }

  function finish() {
    const state = store.getState();
    state.sealHistory();
    state.setUi({ editingTextId: null });
  }

  const zoom = viewport.zoom;
  const fontSize = (op?.layout?.fontSize || Number(element.fontSize) || 28) * zoom;
  const bold = String(element.fontStyle || '').includes('bold');
  const italic = String(element.fontStyle || '').includes('italic');
  const fill = typeof element.fill === 'string' ? element.fill : element.fill?.stops?.[0]?.color || '#0f172a';

  return (
    <textarea
      ref={ref}
      dir="auto"
      value={value}
      aria-label="تحرير النص"
      spellCheck={false}
      onChange={(event) => change(event.target.value)}
      onBlur={finish}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
          event.preventDefault();
          finish();
        }
      }}
      style={{
        position: 'absolute',
        left: viewport.x + (Number(element.x) || 0) * zoom,
        top: viewport.y + ((Number(element.y) || 0) + (op?.offsetY || 0)) * zoom,
        width: (Number(element.width) || 200) * zoom,
        transform: `rotate(${Number(element.rotation) || 0}deg)`,
        transformOrigin: 'top left',
        fontFamily: fontFamily ? `"${fontFamily}", serif` : 'serif',
        fontSize,
        fontWeight: bold ? 700 : 400,
        fontStyle: italic ? 'italic' : 'normal',
        lineHeight: Number(element.lineHeight) || 1.4,
        color: fill,
        textAlign: element.align === 'justify' ? 'justify' : element.align || 'center',
        background: 'rgba(255,255,255,0.88)',
        outline: '2px solid var(--selection)',
        border: 'none',
        borderRadius: 4,
        padding: 0,
        margin: 0,
        resize: 'none',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        caretColor: 'var(--primary)',
        zIndex: 20,
      }}
    />
  );
}

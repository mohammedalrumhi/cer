import { useEffect, useRef } from 'react';
import { insertType, runAction } from './actions';
import { useEditorStoreApi } from './store/EditorStoreContext';

/**
 * Keyboard shortcuts (Lawha's list) and the groups shown in the `?` cheat sheet.
 * `e.code` is used for letters so shortcuts work with an Arabic keyboard layout too.
 */
export const SHORTCUT_GROUPS = [
  {
    title: 'عام',
    items: [
      { keys: ['MOD', 'Z'], label: 'تراجع' },
      { keys: ['MOD', 'Shift', 'Z'], label: 'إعادة' },
      { keys: ['MOD', 'S'], label: 'حفظ الآن' },
      { keys: ['?'], label: 'قائمة الاختصارات' },
      { keys: ['Esc'], label: 'إلغاء التحديد' },
    ],
  },
  {
    title: 'التحرير',
    items: [
      { keys: ['MOD', 'C'], label: 'نسخ' },
      { keys: ['MOD', 'X'], label: 'قص' },
      { keys: ['MOD', 'V'], label: 'لصق' },
      { keys: ['MOD', 'D'], label: 'تكرار' },
      { keys: ['Delete'], label: 'حذف' },
      { keys: ['MOD', 'A'], label: 'تحديد الكل' },
      { keys: ['MOD', 'G'], label: 'تجميع' },
      { keys: ['MOD', 'Shift', 'G'], label: 'فك التجميع' },
      { keys: ['MOD', 'Shift', 'L'], label: 'قفل / فتح القفل' },
      { keys: ['Enter'], label: 'تحرير النص أو قص الصورة' },
    ],
  },
  {
    title: 'الترتيب والتحريك',
    items: [
      { keys: ['←↑→↓'], label: 'تحريك ١ بكسل' },
      { keys: ['Shift', '←↑→↓'], label: 'تحريك ١٠ بكسل' },
      { keys: ['MOD', ']'], label: 'تقديم للأمام' },
      { keys: ['MOD', '['], label: 'إرجاع للخلف' },
      { keys: ['MOD', 'Shift', ']'], label: 'إلى المقدمة' },
      { keys: ['MOD', 'Shift', '['], label: 'إلى الخلفية' },
      { keys: ['Shift', '↻'], label: 'تدوير بخطوات ١٥°' },
      { keys: ['Alt'], label: 'إيقاف المحاذاة الذكية أثناء السحب' },
    ],
  },
  {
    title: 'الإدراج',
    items: [
      { keys: ['T'], label: 'نص' },
      { keys: ['R'], label: 'مستطيل' },
      { keys: ['L'], label: 'خط' },
    ],
  },
  {
    title: 'العرض',
    items: [
      { keys: ['MOD', '+'], label: 'تكبير' },
      { keys: ['MOD', '−'], label: 'تصغير' },
      { keys: ['MOD', '0'], label: 'ملاءمة الشاشة' },
      { keys: ['MOD', '1'], label: 'الحجم الفعلي' },
      { keys: ['MOD', 'عجلة'], label: 'تكبير عند المؤشر' },
      { keys: ['Space', 'سحب'], label: 'تحريك اللوحة' },
    ],
  },
];

const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
}

export function useKeyboardShortcuts({ onSave } = {}) {
  const store = useEditorStoreApi();
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (isTypingTarget(event.target) || event.defaultPrevented) return;
      const state = store.getState();
      if (state.ui.editingTextId) return;
      if (state.ui.cropId) {
        if (event.key === 'Enter') state.setUi({ cropId: null });
        else if (event.key === 'Escape') state.setUi({ cropCancelled: true, cropId: null });
        else return;
        event.preventDefault();
        return;
      }
      if (state.ui.mode === 'preview' && !(event.ctrlKey || event.metaKey)) return;
      const mod = event.ctrlKey || event.metaKey;
      const ids = state.selection.ids;
      const code = event.code;
      let handled = true;

      if (mod && !event.altKey) {
        if (code === 'KeyZ') (event.shiftKey ? state.redo : state.undo)();
        else if (code === 'KeyY') state.redo();
        else if (code === 'KeyS') onSaveRef.current?.();
        else if (code === 'KeyC') runAction(store, 'copy');
        else if (code === 'KeyX') runAction(store, 'cut');
        else if (code === 'KeyV') runAction(store, 'paste');
        else if (code === 'KeyD') runAction(store, 'duplicate');
        else if (code === 'KeyA') state.selectAll();
        else if (code === 'KeyG') runAction(store, event.shiftKey ? 'ungroup' : 'group');
        else if (code === 'KeyL' && event.shiftKey) runAction(store, 'lock');
        else if (code === 'BracketRight') runAction(store, event.shiftKey ? 'bringToFront' : 'bringForward');
        else if (code === 'BracketLeft') runAction(store, event.shiftKey ? 'sendToBack' : 'sendBackward');
        else if (code === 'Equal' || code === 'NumpadAdd') state.stepZoom(1);
        else if (code === 'Minus' || code === 'NumpadSubtract') state.stepZoom(-1);
        else if (code === 'Digit0' || code === 'Numpad0') state.zoomToFit(null, { padding: 48 });
        else if (code === 'Digit1' || code === 'Numpad1') state.zoomTo(1);
        else handled = false;
      } else if (!mod && !event.altKey) {
        const step = event.shiftKey ? 10 : 1;
        if ((event.key === 'Delete' || event.key === 'Backspace') && ids.length) runAction(store, 'delete');
        else if (ARROWS[event.key] && ids.length) {
          const [dx, dy] = ARROWS[event.key];
          state.nudge(ids, dx * step, dy * step);
        } else if (event.key === 'Escape') {
          if (state.ui.shortcutsOpen) state.setUi({ shortcutsOpen: false });
          else {
            state.clearSelection();
            state.setUi({ tool: 'select' });
          }
        } else if (event.key === '?' || (event.shiftKey && code === 'Slash')) state.setUi({ shortcutsOpen: true });
        else if (code === 'KeyT' && !event.shiftKey) insertType(store, 'text');
        else if (code === 'KeyR' && !event.shiftKey) insertType(store, 'rect');
        else if (code === 'KeyL' && !event.shiftKey) insertType(store, 'line');
        else if (event.key === 'Enter' && ids.length === 1) {
          const element = state.document.elements.find((el) => el.id === ids[0]);
          if (element && ['image', 'frame'].includes(element.type)) runAction(store, 'crop');
          else runAction(store, 'editText');
        } else handled = false;
      } else handled = false;

      if (handled) event.preventDefault();
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

import { useEffect, useRef } from 'react';
import { useEditorStoreApi } from '../store/EditorStoreContext';
import { runElementAction } from './elementActions';

const ITEMS = [
  { id: 'copy', label: 'نسخ', shortcut: 'Ctrl+C', needsSelection: true },
  { id: 'paste', label: 'لصق', shortcut: 'Ctrl+V' },
  { id: 'duplicate', label: 'تكرار', shortcut: 'Ctrl+D', needsSelection: true },
  { id: 'lock', label: 'قفل / فتح', needsSelection: true },
  null,
  { id: 'bringToFront', label: 'إلى المقدمة', needsSelection: true },
  { id: 'bringForward', label: 'للأمام', needsSelection: true },
  { id: 'sendBackward', label: 'للخلف', needsSelection: true },
  { id: 'sendToBack', label: 'إلى الخلفية', needsSelection: true },
  null,
  { id: 'delete', label: 'حذف', shortcut: 'Delete', needsSelection: true, danger: true },
];

export default function ContextMenu({ x, y, hasSelection, onClose }) {
  const store = useEditorStoreApi();
  const ref = useRef(null);

  useEffect(() => {
    const close = (event) => { if (!ref.current?.contains(event.target)) onClose(); };
    const escape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', escape);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - 200);
  const top = Math.min(y, window.innerHeight - 360);

  return (
    <div
      ref={ref}
      role="menu"
      dir="rtl"
      style={{ position: 'fixed', left, top, zIndex: 1000 }}
      className="w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl"
    >
      {ITEMS.map((item, index) => (item === null ? (
        <div key={`sep-${index}`} className="my-1 border-t border-slate-100" />
      ) : (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.needsSelection && !hasSelection}
          onClick={() => { runElementAction(store, item.id); onClose(); }}
          className={`flex w-full items-center justify-between px-4 py-2 text-right hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${item.danger ? 'text-rose-600' : 'text-slate-700'}`}
        >
          <span>{item.label}</span>
          {item.shortcut && <span dir="ltr" className="text-[11px] text-slate-400">{item.shortcut}</span>}
        </button>
      )))}
    </div>
  );
}

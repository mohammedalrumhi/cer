import { Database, Layers, LayoutTemplate, Palette, Shapes, Stamp, Type, Upload } from 'lucide-react';
import { S } from '../../strings.ar';
import { cx } from '../../ui/cx';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

const RAIL_ITEMS = [
  { id: 'templates', icon: LayoutTemplate },
  { id: 'elements', icon: Shapes },
  { id: 'text', icon: Type },
  { id: 'fields', icon: Database },
  { id: 'uploads', icon: Upload },
  { id: 'brand', icon: Stamp },
  { id: 'backgrounds', icon: Palette },
  { id: 'layers', icon: Layers },
];

/** Panel rail on the right (RTL inline-start). */
export function IconRail() {
  const store = useEditorStoreApi();
  const active = useEditor((state) => state.ui.activePanel);
  return (
    <nav aria-label="لوحات المحرر" className="flex w-[72px] shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-e border-border bg-surface py-2">
      {RAIL_ITEMS.map(({ id, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            aria-controls="editor-side-panel"
            data-testid={`rail-${id}`}
            onClick={() => store.getState().togglePanel(id)}
            className={cx('group flex w-[64px] flex-col items-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors', isActive ? 'text-primary' : 'text-fg-muted hover:text-fg')}
          >
            <span className={cx('grid size-9 place-items-center rounded-md transition-all duration-200', isActive ? 'bg-brand text-white shadow-md' : 'group-hover:scale-105 group-hover:bg-surface-2')}>
              <Icon size={19} strokeWidth={isActive ? 2.1 : 1.8} />
            </span>
            {S.editor.rail[id]}
          </button>
        );
      })}
    </nav>
  );
}

import { lazy, Suspense, useState } from 'react';
import { Search, X } from 'lucide-react';
import { S } from '../../strings.ar';
import { IconButton } from '../../ui/Button';
import { LoadingState } from '../../ui/States';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

const PANELS = {
  templates: lazy(() => import('../panels/TemplatesPanel')),
  elements: lazy(() => import('../panels/ElementsPanel')),
  text: lazy(() => import('../panels/TextPanel')),
  fields: lazy(() => import('../panels/FieldsPanel')),
  uploads: lazy(() => import('../panels/UploadsPanel')),
  brand: lazy(() => import('../panels/BrandPanel')),
  backgrounds: lazy(() => import('../panels/BackgroundsPanel')),
  layers: lazy(() => import('../panels/LayersPanel')),
};

/** Slide-in panel next to the rail, with a search box shared by every panel. */
export function SidePanel({ overlay = false }) {
  const store = useEditorStoreApi();
  const active = useEditor((state) => state.ui.activePanel);
  const [queries, setQueries] = useState({});
  const Panel = PANELS[active];
  if (!Panel) return null;
  const title = S.editor.rail[active];
  const query = queries[active] || '';
  return (
    <aside
      id="editor-side-panel"
      key={active}
      aria-label={title}
      data-testid={`panel-${active}`}
      className={`flex w-[320px] shrink-0 animate-panel-in flex-col border-e border-border bg-surface ${overlay ? 'absolute inset-y-0 start-[72px] z-30 shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <h2 className="text-md font-bold">{title}</h2>
        <IconButton icon={X} label={S.editor.closePanel} size="xs" onClick={() => store.getState().setUi({ activePanel: null })} />
      </div>
      {active !== 'brand' && (
        <div className="px-4 pb-3">
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQueries((prev) => ({ ...prev, [active]: e.target.value }))} placeholder={S.editor.searchIn(title)} className="field field-sm ps-8" aria-label={S.editor.searchIn(title)} />
          </label>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <Suspense fallback={<LoadingState />}>
          <Panel query={query.trim()} />
        </Suspense>
      </div>
    </aside>
  );
}

import { useEffect, useState } from 'react';
import { LayoutTemplate, Palette, Replace, Wallpaper } from 'lucide-react';
import { applyPaletteOf } from '@shared/templates/index.js';
import { fetchTemplate, fetchTemplates } from '../../api/client';
import { TemplateThumbnail } from '../../components/gallery/TemplateThumbnail';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { EmptyState, ErrorState, Skeleton } from '../../ui/States';
import { toast } from '../../ui/toast';
import { useEditorData } from '../EditorDataContext';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

/**
 * The template gallery inside the editor: replace the whole design (with confirmation), or take
 * only its colours or only its background.
 */
export default function TemplatesPanel({ query }) {
  const store = useEditorStoreApi();
  const { branding, starterTemplates = [] } = useEditorData();
  const currentId = useEditor((state) => state.document.id);
  const [templates, setTemplates] = useState(null);
  const [error, setError] = useState(false);
  const [chosen, setChosen] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchTemplates().then((list) => { if (alive) setTemplates(list); }, () => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);

  async function full(template) {
    return template.elements ? template : fetchTemplate(template.id);
  }

  async function apply(mode) {
    const source = await full(chosen);
    const state = store.getState();
    if (mode === 'all') {
      const { id: _id, name: _name, version: _v, availableBackgroundVariants: _a, ...design } = source;
      state.replaceDocument({ ...state.document, ...design }, { label: 'تطبيق قالب' });
      state.zoomToFit(null, { padding: 48 });
      toast.success('طُبّق القالب. يمكنك التراجع بـ Ctrl+Z.');
    } else if (mode === 'colors') {
      state.replaceDocument(applyPaletteOf(state.document, source), { label: 'تطبيق ألوان قالب' });
      toast.success('طُبّقت الألوان.');
    } else {
      state.updateDocument((doc) => ({ ...doc, background: { ...source.background } }), { label: 'تطبيق خلفية قالب' });
      toast.success('طُبّقت الخلفية.');
    }
    setChosen(null);
  }

  const all = [...starterTemplates, ...(templates || []).filter((t) => t.id !== currentId)];
  const shown = all.filter((t) => !query || String(t.name).includes(query) || String(t.categoryLabel || '').includes(query));

  return (
    <div className="flex flex-col gap-3">
      {error && <ErrorState body="تعذّر تحميل القوالب." />}
      {!templates && !error && <div className="grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[0.75]" />)}</div>}
      {templates && shown.length === 0 && <EmptyState compact icon={LayoutTemplate} title="لا توجد قوالب مطابقة" />}
      <div className="grid grid-cols-2 gap-2">
        {shown.map((template) => (
          <button key={template.id} type="button" onClick={() => setChosen(template)} className="group flex flex-col gap-1 rounded-md p-1 text-start transition hover:bg-surface-2" data-testid="panel-template">
            <TemplateThumbnail template={template} branding={branding} className="w-full rounded-sm shadow-sm ring-1 ring-black/5 transition group-hover:shadow-md" />
            <span className="line-clamp-1 px-0.5 text-2xs font-semibold">{template.name}</span>
          </button>
        ))}
      </div>
      <Dialog
        open={Boolean(chosen)}
        onOpenChange={(open) => { if (!open) setChosen(null); }}
        icon={LayoutTemplate}
        title={`استخدام «${chosen?.name || ''}»`}
        description="اختر ما تريد أخذه من هذا القالب. يمكنك التراجع دائمًا."
        size="sm"
      >
        <div className="flex flex-col gap-2">
          <Button variant="primary" icon={Replace} onClick={() => apply('all')} className="justify-start">استبدال التصميم كاملًا</Button>
          <Button icon={Palette} onClick={() => apply('colors')} className="justify-start">تطبيق الألوان فقط</Button>
          <Button icon={Wallpaper} onClick={() => apply('background')} className="justify-start">تطبيق الخلفية فقط</Button>
        </div>
      </Dialog>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { BookmarkPlus, History, RotateCcw } from 'lucide-react';
import { createVersion, fetchVersion, fetchVersions, restoreVersion } from '../../api/client';
import { TemplateThumbnail } from '../../components/gallery/TemplateThumbnail';
import { S } from '../../strings.ar';
import { Button } from '../../ui/Button';
import { confirm } from '../../ui/confirm';
import { cx } from '../../ui/cx';
import { Dialog } from '../../ui/Dialog';
import { formatDateTime, formatRelativeTime } from '../../ui/format';
import { EmptyState, ErrorState, LoadingState } from '../../ui/States';
import { toast } from '../../ui/toast';
import { useEditorData } from '../EditorDataContext';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

const KIND_LABELS = { named: 'نسخة محفوظة', auto: 'حفظ تلقائي', beforeRestore: 'قبل الاستعادة' };

/** Named versions, automatic snapshots, preview and restore. */
export function VersionHistoryDialog({ flush }) {
  const store = useEditorStoreApi();
  const { branding } = useEditorData();
  const open = useEditor((state) => state.ui.dialog === 'versions');
  const templateId = useEditor((state) => state.document.id);
  const [versions, setVersions] = useState(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      await flush?.();
      const list = await fetchVersions(templateId);
      setVersions(list);
      setSelected((current) => current ?? list[0]?.id ?? null);
      setError(false);
    } catch {
      setError(true);
    }
  }, [templateId, flush]);

  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [open, load]);

  useEffect(() => {
    if (!open || !selected) return undefined;
    let alive = true;
    fetchVersion(templateId, selected).then((version) => { if (alive) setDetail(version); }, () => {});
    return () => { alive = false; };
  }, [open, selected, templateId]);

  async function save() {
    setBusy('save');
    try {
      await flush?.();
      const version = await createVersion(templateId, name.trim());
      setName('');
      toast.success('حُفظت النسخة');
      await load();
      setSelected(version.id);
    } catch {
      toast.error('تعذّر حفظ النسخة.');
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    const ok = await confirm({ title: 'استعادة هذه النسخة؟', body: 'ستُحفظ النسخة الحالية في السجل أولًا، فيمكنك الرجوع إليها.', confirmLabel: 'استعادة' });
    if (!ok) return;
    setBusy('restore');
    try {
      await flush?.();
      const restored = await restoreVersion(templateId, selected);
      store.getState().loadDocument(restored);
      store.getState().setUi({ dialog: null });
      toast.success('استُعيدت النسخة');
    } catch {
      toast.error('تعذّرت الاستعادة.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => store.getState().setUi({ dialog: next ? 'versions' : null })} icon={History} title={S.editor.versions} size="xl">
      <div className="grid min-h-[420px] gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input className="field field-sm flex-1" placeholder="اسم النسخة (اختياري)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
            <Button size="sm" variant="primary" icon={BookmarkPlus} loading={busy === 'save'} onClick={save} data-testid="save-version">حفظ نسخة</Button>
          </div>
          {error && <ErrorState onRetry={load} />}
          {!versions && !error && <LoadingState />}
          {versions?.length === 0 && <EmptyState compact icon={History} title="لا توجد نسخ بعد" body="احفظ نسخة باسم قبل التعديلات الكبيرة، وسيحفظ النظام نسخًا تلقائية أيضًا." />}
          <ul className="flex max-h-[360px] flex-col gap-1 overflow-y-auto">
            {versions?.map((version) => (
              <li key={version.id}>
                <button type="button" onClick={() => { setDetail(null); setSelected(version.id); }} className={cx('w-full rounded-md border px-3 py-2 text-start', selected === version.id ? 'border-primary bg-primary-50' : 'border-transparent hover:bg-surface-2')}>
                  <span className="block text-sm font-semibold">{version.name || KIND_LABELS[version.kind] || 'نسخة'}</span>
                  <span className="block text-2xs text-fg-muted" title={formatDateTime(version.createdAt)}>{formatRelativeTime(version.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-md bg-canvas p-4">
          {detail?.template ? (
            <>
              <TemplateThumbnail template={{ ...detail.template, id: `version-${detail.id}`, updatedAt: detail.createdAt }} branding={branding} className="mx-auto max-h-[420px] w-full max-w-[560px] rounded-sm shadow-md" />
              <Button variant="primary" icon={RotateCcw} loading={busy === 'restore'} onClick={restore} className="self-center">استعادة هذه النسخة</Button>
            </>
          ) : selected ? <LoadingState /> : null}
        </div>
      </div>
    </Dialog>
  );
}

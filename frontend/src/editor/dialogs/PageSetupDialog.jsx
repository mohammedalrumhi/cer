import { useState } from 'react';
import { FileCog } from 'lucide-react';
import { S } from '../../strings.ar';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Dialog } from '../../ui/Dialog';
import { formatNumber } from '../../ui/format';
import { Segmented } from '../../ui/Segmented';
import { NumberField } from '../controls/fields';
import { PAGE_SIZES, matchPageSize } from '../model/pageSizes';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

/** Page size (presets or custom), margins and bleed, with an option to scale the design. */
export function PageSetupDialog() {
  const store = useEditorStoreApi();
  const open = useEditor((state) => state.ui.dialog === 'pageSetup');
  const document = useEditor((state) => state.document);
  const [draft, setDraft] = useState(null);
  const current = draft || {
    width: Math.round(document.width),
    height: Math.round(document.height),
    margins: document.page?.margins || { top: 0, right: 0, bottom: 0, left: 0 },
    bleed: document.page?.bleed || 0,
    scaleContent: true,
  };
  const set = (patch) => setDraft({ ...current, ...patch });
  const close = () => {
    setDraft(null);
    store.getState().setUi({ dialog: null });
  };
  const preset = matchPageSize(current.width, current.height);

  function apply() {
    const sx = current.width / Number(document.width);
    const sy = current.height / Number(document.height);
    const scale = Math.min(sx, sy);
    const offsetX = (current.width - Number(document.width) * scale) / 2;
    const offsetY = (current.height - Number(document.height) * scale) / 2;
    store.getState().updateDocument((doc) => ({
      ...doc,
      width: current.width,
      height: current.height,
      orientation: current.width >= current.height ? 'landscape' : 'portrait',
      page: { ...(doc.page || {}), margins: current.margins, bleed: current.bleed },
      elements: current.scaleContent && (sx !== 1 || sy !== 1)
        ? doc.elements.map((el) => {
          const next = { ...el, x: Math.round((Number(el.x) || 0) * scale + offsetX), y: Math.round((Number(el.y) || 0) * scale + offsetY), width: Math.round((Number(el.width) || 0) * scale) };
          if (el.height !== undefined) next.height = Math.round(Number(el.height) * scale);
          if (el.fontSize) next.fontSize = Math.round(Number(el.fontSize) * scale * 10) / 10;
          if (el.strokeWidth) next.strokeWidth = Math.round(Number(el.strokeWidth) * scale * 10) / 10;
          return next;
        })
        : doc.elements,
    }), { label: 'إعداد الصفحة' });
    store.getState().zoomToFit(null, { padding: 48 });
    close();
  }

  const margin = (side) => (value) => set({ margins: { ...current.margins, [side]: value } });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) close(); }}
      icon={FileCog}
      title={S.editor.pageSetup}
      size="lg"
      footer={(
        <>
          <Button onClick={close}>{S.common.cancel}</Button>
          <Button variant="primary" onClick={apply} data-testid="page-setup-apply">{S.common.apply}</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PAGE_SIZES.map((size) => (
            <button
              key={size.id}
              type="button"
              onClick={() => set({ width: size.width, height: size.height })}
              className={cx('flex items-center gap-3 rounded-md border p-2.5 text-start transition', preset?.id === size.id ? 'border-primary bg-primary-50' : 'border-border hover:border-border-strong')}
            >
              <span className="grid size-10 shrink-0 place-items-center">
                <span className="block rounded-[2px] border-2 border-current text-primary" style={{ width: size.width >= size.height ? 34 : 34 * (size.width / size.height), height: size.width >= size.height ? 34 * (size.height / size.width) : 34 }} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{size.label}</span>
                <span className="block text-2xs text-fg-subtle">{`${formatNumber(size.width)} × ${formatNumber(size.height)}`}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="العرض" value={current.width} min={100} max={8000} onChange={(width) => set({ width })} />
          <NumberField label="الارتفاع" value={current.height} min={100} max={8000} onChange={(height) => set({ height })} />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-bold text-fg-subtle">الهوامش (خطوط إرشادية لا تُطبع)</h3>
          <div className="grid grid-cols-4 gap-2">
            <NumberField label="أعلى" value={current.margins.top} min={0} onChange={margin('top')} />
            <NumberField label="يمين" value={current.margins.right} min={0} onChange={margin('right')} />
            <NumberField label="أسفل" value={current.margins.bottom} min={0} onChange={margin('bottom')} />
            <NumberField label="يسار" value={current.margins.left} min={0} onChange={margin('left')} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <NumberField label="حدّ القص (النزيف)" value={current.bleed} min={0} max={60} onChange={(bleed) => set({ bleed })} className="w-56" />
          <Segmented size="sm" value={current.scaleContent ? 'scale' : 'keep'} onChange={(value) => set({ scaleContent: value === 'scale' })} options={[{ value: 'scale', label: 'تكبير/تصغير المحتوى' }, { value: 'keep', label: 'إبقاء المحتوى كما هو' }]} />
        </div>
      </div>
    </Dialog>
  );
}

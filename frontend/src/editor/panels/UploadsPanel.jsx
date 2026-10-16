import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import { buildAssetUrl, deleteAsset, fetchAssets, uploadAsset } from '../../api/client';
import { Button } from '../../ui/Button';
import { confirm } from '../../ui/confirm';
import { cx } from '../../ui/cx';
import { EmptyState, ErrorState, Skeleton } from '../../ui/States';
import { toast } from '../../ui/toast';
import { DraggableTile } from '../dnd/EditorDnd';
import { useEditorData } from '../EditorDataContext';

/** The uploads library: images stored as files on the server, reusable in every design. */
export default function UploadsPanel({ query }) {
  const { assetsVersion = 0 } = useEditorData();
  const [assets, setAssets] = useState([]);
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(() => fetchAssets().then((list) => { setAssets(list); setStatus('ready'); }, () => setStatus('error')), []);
  useEffect(() => { load(); }, [load, assetsVersion]);

  async function upload(files) {
    const images = [...files].filter((file) => file.type.startsWith('image/'));
    if (!images.length) return;
    setBusy(true);
    try {
      const added = [];
      for (const file of images) added.push(await uploadAsset(file));
      setAssets((prev) => [...added.reverse(), ...prev]);
      toast.success(images.length > 1 ? `رُفعت ${images.length} صور` : 'رُفعت الصورة');
    } catch {
      toast.error('تعذّر رفع الصورة. يُقبل PNG وJPG وWebP وSVG.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(asset) {
    const ok = await confirm({ title: 'حذف الصورة؟', body: 'ستُحذف من مكتبة الرفع. التصاميم التي تستخدمها ستظهر مكانها فارغًا.', confirmLabel: 'حذف', danger: true });
    if (!ok) return;
    try {
      await deleteAsset(asset.id);
      setAssets((prev) => prev.filter((item) => item.id !== asset.id));
    } catch {
      toast.error('تعذّر حذف الصورة.');
    }
  }

  const shown = assets.filter((asset) => !query || String(asset.name).includes(query));
  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
        className={cx('flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-4 text-center text-xs text-fg-muted transition-colors', over ? 'border-primary bg-primary-50' : 'border-border-strong')}
      >
        <UploadCloud size={22} className="text-primary" aria-hidden />
        اسحب الصور إلى هنا أو
        <Button variant="soft" size="sm" icon={ImagePlus} loading={busy} onClick={() => inputRef.current?.click()} data-testid="upload-image">اختر صورًا</Button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      </div>
      {status === 'loading' && <div className="grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square" />)}</div>}
      {status === 'error' && <ErrorState onRetry={() => { setStatus('loading'); load(); }} />}
      {status === 'ready' && assets.length === 0 && <EmptyState compact icon={ImagePlus} title="لا توجد صور بعد" body="ارفع شعارًا أو صورة أو زخرفة لتستخدمها في تصاميمك." />}
      <div className="grid grid-cols-2 gap-2">
        {shown.map((asset) => {
          const src = buildAssetUrl(asset.path);
          const preview = <img src={src} alt="" className="max-h-16 max-w-16 object-contain" />;
          return (
            <div key={asset.id} className="group relative">
              <DraggableTile id={`asset-${asset.id}`} label={asset.name} payload={{ asset, preview }} className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-border bg-[repeating-conic-gradient(#eee_0%_25%,#fff_0%_50%)] bg-[length:14px_14px] p-1 hover:border-primary/50">
                <img src={src} alt={asset.name} className="max-h-full max-w-full object-contain" loading="lazy" />
              </DraggableTile>
              <button type="button" onClick={() => remove(asset)} aria-label="حذف الصورة" className="absolute end-1 top-1 grid size-7 place-items-center rounded-sm bg-surface/90 text-danger opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

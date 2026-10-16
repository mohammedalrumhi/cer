import { useEffect, useRef, useState } from 'react';
import { ImageMinus, ImagePlus } from 'lucide-react';
import { paintToCss } from '@shared/render/index.js';
import { buildAssetUrl, fetchAssets, fetchBackgrounds, uploadAsset } from '../../api/client';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Slider } from '../../ui/Slider';
import { Skeleton } from '../../ui/States';
import { toast } from '../../ui/toast';
import { ColorPicker } from '../color/ColorPicker';
import { useEditorData } from '../EditorDataContext';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

const SOLIDS = ['#FFFFFF', '#FBF8F1', '#F6F0E2', '#EEF5F1', '#F1F4F8', '#FBF2F4', '#F5F7F8', '#0F6B52', '#1C3156', '#3D2A12'];
const GRADIENTS = [
  { type: 'linear', angle: 180, stops: [{ offset: 0, color: '#FFFDF8' }, { offset: 1, color: '#F2E8D3' }] },
  { type: 'radial', stops: [{ offset: 0, color: '#FFFFFF' }, { offset: 1, color: '#EFE6D2' }] },
  { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#F1F8F4' }, { offset: 1, color: '#D9EDE3' }] },
  { type: 'linear', angle: 160, stops: [{ offset: 0, color: '#0B5843' }, { offset: 1, color: '#062F24' }] },
  { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#F7F3FB' }, { offset: 1, color: '#E7DDF2' }] },
  { type: 'radial', stops: [{ offset: 0, color: '#FFF8EA' }, { offset: 1, color: '#EBD7A4' }] },
];

/** Backgrounds: solid, gradient, Islamic frames, the Itqan colour variants and uploads. */
export default function BackgroundsPanel({ query }) {
  const store = useEditorStoreApi();
  const { branding } = useEditorData();
  const background = useEditor((state) => state.document.background) || {};
  const [library, setLibrary] = useState(null);
  const [assets, setAssets] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchBackgrounds().catch(() => []), fetchAssets().catch(() => [])]).then(([bgs, uploads]) => {
      if (!alive) return;
      setLibrary(bgs);
      setAssets(uploads);
    });
    return () => { alive = false; };
  }, []);

  const set = (patch, label = 'تغيير الخلفية') => store.getState().updateDocument((doc) => {
    const next = { ...doc.background, ...patch };
    delete next.missing;
    return { ...doc, background: next };
  }, { label });
  const setPaint = (paint) => (typeof paint === 'string' ? set({ color: paint, fill: null }) : set({ fill: paint }));
  const setImage = (item) => set({ type: 'image', imagePath: item.path, customLayout: true, ...(item.color ? { color: item.color, accentColor: item.accentColor } : {}) });
  const current = background.fill || background.color || '#FFFFFF';
  const match = (item) => !query || String(item.label || item.name || '').includes(query);
  const frames = (library || []).filter((item) => item.category === 'frames' && match(item));
  const itqan = (library || []).filter((item) => item.category === 'itqan' && match(item));

  async function upload(file) {
    if (!file) return;
    try {
      const asset = await uploadAsset(file);
      setAssets((prev) => [asset, ...prev]);
      setImage(asset);
    } catch {
      toast.error('تعذّر رفع صورة الخلفية.');
    }
  }

  const imageTile = (item, label) => (
    <button
      key={item.key || item.id}
      type="button"
      title={label}
      aria-label={label}
      onClick={() => setImage(item)}
      className={cx('group relative aspect-[0.71] overflow-hidden rounded-sm border bg-surface-2 transition hover:-translate-y-0.5 hover:shadow-md', background.imagePath === item.path ? 'border-primary ring-2 ring-primary/30' : 'border-border')}
    >
      <img src={buildAssetUrl(item.path)} alt="" loading="lazy" className="h-full w-full object-cover" />
      <span className="absolute inset-x-0 bottom-0 truncate bg-black/45 px-1 py-0.5 text-[10px] text-white">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="mb-2 text-xs font-bold text-fg-subtle">لون الخلفية</h3>
        <div className="flex flex-wrap items-center gap-2">
          {SOLIDS.map((color) => (
            <button key={color} type="button" aria-label={color} title={color} onClick={() => setPaint(color)} className={cx('size-8 rounded-full border border-black/10 shadow-sm', !background.fill && background.color?.toUpperCase() === color && 'ring-2 ring-primary ring-offset-2 ring-offset-surface')} style={{ background: color }} />
          ))}
          {(branding?.colors || []).map((color) => (
            <button key={`b${color}`} type="button" aria-label={color} title={color} onClick={() => setPaint(color)} className="size-8 rounded-full border border-black/10 shadow-sm" style={{ background: color }} />
          ))}
          <ColorPicker label="لون أو تدرّج مخصص" value={current} allowGradient onChange={(paint) => paint && setPaint(paint)} brandColors={branding?.colors} />
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-bold text-fg-subtle">تدرّجات</h3>
        <div className="grid grid-cols-3 gap-2">
          {GRADIENTS.map((gradient, index) => (
            <button key={index} type="button" aria-label={`تدرّج ${index + 1}`} onClick={() => set({ fill: gradient })} className="aspect-[1.4] rounded-sm border border-border shadow-sm transition hover:-translate-y-0.5" style={{ background: paintToCss(gradient) }} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-fg-subtle">صورة الخلفية</h3>
          {background.imagePath && <Button size="xs" variant="ghost" icon={ImageMinus} onClick={() => set({ type: 'solid', imagePath: null })}>إزالة الصورة</Button>}
        </div>
        {background.imagePath && (
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            الشفافية
            <Slider className="flex-1" label="شفافية صورة الخلفية" min={0} max={100} value={Math.round((background.imageOpacity ?? 1) * 100)} onChange={(value) => store.getState().updateDocument((doc) => ({ ...doc, background: { ...doc.background, imageOpacity: value / 100 } }), { label: 'شفافية الخلفية', coalesceKey: 'bg-opacity' })} showValue suffix="٪" />
          </label>
        )}
        <Button size="sm" icon={ImagePlus} onClick={() => inputRef.current?.click()}>رفع خلفية من جهازك</Button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
      </section>

      <section>
        <h3 className="mb-1 text-xs font-bold text-fg-subtle">إطارات إسلامية</h3>
        <p className="mb-2 text-2xs text-fg-subtle">زخرفة فقط، تبقى عناصر الشهادة كلها قابلة للتعديل فوقها.</p>
        {library === null ? <Skeleton className="h-28" /> : <div className="grid grid-cols-3 gap-2">{frames.map((item) => imageTile(item, item.label))}</div>}
      </section>

      {itqan.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-bold text-fg-subtle">{`ألوان قالب الإتقان (${itqan.length})`}</h3>
          <p className="mb-2 text-2xs text-fg-subtle">خلفيات قالب «شهادة إنجاز قرآنية» الأصلي بألوانه المختلفة.</p>
          <div className="grid grid-cols-6 gap-1.5">
            {itqan.map((item) => (
              <button
                key={item.key}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => setImage(item)}
                className={cx('aspect-square rounded-full border-2 shadow-sm transition hover:scale-110', background.imagePath === item.path ? 'border-primary ring-2 ring-primary/40' : 'border-white')}
                style={{ background: `linear-gradient(135deg, ${item.accentColor} 50%, ${item.color} 50%)` }}
              />
            ))}
          </div>
        </section>
      )}

      {assets.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold text-fg-subtle">من مكتبة الرفع</h3>
          <div className="grid grid-cols-3 gap-2">{assets.filter(match).map((asset) => imageTile(asset, asset.name))}</div>
        </section>
      )}
    </div>
  );
}

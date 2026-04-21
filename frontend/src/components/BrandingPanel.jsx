import { useRef } from 'react';
import { ImagePlus, PenSquare, Stamp } from 'lucide-react';
import { buildAssetUrl } from '../api/client';

export function BrandingPanel({ branding, onSchoolNameChange, onUploadLogo, onUploadSignature, onUploadStamp }) {
  const logoRef = useRef(null);
  const signatureRef = useRef(null);
  const stampRef = useRef(null);

  const logoSrc = buildAssetUrl(branding?.logoPath);
  const signatureSrc = buildAssetUrl(branding?.signaturePath);
  const stampSrc = buildAssetUrl(branding?.stampPath);

  function AssetPreview({ title, src, emptyText, mode = 'contain' }) {
    const uploaded = Boolean(src);

    return (
      <div className="rounded-xl border border-amber-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${uploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {uploaded ? 'مرفوع' : 'غير مرفوع'}
          </span>
        </div>

        <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {uploaded ? (
            <img
              src={src}
              alt={title}
              className={`h-full w-full ${mode === 'cover' ? 'object-cover' : 'object-contain'}`}
            />
          ) : (
            <span className="px-2 text-center text-[11px] text-slate-400">{emptyText}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:p-5">
      <h3 className="mb-3 text-lg font-bold text-emerald-900">هوية المدرسة</h3>

      <label className="mb-3 block text-sm font-semibold text-slate-700">اسم المدرسة</label>
      <input
        type="text"
        className="mb-4 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
        value={branding.schoolName || ''}
        onChange={(event) => onSchoolNameChange(event.target.value)}
        placeholder="دار الإتقان العالي"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button
          type="button"
          onClick={() => logoRef.current?.click()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
        >
          <ImagePlus size={16} />
          رفع الشعار
        </button>
        <button
          type="button"
          onClick={() => signatureRef.current?.click()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-500 bg-amber-400 px-3 py-2 text-sm font-semibold text-emerald-950"
        >
          <PenSquare size={16} />
          رفع التوقيع
        </button>
        <button
          type="button"
          onClick={() => stampRef.current?.click()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <Stamp size={16} />
          رفع الختم
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AssetPreview title="الشعار الحالي" src={logoSrc} emptyText="لم يتم رفع شعار بعد" mode="contain" />
        <AssetPreview title="التوقيع الحالي" src={signatureSrc} emptyText="لم يتم رفع توقيع بعد" mode="contain" />
        <AssetPreview title="الختم الحالي" src={stampSrc} emptyText="لم يتم رفع ختم بعد" mode="contain" />
      </div>

      <input
        ref={logoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => event.target.files?.[0] && onUploadLogo(event.target.files[0])}
      />

      <input
        ref={signatureRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => event.target.files?.[0] && onUploadSignature(event.target.files[0])}
      />

      <input
        ref={stampRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => event.target.files?.[0] && onUploadStamp(event.target.files[0])}
      />

      <p className="mt-4 text-xs text-slate-500">الشعار والتوقيع سيظهران تلقائياً في القوالب الديناميكية.</p>
    </section>
  );
}

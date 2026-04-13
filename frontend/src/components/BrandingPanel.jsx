import { useRef } from 'react';
import { ImagePlus, PenSquare } from 'lucide-react';

export function BrandingPanel({ branding, onSchoolNameChange, onUploadLogo, onUploadSignature }) {
  const logoRef = useRef(null);
  const signatureRef = useRef(null);

  return (
    <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
      <h3 className="mb-3 text-lg font-bold text-emerald-900">هوية المدرسة</h3>

      <label className="mb-3 block text-sm font-semibold text-slate-700">اسم المدرسة</label>
      <input
        type="text"
        className="mb-4 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
        value={branding.schoolName || ''}
        onChange={(event) => onSchoolNameChange(event.target.value)}
        placeholder="دار الإتقان العالي"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => logoRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
        >
          <ImagePlus size={16} />
          رفع الشعار
        </button>
        <button
          type="button"
          onClick={() => signatureRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-500 bg-amber-400 px-3 py-2 text-sm font-semibold text-emerald-950"
        >
          <PenSquare size={16} />
          رفع التوقيع
        </button>
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

      <p className="mt-4 text-xs text-slate-500">الشعار والتوقيع سيظهران تلقائياً في القوالب الديناميكية.</p>
    </section>
  );
}

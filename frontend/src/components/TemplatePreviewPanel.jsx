import { buildAssetUrl } from '../api/client';

export function TemplatePreviewPanel({ template }) {
  const backgroundImage = buildAssetUrl(template?.background?.imagePath);

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:sticky xl:top-6">
      {!template ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          اختر قالبًا لعرض المعاينة.
        </div>
      ) : (
        <div
          className="aspect-[4/5] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 sm:aspect-[3/4]"
          style={{
            backgroundColor: template.background?.color || '#f8f4ea',
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
    </aside>
  );
}
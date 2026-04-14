import { Link } from 'react-router-dom';
import { Edit3, Trash2 } from 'lucide-react';

function renderElementPreview(element) {
  if (!element) return null;

  if (element.type === 'dynamicImage') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
        {element.field === 'logo' ? 'شعار' : 'توقيع'}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
      {element.type === 'text' ? element.text : element.field}
    </div>
  );
}

export function TemplateCard({ template, onDelete }) {
  const previewElements = template.elements?.slice(0, 2) || [];

  return (
    <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">{template.name}</h3>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          {template.orientation === 'portrait' ? 'طولي' : 'عرضي'}
        </span>
      </div>

      <div
        className="mb-4 overflow-hidden rounded-3xl border border-slate-200"
        style={{ background: template.background?.color || '#f8f4ea' }}
      >
        <div className="h-24 p-3">
          <div className="mb-2 h-1 rounded-full" style={{ background: template.background?.accentColor || '#0f4a3c' }} />
          <div className="grid gap-2">
            {previewElements.map((element) => (
              <div key={element.id}>{renderElementPreview(element)}</div>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs text-slate-500">{new Date(template.updatedAt).toLocaleDateString('ar-SA')}</p>

      <div className="flex gap-2">
        <Link
          to={`/templates/${template.id}/edit`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-800 bg-emerald-800 px-3 py-2 text-sm text-white"
        >
          <Edit3 size={15} />
          تعديل
        </Link>
        <button
          type="button"
          onClick={() => onDelete(template.id)}
          className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-600"
        >
          <Trash2 size={15} />
          حذف
        </button>
      </div>
    </article>
  );
}

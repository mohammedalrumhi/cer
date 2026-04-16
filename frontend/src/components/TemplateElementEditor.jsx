import { Trash2 } from 'lucide-react';

const elementLabels = {
  text: 'نص ثابت',
  dynamicText: 'نص ديناميكي',
  dynamicImage: 'صورة ديناميكية',
};

const dynamicFields = [
  { value: 'studentName', label: 'اسم الطالب' },
  { value: 'date', label: 'التاريخ' },
  { value: 'issueDate', label: 'تاريخ الإصدار' },
  { value: 'issueDateLabel', label: 'سطر تاريخ الإصدار' },
  { value: 'recitalType', label: 'نوع الاستظهار' },
  { value: 'surahRange', label: 'نص السور (من إلى)' },
  { value: 'programName', label: 'اسم البرنامج' },
  { value: 'calendar', label: 'التقويم' },
  { value: 'mistakesCount', label: 'عدد الأخطاء' },
  { value: 'teacherName', label: 'المعلم' },
  { value: 'schoolName', label: 'اسم المدرسة' },
];

const alignOptions = [
  { value: 'left', label: 'يسار' },
  { value: 'center', label: 'وسط' },
  { value: 'right', label: 'يمين' },
];

export function TemplateElementEditor({ element, onChange, onRemove, fontOptions = [] }) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{elementLabels[element.type] || 'عنصر'}</h3>
          <p className="text-xs text-slate-500">{element.id}</p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(element.id)}
          className="rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
        >
          <Trash2 size={14} /> حذف
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {element.type !== 'dynamicImage' && fontOptions.length > 0 && (
          <label className="block text-sm font-semibold text-slate-700">
            الخط
            <select
              value={element.fontFamily || fontOptions[0].value}
              onChange={e => onChange(element.id, { fontFamily: e.target.value })}
              className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
            >
              {fontOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        )}

        {element.type !== 'dynamicImage' && (
          <label className="block text-sm font-semibold text-slate-700">
            {element.type === 'text' ? 'النص الثابت' : 'الحقل الديناميكي'}
            {element.type === 'text' ? (
              <input
                value={element.text || ''}
                onChange={(event) => onChange(element.id, { text: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
              />
            ) : (
              <select
                value={element.field || 'studentName'}
                onChange={(event) => onChange(element.id, { field: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
              >
                {dynamicFields.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}

        {element.type === 'dynamicImage' && (
          <label className="block text-sm font-semibold text-slate-700">
            نوع الصورة
            <select
              value={element.field || 'logo'}
              onChange={(event) => onChange(element.id, { field: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
            >
              <option value="logo">شعار</option>
              <option value="signature">توقيع</option>
            </select>
          </label>
        )}

        <label className="block text-sm font-semibold text-slate-700">
          الإحداثي X
          <input
            type="number"
            value={element.x || 0}
            onChange={(event) => onChange(element.id, { x: Number(event.target.value) })}
            className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          الإحداثي Y
          <input
            type="number"
            value={element.y || 0}
            onChange={(event) => onChange(element.id, { y: Number(event.target.value) })}
            className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
          />
        </label>

        {element.type !== 'dynamicImage' && (
          <label className="block text-sm font-semibold text-slate-700">
            حجم الخط
            <input
              type="number"
              value={element.fontSize || 24}
              onChange={(event) => onChange(element.id, { fontSize: Number(event.target.value) })}
              className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
            />
          </label>
        )}

        {element.type !== 'dynamicImage' && (
          <label className="block text-sm font-semibold text-slate-700">
            العرض الأقصى
            <input
              type="number"
              value={element.width || 0}
              onChange={(event) => onChange(element.id, { width: Number(event.target.value) })}
              className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
            />
          </label>
        )}

        {element.type !== 'dynamicImage' && (
          <label className="block text-sm font-semibold text-slate-700">
            محاذاة النص
            <select
              value={element.align || 'center'}
              onChange={(event) => onChange(element.id, { align: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
            >
              {alignOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {element.type !== 'dynamicImage' && (
          <label className="block text-sm font-semibold text-slate-700">
            اللون
            <input
              type="color"
              value={element.fill || '#0f172a'}
              onChange={(event) => onChange(element.id, { fill: event.target.value })}
              className="mt-2 h-12 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2"
            />
          </label>
        )}

        {element.type === 'dynamicImage' && (
          <>
            <label className="block text-sm font-semibold text-slate-700">
              العرض
              <input
                type="number"
                value={element.width || 120}
                onChange={(event) => onChange(element.id, { width: Number(event.target.value) })}
                className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              الارتفاع
              <input
                type="number"
                value={element.height || 60}
                onChange={(event) => onChange(element.id, { height: Number(event.target.value) })}
                className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring"
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}

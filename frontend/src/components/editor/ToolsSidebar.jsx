import { Circle, Image, Minus, MousePointer2, Square, Type } from 'lucide-react';

const TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'تحديد' },
  { id: 'text', icon: Type, label: 'نص' },
  { id: 'rect', icon: Square, label: 'مستطيل' },
  { id: 'circle', icon: Circle, label: 'دائرة' },
  { id: 'line', icon: Minus, label: 'خط' },
];

const DYNAMIC_ITEMS = [
  { label: 'اسم الطالب', type: 'dynamicText', extra: { field: 'studentName' } },
  { label: 'التاريخ هـ', type: 'dynamicText', extra: { field: 'date' } },
  { label: 'تاريخ الإصدار', type: 'dynamicText', extra: { field: 'dateLabel' } },
  { label: 'تاريخ الإصدار نص', type: 'dynamicText', extra: { field: 'issueDate' } },
  { label: 'نوع الاستظهار', type: 'dynamicText', extra: { field: 'recitalType' } },
  { label: 'نص السور', type: 'dynamicText', extra: { field: 'surahRange' } },
  { label: 'اسم البرنامج', type: 'dynamicText', extra: { field: 'programName' } },
  { label: 'التقويم', type: 'dynamicText', extra: { field: 'calendar' } },
  { label: 'عدد الأخطاء', type: 'dynamicText', extra: { field: 'mistakesCount' } },
  { label: 'المعلم', type: 'dynamicText', extra: { field: 'teacherName' } },
  { label: 'اسم المدرسة', type: 'dynamicText', extra: { field: 'schoolName' } },
  { label: 'الشعار', type: 'dynamicImage', extra: { field: 'logo' } },
  { label: 'التوقيع', type: 'dynamicImage', extra: { field: 'signature' } },
  { label: 'الختم', type: 'dynamicImage', extra: { field: 'stamp' } },
];

export default function ToolsSidebar({ activeTool, onToolChange, onAddElement, onUploadImage }) {
  return (
    <div
      className="flex h-full w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto border-l border-slate-200 bg-white py-3"
      style={{ direction: 'ltr' }}
    >
      {/* Drawing tools */}
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => onToolChange(tool.id)}
          className={`flex w-12 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition ${
            activeTool === tool.id
              ? 'bg-emerald-100 text-emerald-800'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          <tool.icon size={18} />
          <span className="leading-tight">{tool.label}</span>
        </button>
      ))}

      <div className="my-1 w-10 border-t border-slate-200" />

      {/* Upload image */}
      <label
        title="رفع صورة"
        className="flex w-12 cursor-pointer flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <Image size={18} />
        <span className="leading-tight">صورة</span>
        <input type="file" accept="image/*" className="hidden" onChange={onUploadImage} />
      </label>

      <div className="my-1 w-10 border-t border-slate-200" />

      {/* Dynamic fields */}
      {DYNAMIC_ITEMS.map((item) => (
        <button
          key={item.extra.field}
          title={`إضافة ${item.label}`}
          onClick={() => onAddElement(item.type, item.extra)}
          className="flex w-12 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold text-amber-700 transition hover:bg-amber-50"
        >
          <span className="text-[16px] leading-none">⬡</span>
          <span className="text-center leading-tight">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

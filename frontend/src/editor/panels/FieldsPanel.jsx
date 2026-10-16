import { CalendarDays, GripVertical, Image as ImageIcon, Info } from 'lucide-react';
import { createElement } from '@shared/model/index.js';
import { FIELD_LABELS } from '../../strings.ar';
import { DraggableTile } from '../dnd/EditorDnd';
import { useEditorData } from '../EditorDataContext';

const CORE_FIELDS = [
  'studentName', 'recipientTitle', 'recipientAchievementSentence', 'issueDate', 'dateLabel', 'recitalType', 'surahRange',
  'programName', 'calendar', 'mistakesCount', 'teacherName', 'schoolName', 'serial', 'verifyUrl',
];
const SIZES = { studentName: { fontSize: 48, width: 640 }, recipientAchievementSentence: { fontSize: 32, width: 760 } };

const chip = 'flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-start text-sm transition hover:border-primary/50 hover:bg-primary-50';

function FieldChip({ field }) {
  const preview = <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">{field.label}</span>;
  return (
    <DraggableTile id={`field-${field.key}`} testId={`field-${field.key}`} label={field.label} payload={{ field, preview }} className={chip}>
      <GripVertical size={14} className="text-fg-subtle" aria-hidden />
      <span className="flex-1 font-semibold">{field.label}</span>
    </DraggableTile>
  );
}

/** Dynamic fields as draggable chips: drop on empty space for a bound text, on a text to insert it. */
export default function FieldsPanel({ query }) {
  const { customFields = [] } = useEditorData();
  const fields = CORE_FIELDS.map((key) => ({ key, label: FIELD_LABELS[key], ...SIZES[key] }));
  const custom = customFields.map((key) => ({ key, label: key.replace(/_/g, ' ') }));
  const match = (field) => !query || field.label.includes(query) || field.key.toLowerCase().includes(query.toLowerCase());
  const images = [
    { field: 'logo', label: 'الشعار' },
    { field: 'signature', label: 'التوقيع' },
    { field: 'stamp', label: 'الختم' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <p className="flex gap-2 rounded-md bg-info-bg p-3 text-xs text-fg-muted">
        <Info size={15} className="mt-0.5 shrink-0 text-info" aria-hidden />
        اسحب الحقل إلى مكان فارغ لإضافة نص متغير، أو أفلته فوق نص موجود لإدراجه داخله. تُملأ الحقول من بيانات كل طالب عند الإصدار.
      </p>
      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-bold text-fg-subtle">حقول الطالب والشهادة</h3>
        {fields.filter(match).map((field) => <FieldChip key={field.key} field={field} />)}
      </section>
      {custom.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-bold text-fg-subtle">أعمدة من ملفات الطلاب</h3>
          {custom.filter(match).map((field) => <FieldChip key={field.key} field={field} />)}
        </section>
      )}
      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-bold text-fg-subtle">التاريخ</h3>
        <DraggableTile id="field-date-hijri" label="تاريخ هجري تلقائي" payload={{ make: () => createElement('dateField', { date: { calendar: 'hijri', style: 'long', source: 'issue' } }), preview: <CalendarDays /> }} className={chip}>
          <CalendarDays size={15} className="text-primary" aria-hidden />
          <span className="flex-1 font-semibold">تاريخ هجري تلقائي</span>
        </DraggableTile>
        <DraggableTile id="field-date-greg" label="تاريخ ميلادي تلقائي" payload={{ make: () => createElement('dateField', { date: { calendar: 'gregorian', style: 'long', source: 'issue' } }), preview: <CalendarDays /> }} className={chip}>
          <CalendarDays size={15} className="text-primary" aria-hidden />
          <span className="flex-1 font-semibold">تاريخ ميلادي تلقائي</span>
        </DraggableTile>
      </section>
      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-bold text-fg-subtle">صور الهوية</h3>
        {images.map((item) => (
          <DraggableTile key={item.field} id={`field-img-${item.field}`} label={item.label} payload={{ make: () => createElement('dynamicImage', { field: item.field }), preview: <ImageIcon /> }} className={chip}>
            <ImageIcon size={15} className="text-primary" aria-hidden />
            <span className="flex-1 font-semibold">{item.label}</span>
          </DraggableTile>
        ))}
      </section>
    </div>
  );
}

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BringToFront,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Italic,
  Lock,
  LockOpen,
  SendToBack,
  Trash2,
  Underline,
} from 'lucide-react';

const DYNAMIC_FIELD_OPTIONS = [
  { value: 'recipientAchievementSentence', label: 'جملة التهنئة' },
  { value: 'recipientTitle', label: 'اللقب التلقائي' },
  { value: 'studentName', label: 'اسم الطالب' },
  { value: 'date', label: 'التاريخ الهجري' },
  { value: 'dateLabel', label: 'تاريخ الإصدار (هجري)' },
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

const DYNAMIC_IMAGE_FIELD_OPTIONS = [
  { value: 'logo', label: 'الشعار' },
  { value: 'signature', label: 'التوقيع' },
  { value: 'stamp', label: 'الختم' },
];

function Row({ label, children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-right text-xs text-slate-500">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, className = '' }) {
  return (
    <input
      type="number"
      value={Math.round(value ?? 0)}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 ${className}`}
    />
  );
}

export default function PropertiesPanel({ element, fontOptions = [], onChange, onRemove, onLayerOp }) {
  if (!element) {
    return (
      <div
        className="flex h-full w-64 shrink-0 flex-col items-center justify-center border-r border-slate-200 bg-white p-6"
        style={{ direction: 'rtl' }}
      >
        <p className="text-center text-xs text-slate-400">اختر عنصراً لتعديل خصائصه</p>
      </div>
    );
  }

  const isText = element.type === 'text' || element.type === 'dynamicText';
  const isShape = element.type === 'rect' || element.type === 'circle';
  const isImage = element.type === 'image' || element.type === 'dynamicImage';

  const fontStyle = element.fontStyle || 'normal';
  const isBold = fontStyle.includes('bold');
  const isItalic = fontStyle.includes('italic');

  function toggleBold() {
    const next = isItalic ? (isBold ? 'italic' : 'bold italic') : (isBold ? 'normal' : 'bold');
    onChange(element.id, { fontStyle: next });
  }

  function toggleItalic() {
    const next = isBold ? (isItalic ? 'bold' : 'bold italic') : (isItalic ? 'normal' : 'italic');
    onChange(element.id, { fontStyle: next });
  }

  const iconBtn = 'rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100';
  const activeIconBtn = 'rounded-lg border border-emerald-400 bg-emerald-50 p-1.5 text-emerald-700';

  return (
    <div
      className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white"
      style={{ direction: 'rtl' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="text-xs font-semibold text-slate-700">
          {element.type === 'text'
            ? 'نص ثابت'
            : element.type === 'dynamicText'
              ? 'نص ديناميكي'
              : element.type === 'rect'
                ? 'مستطيل'
                : element.type === 'circle'
                  ? 'دائرة'
                  : element.type === 'line'
                    ? 'خط'
                    : element.type === 'dynamicImage'
                      ? 'صورة ديناميكية'
                      : 'صورة'}
        </span>
        <button
          onClick={() => onRemove(element.id)}
          className="rounded-lg p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
          title="حذف العنصر"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* Dynamic field */}
        {element.type === 'dynamicText' && (
          <Row label="الحقل">
            <select
              value={element.field || 'studentName'}
              onChange={(e) => onChange(element.id, { field: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400"
            >
              {DYNAMIC_FIELD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Row>
        )}
        {element.type === 'dynamicImage' && (
          <Row label="المصدر">
            <select
              value={element.field || 'logo'}
              onChange={(e) => onChange(element.id, { field: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400"
            >
              {DYNAMIC_IMAGE_FIELD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Row>
        )}

        {/* Static text */}
        {element.type === 'text' && (
          <Row label="النص">
            <textarea
              value={element.text || ''}
              rows={2}
              onChange={(e) => onChange(element.id, { text: e.target.value })}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300"
            />
          </Row>
        )}

        {/* Position & Size */}
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-600">الموضع والحجم</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-slate-500">
              X
              <NumberInput value={element.x} onChange={(v) => onChange(element.id, { x: v })} />
            </label>
            <label className="block text-xs text-slate-500">
              Y
              <NumberInput value={element.y} onChange={(v) => onChange(element.id, { y: v })} />
            </label>
            <label className="block text-xs text-slate-500">
              العرض
              <NumberInput value={element.width} min={5} onChange={(v) => onChange(element.id, { width: v })} />
            </label>
            {(isImage || isShape || element.type === 'line') && (
              <label className="block text-xs text-slate-500">
                الارتفاع
                <NumberInput value={element.height} min={5} onChange={(v) => onChange(element.id, { height: v })} />
              </label>
            )}
            <label className="block text-xs text-slate-500">
              الدوران °
              <NumberInput value={element.rotation ?? 0} min={-360} max={360} onChange={(v) => onChange(element.id, { rotation: v })} />
            </label>
          </div>
        </div>

        {/* Opacity */}
        <Row label="الشفافية">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={element.opacity ?? 1}
              onChange={(e) => onChange(element.id, { opacity: Number(e.target.value) })}
              className="flex-1 accent-emerald-600"
            />
            <span className="w-8 text-right text-xs tabular-nums text-slate-500">
              {Math.round((element.opacity ?? 1) * 100)}%
            </span>
          </div>
        </Row>

        {/* Text properties */}
        {isText && (
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">النص</p>
            <div className="flex flex-col gap-2">
              <Row label="الخط">
                <select
                  value={element.fontFamily || fontOptions[0]?.value || 'Amiri-Regular'}
                  onChange={(e) => onChange(element.id, { fontFamily: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400"
                >
                  {fontOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Row>
              <Row label="الحجم">
                <NumberInput
                  value={element.fontSize ?? 28}
                  min={6}
                  max={200}
                  onChange={(v) => onChange(element.id, { fontSize: v })}
                />
              </Row>
              <Row label="اللون">
                <input
                  type="color"
                  value={element.fill || '#0f172a'}
                  onChange={(e) => onChange(element.id, { fill: e.target.value })}
                  className="h-8 w-full cursor-pointer rounded-lg border border-slate-200"
                />
              </Row>
              {/* Style toggles */}
              <Row label="النمط">
                <div className="flex gap-1">
                  <button onClick={toggleBold} className={isBold ? activeIconBtn : iconBtn} title="غامق">
                    <Bold size={13} />
                  </button>
                  <button onClick={toggleItalic} className={isItalic ? activeIconBtn : iconBtn} title="مائل">
                    <Italic size={13} />
                  </button>
                  <button
                    onClick={() => onChange(element.id, { textDecoration: element.textDecoration === 'underline' ? '' : 'underline' })}
                    className={element.textDecoration === 'underline' ? activeIconBtn : iconBtn}
                    title="تسطير"
                  >
                    <Underline size={13} />
                  </button>
                </div>
              </Row>
              {/* Alignment */}
              <Row label="المحاذاة">
                <div className="flex gap-1">
                  {[
                    { val: 'right', icon: AlignRight },
                    { val: 'center', icon: AlignCenter },
                    { val: 'left', icon: AlignLeft },
                  ].map(({ val, icon }) => {
                    const Comp = icon;
                    return (
                    <button
                      key={val}
                      onClick={() => onChange(element.id, { align: val })}
                      className={(element.align || 'center') === val ? activeIconBtn : iconBtn}
                    >
                      <Comp size={13} />
                    </button>
                    );
                  })}
                </div>
              </Row>
              <Row label="التباعد">
                <NumberInput
                  value={element.lineHeight ?? 1.4}
                  min={0.5}
                  max={5}
                  step={0.1}
                  onChange={(v) => onChange(element.id, { lineHeight: v })}
                />
              </Row>
              <Row label="التمدد">
                <select
                  value={element.growDirection || 'right'}
                  onChange={(e) => onChange(element.id, { growDirection: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-400"
                >
                  <option value="right">يمين</option>
                  <option value="left">يسار</option>
                  <option value="center">من الوسط</option>
                </select>
              </Row>
            </div>
          </div>
        )}

        {/* Shape properties */}
        {isShape && (
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">الشكل</p>
            <div className="flex flex-col gap-2">
              <Row label="التعبئة">
                <input
                  type="color"
                  value={element.fill || '#e2e8f0'}
                  onChange={(e) => onChange(element.id, { fill: e.target.value })}
                  className="h-8 w-full cursor-pointer rounded-lg border border-slate-200"
                />
              </Row>
              <Row label="الحدود">
                <input
                  type="color"
                  value={element.stroke || '#94a3b8'}
                  onChange={(e) => onChange(element.id, { stroke: e.target.value })}
                  className="h-8 w-full cursor-pointer rounded-lg border border-slate-200"
                />
              </Row>
              <Row label="سماكة">
                <NumberInput
                  value={element.strokeWidth ?? 2}
                  min={0}
                  max={30}
                  onChange={(v) => onChange(element.id, { strokeWidth: v })}
                />
              </Row>
              {element.type === 'rect' && (
                <Row label="دائرية">
                  <NumberInput
                    value={element.cornerRadius ?? 0}
                    min={0}
                    max={200}
                    onChange={(v) => onChange(element.id, { cornerRadius: v })}
                  />
                </Row>
              )}
            </div>
          </div>
        )}

        {/* Line properties */}
        {element.type === 'line' && (
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">الخط</p>
            <div className="flex flex-col gap-2">
              <Row label="اللون">
                <input
                  type="color"
                  value={element.stroke || '#0f172a'}
                  onChange={(e) => onChange(element.id, { stroke: e.target.value })}
                  className="h-8 w-full cursor-pointer rounded-lg border border-slate-200"
                />
              </Row>
              <Row label="السماكة">
                <NumberInput
                  value={element.strokeWidth ?? 3}
                  min={1}
                  max={50}
                  onChange={(v) => onChange(element.id, { strokeWidth: v })}
                />
              </Row>
            </div>
          </div>
        )}

        {/* Layer controls */}
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-600">الطبقات</p>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => onLayerOp('bringToFront')} title="إلى المقدمة" className={iconBtn}>
              <BringToFront size={14} />
            </button>
            <button onClick={() => onLayerOp('bringForward')} title="للأمام" className={iconBtn}>
              <ChevronUp size={14} />
            </button>
            <button onClick={() => onLayerOp('sendBackward')} title="للخلف" className={iconBtn}>
              <ChevronDown size={14} />
            </button>
            <button onClick={() => onLayerOp('sendToBack')} title="للخلفية" className={iconBtn}>
              <SendToBack size={14} />
            </button>
            <button
              onClick={() => onChange(element.id, { locked: !element.locked })}
              title={element.locked ? 'إلغاء القفل' : 'قفل'}
              className={element.locked ? activeIconBtn : iconBtn}
            >
              {element.locked ? <Lock size={14} /> : <LockOpen size={14} />}
            </button>
            <button
              onClick={() => onChange(element.id, { visible: element.visible === false })}
              title={element.visible === false ? 'إظهار' : 'إخفاء'}
              className={element.visible === false ? activeIconBtn : iconBtn}
            >
              <EyeOff size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

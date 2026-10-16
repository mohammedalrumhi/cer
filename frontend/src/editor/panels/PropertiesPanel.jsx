import { Eye, EyeOff, FileCog, Lock, LockOpen, PanelLeftClose } from 'lucide-react';
import { S, FIELD_LABELS } from '../../strings.ar';
import { Button, IconButton } from '../../ui/Button';
import { formatNumber } from '../../ui/format';
import { Segmented } from '../../ui/Segmented';
import { Slider } from '../../ui/Slider';
import { TEMPLATE_AUDIENCE_OPTIONS, TEMPLATE_DETAIL_OPTIONS } from '../../utils/templateMetadata';
import { selectionInfo } from '../actions';
import { common, usePatch, useSeal, useSelectedElements } from '../controls/selection';
import { NumberField, Row, Section } from '../controls/fields';
import { editableText } from '../model/textSource';
import { fromDisplayTemplate, toDisplayTemplate } from '../model/fieldTokens';
import { isTextElement } from '../model/elements';
import { pageSizeLabel } from '../model/pageSizes';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

const DYNAMIC_FIELDS = ['studentName', 'recipientTitle', 'recipientAchievementSentence', 'issueDate', 'dateLabel', 'recitalType', 'surahRange', 'programName', 'calendar', 'mistakesCount', 'teacherName', 'schoolName', 'serial'];

function DocumentProperties() {
  const store = useEditorStoreApi();
  const document = useEditor((state) => state.document);
  const update = (patch, label = 'إعدادات القالب') => store.getState().updateDocument(patch, { label, coalesceKey: `doc:${Object.keys(patch).join(',')}` });
  return (
    <>
      <Section title="القالب">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-fg-muted">{S.editor.rename}</span>
          <input className="field field-sm" value={document.name || ''} onChange={(e) => update({ name: e.target.value }, 'اسم القالب')} onKeyDown={(e) => e.stopPropagation()} data-testid="doc-name" />
        </label>
        <Row label="الفئة">
          <Segmented size="sm" fullWidth value={document.audienceType || 'student'} onChange={(audienceType) => update({ audienceType })} options={TEMPLATE_AUDIENCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </Row>
        <Row label="التفاصيل">
          <Segmented size="sm" fullWidth value={document.detailLevel || 'simple'} onChange={(detailLevel) => update({ detailLevel })} options={TEMPLATE_DETAIL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </Row>
      </Section>
      <Section title="الصفحة">
        <p className="text-sm font-semibold">{pageSizeLabel(document)}</p>
        <p className="text-xs text-fg-muted">{`${formatNumber(Math.round(document.width))} × ${formatNumber(Math.round(document.height))} بكسل`}</p>
        <Button size="sm" icon={FileCog} onClick={() => store.getState().setUi({ dialog: 'pageSetup' })} data-testid="open-page-setup">{S.editor.pageSetup}</Button>
      </Section>
      <Section title="الأرقام في الشهادة">
        <Segmented
          size="sm"
          fullWidth
          value={document.digits || 'keep'}
          onChange={(digits) => update({ digits }, 'نمط الأرقام')}
          options={[{ value: 'arabic', label: '١٢٣ عربية' }, { value: 'latin', label: 'غربية 123' }, { value: 'keep', label: 'كما كُتبت' }]}
        />
      </Section>
    </>
  );
}

function GeometrySection({ elements }) {
  const patch = usePatch();
  const single = elements.length === 1 ? elements[0] : null;
  if (!single) return null;
  const isLine = single.type === 'line';
  const hasHeight = !isTextElement(single) && !isLine;
  const set = (key) => (value) => patch({ [key]: value }, { label: 'الموضع والحجم' });
  return (
    <Section title="الموضع والحجم">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="س" value={single.x} onChange={set('x')} testId="prop-x" />
        <NumberField label="ص" value={single.y} onChange={set('y')} testId="prop-y" />
        <NumberField label="العرض" value={single.width} min={1} onChange={set('width')} testId="prop-width" />
        {hasHeight && <NumberField label="الارتفاع" value={single.height} min={1} onChange={set('height')} testId="prop-height" />}
        <NumberField label="الدوران" value={single.rotation || 0} min={-360} max={360} suffix="°" onChange={set('rotation')} testId="prop-rotation" />
      </div>
    </Section>
  );
}

function TextContentSection({ element }) {
  const patch = usePatch();
  const seal = useSeal();
  const source = editableText(element);
  return (
    <Section title={element.type === 'text' ? 'النص' : 'محتوى الحقل'}>
      {element.type === 'dynamicText' && (
        <Row label="الحقل">
          <select className="field field-sm" value={element.field || 'studentName'} onChange={(e) => patch({ field: e.target.value, dynamicTextTemplate: '' }, { label: 'الحقل', coalesce: false })}>
            {DYNAMIC_FIELDS.map((key) => <option key={key} value={key}>{FIELD_LABELS[key]}</option>)}
            {!DYNAMIC_FIELDS.includes(element.field) && <option value={element.field}>{element.field}</option>}
          </select>
        </Row>
      )}
      {element.type === 'dateField' && (
        <>
          <Row label="التقويم">
            <Segmented size="sm" fullWidth value={element.date?.calendar || 'hijri'} onChange={(calendar) => patch({ date: { ...element.date, calendar } }, { label: 'التقويم', coalesce: false })} options={[{ value: 'hijri', label: 'هجري' }, { value: 'gregorian', label: 'ميلادي' }]} />
          </Row>
          <Row label="الصيغة">
            <Segmented size="sm" fullWidth value={element.date?.style || 'long'} onChange={(style) => patch({ date: { ...element.date, style } }, { label: 'صيغة التاريخ', coalesce: false })} options={[{ value: 'long', label: 'كاملة' }, { value: 'numeric', label: 'أرقام' }]} />
          </Row>
          <Row label="المصدر">
            <Segmented size="sm" fullWidth value={element.date?.source || 'issue'} onChange={(source) => patch({ date: { ...element.date, source } }, { label: 'مصدر التاريخ', coalesce: false })} options={[{ value: 'issue', label: 'تاريخ الإصدار' }, { value: 'today', label: 'اليوم' }]} />
          </Row>
        </>
      )}
      <textarea
        className="field min-h-20 resize-y text-sm"
        dir="auto"
        value={toDisplayTemplate(source.value)}
        onChange={(e) => patch({ [source.key]: fromDisplayTemplate(e.target.value) }, { label: 'تعديل النص' })}
        onBlur={seal}
        onKeyDown={(e) => e.stopPropagation()}
        data-testid="prop-text"
        aria-label="النص"
      />
      <p className="text-2xs text-fg-subtle">اسحب حقلًا من لوحة «الحقول» وأفلته فوق النص لإدراجه، أو اكتب الحقل بين قوسين مزدوجين.</p>
      <Row label="الارتفاع">
        <NumberField value={Number(element.height) || 0} min={0} onChange={(height) => patch({ height: height || undefined }, { label: 'ارتفاع الصندوق' })} />
        <Segmented size="sm" value={element.verticalAlign || 'top'} onChange={(verticalAlign) => patch({ verticalAlign }, { label: 'المحاذاة الرأسية', coalesce: false })} options={[{ value: 'top', label: 'أعلى' }, { value: 'middle', label: 'وسط' }, { value: 'bottom', label: 'أسفل' }]} />
      </Row>
    </Section>
  );
}

function ElementProperties({ elements }) {
  const store = useEditorStoreApi();
  const patch = usePatch();
  const seal = useSeal();
  const info = selectionInfo(store.getState());
  const single = elements.length === 1 ? elements[0] : null;
  const opacity = common(elements, (el) => (el.opacity === undefined ? 1 : Number(el.opacity))) ?? 1;
  const typeLabel = single ? S.editor.types[single.type] : info.units === 1 && info.grouped ? S.editor.types.group : S.editor.types.multiple(formatNumber(elements.length));
  return (
    <>
      <Section
        title={typeLabel}
        action={(
          <div className="flex gap-1">
            <IconButton icon={info.allLocked ? Lock : LockOpen} size="xs" label={info.allLocked ? S.editor.menu.unlock : S.editor.menu.lock} active={info.allLocked} onClick={() => store.getState().toggleLocked()} />
            <IconButton icon={info.allHidden ? EyeOff : Eye} size="xs" label={info.allHidden ? S.editor.menu.show : S.editor.menu.hide} onClick={() => store.getState().toggleHidden()} />
          </div>
        )}
      >
        {single && (
          <input className="field field-sm" placeholder="اسم العنصر (اختياري)" value={single.name || ''} onChange={(e) => patch({ name: e.target.value }, { label: 'إعادة تسمية' })} onKeyDown={(e) => e.stopPropagation()} aria-label="اسم العنصر" />
        )}
        <Row label="الشفافية">
          <Slider className="flex-1" label="الشفافية" min={0} max={100} value={Math.round(opacity * 100)} onChange={(value) => patch({ opacity: value / 100 }, { label: 'الشفافية' })} onCommit={seal} showValue suffix="٪" />
        </Row>
      </Section>
      <GeometrySection elements={elements} />
      {single && isTextElement(single) && <TextContentSection element={single} />}
      {single?.type === 'dynamicImage' && (
        <Section title="مصدر الصورة">
          <Segmented size="sm" fullWidth value={single.field || 'logo'} onChange={(field) => patch({ field }, { label: 'مصدر الصورة', coalesce: false })} options={[{ value: 'logo', label: 'الشعار' }, { value: 'signature', label: 'التوقيع' }, { value: 'stamp', label: 'الختم' }]} />
        </Section>
      )}
    </>
  );
}

/** Properties on the left (RTL inline-end): document settings, or the selection's details. */
export default function PropertiesPanel({ overlay = false }) {
  const store = useEditorStoreApi();
  const elements = useSelectedElements();
  const mode = useEditor((state) => state.ui.mode);
  return (
    <aside
      aria-label={S.editor.properties}
      data-testid="properties-panel"
      className={`flex w-[280px] shrink-0 animate-panel-in-start flex-col border-s border-border bg-surface ${overlay ? 'absolute inset-y-0 end-0 z-30 shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-bold">{S.editor.properties}</h2>
        <IconButton icon={PanelLeftClose} size="xs" label={S.editor.hideProperties} onClick={() => store.getState().setUi({ propertiesOpen: false })} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" onBlurCapture={() => store.getState().sealHistory()}>
        {mode === 'preview' || elements.length === 0 ? <DocumentProperties /> : <ElementProperties elements={elements} />}
      </div>
    </aside>
  );
}

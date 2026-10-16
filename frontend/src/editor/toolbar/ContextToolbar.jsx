import { useRef } from 'react';
import {
  AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignJustify, AlignLeft, AlignRight,
  AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, ArrowLeftRight, Blend, Bold, BringToFront, Copy, Crop, FlipHorizontal2, FlipVertical2, Group,
  ImageUp, Italic, Lock, LockOpen, SendToBack, SlidersHorizontal, Sparkles, Strikethrough, Trash2, Underline, Ungroup, WandSparkles,
} from 'lucide-react';
import { uploadAsset } from '../../api/client';
import { S } from '../../strings.ar';
import { IconButton } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/Popover';
import { Segmented } from '../../ui/Segmented';
import { Slider } from '../../ui/Slider';
import { toast } from '../../ui/toast';
import { Tooltip } from '../../ui/Tooltip';
import { runAction, selectionInfo } from '../actions';
import { ColorPicker } from '../color/ColorPicker';
import { common, usePatch, useSeal, useSelectedElements } from '../controls/selection';
import { FontPicker, NumberField, Row, Stepper } from '../controls/fields';
import { useEditorData } from '../EditorDataContext';
import { isTextElement } from '../model/elements';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

const DASHES = [
  { value: 'solid', label: 'متصل', dash: null },
  { value: 'dashed', label: 'متقطع', dash: [6, 4] },
  { value: 'dotted', label: 'منقط', dash: [0, 3] },
];
const HEADS = [
  { value: 'none', label: 'بلا' },
  { value: 'arrow', label: 'سهم' },
  { value: 'triangle', label: 'مثلث' },
  { value: 'circle', label: 'دائرة' },
  { value: 'square', label: 'مربع' },
  { value: 'diamond', label: 'معيّن' },
];
const dashKey = (dash) => (!dash ? 'solid' : dash[0] === 0 ? 'dotted' : 'dashed');

const Divider = () => <span className="mx-1 h-6 w-px shrink-0 bg-border" />;

function PopButton({ icon: Icon, label, children, width = 'w-72', testId, active = false }) {
  return (
    <Popover>
      <Tooltip content={label}>
        <PopoverTrigger asChild>
          <button type="button" aria-label={label} data-testid={testId} className={cx('inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-semibold transition-colors hover:bg-surface-2', active ? 'text-primary' : 'text-fg-muted hover:text-fg')}>
            <Icon size={16} aria-hidden />
            <span className="hidden xl:inline">{label}</span>
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent className={cx('flex flex-col gap-3', width)}>{children}</PopoverContent>
    </Popover>
  );
}

function Toggle({ icon, label, active, onClick, shortcut, testId }) {
  return <IconButton icon={icon} label={label} shortcut={shortcut} active={active} onClick={onClick} data-testid={testId} />;
}

/* ── Text ──────────────────────────────────────────────────────────────── */

function TextTools({ elements }) {
  const patch = usePatch();
  const seal = useSeal();
  const { fontOptions, branding } = useEditorData();
  const style = common(elements, (el) => el.fontStyle || 'normal') || '';
  const decoration = common(elements, (el) => el.textDecoration || '') || '';
  const bold = style.includes('bold');
  const italic = style.includes('italic');
  const setStyle = (nextBold, nextItalic) => patch({ fontStyle: [nextBold && 'bold', nextItalic && 'italic'].filter(Boolean).join(' ') || 'normal' }, { label: 'نمط الخط' });
  const toggleDecoration = (kind) => {
    const parts = new Set(decoration.split(' ').filter(Boolean));
    if (parts.has(kind)) parts.delete(kind);
    else parts.add(kind);
    patch({ textDecoration: [...parts].join(' ') }, { label: 'زخرفة النص' });
  };
  const align = common(elements, (el) => el.align || 'center');
  const first = elements[0];
  const letterSpacing = common(elements, (el) => Number(el.letterSpacing) || 0) ?? 0;
  const kashida = common(elements, (el) => Number(el.kashida) || 0) ?? 0;
  const effects = first.effects || {};
  const setEffect = (key, value) => patch((el) => ({ ...el, effects: { ...(el.effects || {}), [key]: value } }), { label: 'تأثيرات النص' });

  return (
    <>
      <FontPicker value={common(elements, (el) => el.fontFamily)} options={fontOptions} onChange={(fontFamily) => patch({ fontFamily }, { label: 'الخط', coalesce: false })} testId="toolbar-font" />
      <Stepper label="حجم الخط" value={common(elements, (el) => Number(el.fontSize) || 28)} min={4} max={400} onChange={(fontSize) => patch({ fontSize }, { label: 'حجم الخط' })} testId="toolbar-font-size" />
      <ColorPicker label="لون النص" value={common(elements, (el) => el.fill) ?? '#000000'} allowGradient brandColors={branding?.colors} onChange={(fill) => patch({ fill: fill || '#000000' }, { label: 'لون النص' })} testId="toolbar-text-color" />
      <Divider />
      <Toggle icon={Bold} label="عريض" active={bold} onClick={() => setStyle(!bold, italic)} testId="toolbar-bold" />
      <Toggle icon={Italic} label="مائل" active={italic} onClick={() => setStyle(bold, !italic)} />
      <Toggle icon={Underline} label="تسطير" active={decoration.includes('underline')} onClick={() => toggleDecoration('underline')} />
      <Toggle icon={Strikethrough} label="يتوسطه خط" active={decoration.includes('line-through')} onClick={() => toggleDecoration('line-through')} />
      <Divider />
      <Segmented
        size="sm"
        label="المحاذاة"
        value={align || ''}
        onChange={(value) => patch({ align: value }, { label: 'المحاذاة', coalesce: false })}
        options={[
          { value: 'right', icon: AlignRight, tooltip: 'يمين' },
          { value: 'center', icon: AlignCenter, tooltip: 'وسط' },
          { value: 'left', icon: AlignLeft, tooltip: 'يسار' },
          { value: 'justify', icon: AlignJustify, tooltip: 'ضبط' },
        ]}
      />
      <PopButton icon={SlidersHorizontal} label="المسافات" testId="toolbar-spacing">
        <Row label="تباعد الأسطر">
          <Slider className="flex-1" label="تباعد الأسطر" min={0.8} max={3} step={0.05} value={common(elements, (el) => Number(el.lineHeight) || 1.4) ?? 1.4} onChange={(lineHeight) => patch({ lineHeight }, { label: 'تباعد الأسطر' })} onCommit={seal} showValue />
        </Row>
        <Row label="مدّ الحروف">
          <Slider className="flex-1" label="مدّ الحروف (كشيدة)" min={0} max={4} step={1} value={kashida} onChange={(value) => patch({ kashida: value }, { label: 'مدّ الحروف' })} onCommit={seal} showValue />
        </Row>
        <p className="rounded-sm bg-gold-50 p-2 text-2xs leading-relaxed text-fg-muted">
          للعربية استخدم «مدّ الحروف» (الكشيدة) بدل تباعد الحروف؛ فالتباعد يفصل الحروف المتصلة.
        </p>
        <Row label="تباعد الحروف">
          <Slider className="flex-1" label="تباعد الحروف" min={0} max={20} step={0.5} value={letterSpacing} onChange={(value) => patch({ letterSpacing: value }, { label: 'تباعد الحروف' })} onCommit={seal} showValue />
        </Row>
        {letterSpacing > 0 && <p className="text-2xs text-warning">تنبيه: قد يكسر تباعد الحروف اتصال الكلمات العربية.</p>}
        <Row label="ملاءمة تلقائية">
          <Segmented
            size="sm"
            value={first.autoFit?.mode === 'shrink' ? 'shrink' : 'none'}
            onChange={(mode) => patch({ autoFit: mode === 'shrink' ? { mode: 'shrink', minScale: 0.5, minFontSize: 10 } : { mode: 'none' } }, { label: 'الملاءمة التلقائية', coalesce: false })}
            options={[{ value: 'shrink', label: 'تصغير الطويل' }, { value: 'none', label: 'إيقاف' }]}
          />
        </Row>
      </PopButton>
      <PopButton icon={Sparkles} label="تأثيرات" testId="toolbar-effects" active={Boolean(effects.shadow || effects.outline || effects.highlight)}>
        <EffectEditor title="ظل" value={effects.shadow} onToggle={(on) => setEffect('shadow', on ? { color: '#000000', opacity: 0.3, blur: 6, offsetX: 3, offsetY: 4 } : null)} onChange={(value) => setEffect('shadow', value)} seal={seal}
          fields={[['blur', 'التنعيم', 0, 30], ['offsetX', 'إزاحة أفقية', -30, 30], ['offsetY', 'إزاحة رأسية', -30, 30], ['opacity', 'الشفافية', 0, 1, 0.05]]}
        />
        <EffectEditor title="حدّ خارجي" value={effects.outline} onToggle={(on) => setEffect('outline', on ? { color: '#FFFFFF', width: 2 } : null)} onChange={(value) => setEffect('outline', value)} seal={seal}
          fields={[['width', 'السماكة', 0.5, 12, 0.5]]}
        />
        <EffectEditor title="تظليل خلف النص" value={effects.highlight} onToggle={(on) => setEffect('highlight', on ? { color: '#F2E3C2', padding: 10, radius: 8, opacity: 1 } : null)} onChange={(value) => setEffect('highlight', value)} seal={seal}
          fields={[['padding', 'الحشو', 0, 40], ['radius', 'الاستدارة', 0, 40], ['opacity', 'الشفافية', 0, 1, 0.05]]}
        />
      </PopButton>
    </>
  );
}

function EffectEditor({ title, value, onToggle, onChange, fields, seal }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">{title}</span>
        <div className="flex items-center gap-2">
          {value && <ColorPicker label={`لون ${title}`} value={value.color} onChange={(color) => color && onChange({ ...value, color })} />}
          <Segmented size="sm" value={value ? 'on' : 'off'} onChange={(next) => onToggle(next === 'on')} options={[{ value: 'on', label: 'تشغيل' }, { value: 'off', label: 'إيقاف' }]} />
        </div>
      </div>
      {value && fields.map(([key, label, min, max, step = 1]) => (
        <Row key={key} label={label}>
          <Slider className="flex-1" label={label} min={min} max={max} step={step} value={value[key] ?? 0} onChange={(v) => onChange({ ...value, [key]: v })} onCommit={seal} showValue />
        </Row>
      ))}
    </div>
  );
}

/* ── Shapes and lines ──────────────────────────────────────────────────── */

function StrokeControls({ elements, withWidth = true }) {
  const patch = usePatch();
  const seal = useSeal();
  const { branding } = useEditorData();
  const width = common(elements, (el) => Number(el.strokeWidth) || 0) ?? 0;
  return (
    <PopButton icon={Blend} label="الحدّ" testId="toolbar-stroke">
      <Row label="اللون">
        <ColorPicker label="لون الحدّ" allowNone value={common(elements, (el) => el.stroke) ?? null} brandColors={branding?.colors} onChange={(stroke) => patch((el) => ({ ...el, stroke, strokeWidth: stroke && !(Number(el.strokeWidth) > 0) ? 2 : el.strokeWidth }), { label: 'لون الحدّ' })} />
      </Row>
      {withWidth && (
        <Row label="السماكة">
          <Slider className="flex-1" label="سماكة الحدّ" min={0} max={30} step={0.5} value={width} onChange={(strokeWidth) => patch({ strokeWidth }, { label: 'سماكة الحدّ' })} onCommit={seal} showValue />
        </Row>
      )}
      <Row label="النمط">
        <Segmented size="sm" value={dashKey(common(elements, (el) => el.dash))} onChange={(value) => patch({ dash: DASHES.find((d) => d.value === value).dash }, { label: 'نمط الحدّ', coalesce: false })} options={DASHES.map((d) => ({ value: d.value, label: d.label }))} />
      </Row>
    </PopButton>
  );
}

function ShapeTools({ elements }) {
  const patch = usePatch();
  const seal = useSeal();
  const { branding } = useEditorData();
  const type = elements[0].type;
  const same = elements.every((el) => el.type === type);
  return (
    <>
      <ColorPicker label="لون التعبئة" allowGradient allowNone value={common(elements, (el) => el.fill) ?? null} brandColors={branding?.colors} onChange={(fill) => patch({ fill }, { label: 'لون التعبئة' })} testId="toolbar-fill" />
      <StrokeControls elements={elements} />
      {same && ['rect', 'polygon', 'star'].includes(type) && (
        <PopButton icon={SlidersHorizontal} label="الشكل">
          <Row label="الاستدارة">
            <Slider className="flex-1" label="استدارة الزوايا" min={0} max={120} value={common(elements, (el) => Number(el.cornerRadius) || 0) ?? 0} onChange={(cornerRadius) => patch({ cornerRadius }, { label: 'الاستدارة' })} onCommit={seal} showValue />
          </Row>
          {type === 'polygon' && (
            <Row label="الأضلاع">
              <Slider className="flex-1" label="عدد الأضلاع" min={3} max={12} value={common(elements, (el) => Number(el.sides) || 6) ?? 6} onChange={(sides) => patch({ sides }, { label: 'الأضلاع' })} onCommit={seal} showValue />
            </Row>
          )}
          {type === 'star' && (
            <>
              <Row label="الرؤوس">
                <Slider className="flex-1" label="عدد الرؤوس" min={3} max={32} value={common(elements, (el) => Number(el.points) || 5) ?? 5} onChange={(points) => patch({ points }, { label: 'الرؤوس' })} onCommit={seal} showValue />
              </Row>
              <Row label="العمق">
                <Slider className="flex-1" label="عمق النجمة" min={0.1} max={0.95} step={0.01} value={common(elements, (el) => Number(el.innerRadius) || 0.48) ?? 0.48} onChange={(innerRadius) => patch({ innerRadius }, { label: 'العمق' })} onCommit={seal} showValue />
              </Row>
            </>
          )}
        </PopButton>
      )}
    </>
  );
}

function LineTools({ elements }) {
  const patch = usePatch();
  const seal = useSeal();
  const { branding } = useEditorData();
  const first = elements[0];
  return (
    <>
      <ColorPicker label="لون الخط" value={common(elements, (el) => el.stroke) ?? '#000000'} brandColors={branding?.colors} onChange={(stroke) => stroke && patch({ stroke }, { label: 'لون الخط' })} />
      <PopButton icon={SlidersHorizontal} label="الخط والأسهم" testId="toolbar-line">
        <Row label="السماكة">
          <Slider className="flex-1" label="سماكة الخط" min={0.5} max={30} step={0.5} value={Number(first.strokeWidth) || 3} onChange={(strokeWidth) => patch({ strokeWidth }, { label: 'السماكة' })} onCommit={seal} showValue />
        </Row>
        <Row label="النمط">
          <Segmented size="sm" value={dashKey(first.dash)} onChange={(value) => patch({ dash: DASHES.find((d) => d.value === value).dash }, { label: 'نمط الخط', coalesce: false })} options={DASHES.map((d) => ({ value: d.value, label: d.label }))} />
        </Row>
        <Row label="الأطراف">
          <Segmented size="sm" value={first.lineCap || 'butt'} onChange={(lineCap) => patch({ lineCap }, { label: 'الأطراف', coalesce: false })} options={[{ value: 'butt', label: 'مستقيم' }, { value: 'round', label: 'دائري' }, { value: 'square', label: 'مربع' }]} />
        </Row>
        <Row label="البداية">
          <select className="field field-sm" value={first.startHead || 'none'} onChange={(e) => patch({ startHead: e.target.value }, { label: 'رأس البداية', coalesce: false })}>
            {HEADS.map((head) => <option key={head.value} value={head.value}>{head.label}</option>)}
          </select>
        </Row>
        <Row label="النهاية">
          <select className="field field-sm" value={first.endHead || 'none'} onChange={(e) => patch({ endHead: e.target.value }, { label: 'رأس النهاية', coalesce: false })}>
            {HEADS.map((head) => <option key={head.value} value={head.value}>{head.label}</option>)}
          </select>
          <IconButton icon={ArrowLeftRight} label="تبديل الطرفين" onClick={() => patch((el) => ({ ...el, startHead: el.endHead || 'none', endHead: el.startHead || 'none' }), { label: 'تبديل الأسهم', coalesce: false })} />
        </Row>
      </PopButton>
    </>
  );
}

/* ── Images and frames ─────────────────────────────────────────────────── */

const FILTERS = [
  ['brightness', 'السطوع', -1, 1, 0.05],
  ['contrast', 'التباين', -1, 1, 0.05],
  ['saturation', 'التشبع', -1, 1, 0.05],
  ['blur', 'التنعيم', 0, 20, 0.5],
];

function ImageTools({ elements }) {
  const store = useEditorStoreApi();
  const patch = usePatch();
  const seal = useSeal();
  const { bumpAssets } = useEditorData();
  const inputRef = useRef(null);
  const el = elements[0];
  const filters = el.filters || {};
  const isDynamic = el.type === 'dynamicImage';
  return (
    <>
      {!isDynamic && (
        <>
          <Tooltip content="استبدال الصورة">
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">
              <ImageUp size={16} aria-hidden /> <span className="hidden xl:inline">استبدال</span>
            </button>
          </Tooltip>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              try {
                const asset = await uploadAsset(file);
                bumpAssets?.();
                patch({ src: asset.path, crop: null }, { label: 'استبدال الصورة', coalesce: false });
              } catch {
                toast.error('تعذّر رفع الصورة.');
              }
            }}
          />
          <IconButton icon={Crop} label={S.editor.menu.crop} shortcut="Enter" disabled={!el.src} onClick={() => store.getState().setUi({ cropId: el.id })} data-testid="toolbar-crop" />
        </>
      )}
      <Segmented size="sm" label="الملاءمة" value={el.fit || (el.type === 'frame' ? 'cover' : 'fill')} onChange={(fit) => patch({ fit }, { label: 'ملاءمة الصورة', coalesce: false })} options={[{ value: 'cover', label: 'تغطية' }, { value: 'contain', label: 'احتواء' }, { value: 'fill', label: 'تمديد' }]} />
      <IconButton icon={FlipHorizontal2} label="قلب أفقي" active={Boolean(el.flipX)} onClick={() => patch({ flipX: !el.flipX }, { label: 'قلب', coalesce: false })} />
      <IconButton icon={FlipVertical2} label="قلب رأسي" active={Boolean(el.flipY)} onClick={() => patch({ flipY: !el.flipY }, { label: 'قلب', coalesce: false })} />
      <PopButton icon={WandSparkles} label="المرشّحات" testId="toolbar-filters">
        {FILTERS.map(([key, label, min, max, step]) => (
          <Row key={key} label={label}>
            <Slider className="flex-1" label={label} min={min} max={max} step={step} value={Number(filters[key]) || 0} onChange={(value) => patch((item) => ({ ...item, filters: { ...(item.filters || {}), [key]: value } }), { label: 'المرشّحات' })} onCommit={seal} showValue />
          </Row>
        ))}
        <Row label="أبيض وأسود">
          <Segmented size="sm" value={filters.grayscale ? 'on' : 'off'} onChange={(v) => patch((item) => ({ ...item, filters: { ...(item.filters || {}), grayscale: v === 'on' } }), { label: 'أبيض وأسود', coalesce: false })} options={[{ value: 'on', label: 'تشغيل' }, { value: 'off', label: 'إيقاف' }]} />
        </Row>
      </PopButton>
      <PopButton icon={SlidersHorizontal} label="الحواف">
        {el.type === 'frame' ? (
          <Row label="الشكل">
            <select className="field field-sm" value={el.shape || 'circle'} onChange={(e) => patch({ shape: e.target.value }, { label: 'شكل الإطار', coalesce: false })}>
              {[['rect', 'مستطيل'], ['rounded', 'مستدير'], ['circle', 'دائرة'], ['arch', 'محراب'], ['hexagon', 'سداسي'], ['star8', 'نجمة']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Row>
        ) : (
          <Row label="الاستدارة">
            <Slider className="flex-1" label="استدارة الحواف" min={0} max={200} value={Number(el.cornerRadius) || 0} onChange={(cornerRadius) => patch({ cornerRadius }, { label: 'الاستدارة' })} onCommit={seal} showValue />
          </Row>
        )}
        <Row label="إطار">
          <ColorPicker label="لون الإطار" allowNone value={el.border?.color ?? null} onChange={(color) => patch({ border: color ? { color, width: el.border?.width || 3 } : null }, { label: 'إطار الصورة' })} />
          <Slider className="flex-1" label="سماكة الإطار" min={0} max={30} value={el.border?.width || 0} onChange={(width) => patch({ border: { color: el.border?.color || '#B8893C', width } }, { label: 'إطار الصورة' })} onCommit={seal} showValue />
        </Row>
      </PopButton>
    </>
  );
}

/* ── Ornaments, icons, codes ───────────────────────────────────────────── */

function ColorTools({ elements, accent = false, weight = false }) {
  const patch = usePatch();
  const seal = useSeal();
  const { branding } = useEditorData();
  return (
    <>
      <ColorPicker label="اللون" value={common(elements, (el) => el.color) ?? '#000000'} brandColors={branding?.colors} onChange={(color) => color && patch({ color }, { label: 'اللون' })} testId="toolbar-color" />
      {accent && <ColorPicker label="اللون الثانوي" value={common(elements, (el) => el.accentColor) ?? '#000000'} brandColors={branding?.colors} onChange={(accentColor) => accentColor && patch({ accentColor }, { label: 'اللون الثانوي' })} />}
      {weight && (
        <PopButton icon={SlidersHorizontal} label="السماكة">
          <Row label="السماكة">
            <Slider className="flex-1" label="سماكة الخطوط" min={0.5} max={6} step={0.25} value={common(elements, (el) => Number(el.strokeWidth) || 2) ?? 2} onChange={(strokeWidth) => patch({ strokeWidth }, { label: 'السماكة' })} onCommit={seal} showValue />
          </Row>
        </PopButton>
      )}
    </>
  );
}

function CodeTools({ elements }) {
  const patch = usePatch();
  const el = elements[0];
  const options = [['{{verifyUrl}}', 'رابط التحقق'], ['{{serial}}', 'الرقم التسلسلي'], ['{{studentName}}', 'اسم الطالب']];
  const known = options.some(([value]) => value === el.value);
  return (
    <>
      <ColorPicker label="اللون" value={el.color || '#111111'} onChange={(color) => color && patch({ color }, { label: 'اللون' })} />
      <ColorPicker label="الخلفية" allowNone value={el.background ?? null} onChange={(background) => patch({ background }, { label: 'الخلفية' })} />
      <select className="field field-sm w-40" aria-label="المحتوى" value={known ? el.value : 'custom'} onChange={(e) => e.target.value !== 'custom' && patch({ value: e.target.value }, { label: 'محتوى الرمز', coalesce: false })}>
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        <option value="custom">نص مخصص</option>
      </select>
      {!known && <input className="field field-sm w-48" value={el.value || ''} onChange={(e) => patch({ value: e.target.value }, { label: 'محتوى الرمز' })} onKeyDown={(e) => e.stopPropagation()} aria-label="النص المخصص" />}
    </>
  );
}

/* ── Multi-selection and the common tail ───────────────────────────────── */

function AlignTools({ units }) {
  const store = useEditorStoreApi();
  const align = (mode) => () => runAction(store, 'align', mode);
  return (
    <>
      <IconButton icon={AlignEndVertical} label={S.editor.alignModes.right} onClick={align('right')} data-testid="align-right" />
      <IconButton icon={AlignCenterVertical} label={S.editor.alignModes.centerH} onClick={align('centerH')} />
      <IconButton icon={AlignStartVertical} label={S.editor.alignModes.left} onClick={align('left')} data-testid="align-left" />
      <IconButton icon={AlignStartHorizontal} label={S.editor.alignModes.top} onClick={align('top')} data-testid="align-top" />
      <IconButton icon={AlignCenterHorizontal} label={S.editor.alignModes.middle} onClick={align('middle')} />
      <IconButton icon={AlignEndHorizontal} label={S.editor.alignModes.bottom} onClick={align('bottom')} />
      {units > 2 && (
        <>
          <IconButton icon={AlignHorizontalDistributeCenter} label={S.editor.menu.distributeH} onClick={() => runAction(store, 'distribute', 'horizontal')} />
          <IconButton icon={AlignVerticalDistributeCenter} label={S.editor.menu.distributeV} onClick={() => runAction(store, 'distribute', 'vertical')} />
        </>
      )}
    </>
  );
}

function CommonTail({ info }) {
  const store = useEditorStoreApi();
  const patch = usePatch();
  const seal = useSeal();
  const elements = useSelectedElements();
  const opacity = common(elements, (el) => (el.opacity === undefined ? 1 : Number(el.opacity))) ?? 1;
  return (
    <>
      <Divider />
      <PopButton icon={Blend} label="الشفافية" width="w-60" testId="toolbar-opacity">
        <Slider label="الشفافية" min={0} max={100} value={Math.round(opacity * 100)} onChange={(value) => patch({ opacity: value / 100 }, { label: 'الشفافية' })} onCommit={seal} showValue suffix="٪" />
      </PopButton>
      {info.units > 1 && <IconButton icon={Group} label={S.editor.menu.group} shortcut="MOD+G" onClick={() => runAction(store, 'group')} data-testid="toolbar-group" />}
      {info.grouped && <IconButton icon={Ungroup} label={S.editor.menu.ungroup} shortcut="MOD+Shift+G" onClick={() => runAction(store, 'ungroup')} />}
      <IconButton icon={BringToFront} label={S.editor.menu.bringForward} shortcut="MOD+]" onClick={() => runAction(store, 'bringForward')} />
      <IconButton icon={SendToBack} label={S.editor.menu.sendBackward} shortcut="MOD+[" onClick={() => runAction(store, 'sendBackward')} />
      <IconButton icon={info.allLocked ? Lock : LockOpen} label={info.allLocked ? S.editor.menu.unlock : S.editor.menu.lock} shortcut="MOD+Shift+L" active={info.allLocked} onClick={() => runAction(store, 'lock')} />
      <IconButton icon={Copy} label={S.editor.menu.duplicate} shortcut="MOD+D" onClick={() => runAction(store, 'duplicate')} />
      <IconButton icon={Trash2} label={S.editor.menu.delete} shortcut="Delete" variant="danger" onClick={() => runAction(store, 'delete')} />
    </>
  );
}

/**
 * Context toolbar above the canvas. Its controls follow the selection: text, shape, line, image,
 * ornament, icon, codes, or a multi-selection (align and distribute), then the common tail.
 */
export function ContextToolbar() {
  const store = useEditorStoreApi();
  const elements = useSelectedElements();
  const mode = useEditor((state) => state.ui.mode);
  const cropId = useEditor((state) => state.ui.cropId);
  if (mode === 'preview') return null;
  const info = selectionInfo(store.getState());

  let body = null;
  if (cropId) {
    body = <span className="px-2 text-xs font-semibold text-fg-muted">اسحب الصورة أو غيّر حجمها، ثم اضغط Enter للتطبيق أو Esc للإلغاء.</span>;
  } else if (elements.length === 0) {
    body = <span className="px-2 text-xs text-fg-subtle">{S.editor.empty}</span>;
  } else if (info.units > 1) {
    body = <AlignTools units={info.units} />;
  } else {
    const types = new Set(elements.map((el) => el.type));
    const only = (list) => [...types].every((type) => list.includes(type));
    if (elements.every(isTextElement)) body = <TextTools elements={elements} />;
    else if (only(['rect', 'circle', 'polygon', 'star', 'shape'])) body = <ShapeTools elements={elements} />;
    else if (only(['line'])) body = <LineTools elements={elements} />;
    else if (only(['image', 'dynamicImage', 'frame']) && elements.length === 1) body = <ImageTools elements={elements} />;
    else if (only(['ornament'])) body = <ColorTools elements={elements} accent weight />;
    else if (only(['icon'])) body = <ColorTools elements={elements} weight />;
    else if (only(['qrcode', 'barcode']) && elements.length === 1) body = <CodeTools elements={elements} />;
    if (elements.length > 1 && !body) body = <AlignTools units={info.units} />;
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-surface px-3" data-testid="context-toolbar">
      {body}
      {elements.length > 0 && !cropId && <CommonTail info={info} />}
    </div>
  );
}


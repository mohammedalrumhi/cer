import { CalendarDays, QrCode, ScanBarcode } from 'lucide-react';
import { createElement } from '@shared/model/index.js';
import { ORNAMENT_CATEGORIES, ORNAMENTS, SHAPES } from '@shared/assets/ornaments.js';
import { iconNodeToPaths } from '@shared/render/index.js';
import { DraggableTile } from '../dnd/EditorDnd';
import { iconLabel, useIconSearch } from './iconSearch';
import { OpPreview } from './OpPreview';

const GREEN = '#0F6B52';
const GOLD = '#B8893C';

const SHAPE_PRESETS = [
  { id: 'rect', label: 'مستطيل', keywords: 'مربع', make: () => createElement('rect', { width: 220, height: 140, fill: GREEN }) },
  { id: 'rounded', label: 'مستطيل مستدير', keywords: 'زوايا', make: () => createElement('rect', { width: 220, height: 140, fill: GREEN, cornerRadius: 28 }) },
  { id: 'circle', label: 'دائرة', keywords: 'بيضاوي', make: () => createElement('circle', { width: 150, height: 150, fill: GOLD }) },
  { id: 'triangle', label: 'مثلث', keywords: '', make: () => createElement('polygon', { sides: 3, width: 160, height: 140, fill: '#B64A5D' }) },
  { id: 'hexagon', label: 'مضلع سداسي', keywords: 'مضلع', make: () => createElement('polygon', { sides: 6, width: 160, height: 140, fill: GREEN }) },
  { id: 'octagon', label: 'مضلع ثماني', keywords: 'مضلع', make: () => createElement('polygon', { sides: 8, width: 150, height: 150, fill: '#2D4F7C' }) },
  { id: 'star', label: 'نجمة', keywords: 'نجوم', make: () => createElement('star', { points: 5, width: 160, height: 160, fill: GOLD }) },
  { id: 'badge', label: 'شارة', keywords: 'ختم وسام', make: () => createElement('star', { points: 16, innerRadius: 0.84, width: 170, height: 170, fill: GOLD }) },
  ...Object.entries(SHAPES).map(([key, entry]) => ({
    id: `shape-${key}`,
    label: entry.label,
    keywords: entry.keywords,
    make: () => createElement('shape', { shape: key, width: Math.round(entry.aspect >= 1 ? 320 : 220 * entry.aspect), height: Math.round(entry.aspect >= 1 ? 320 / entry.aspect : 220), fill: key === 'cloud' || key === 'sun' ? '#7FB3D5' : GREEN }),
  })),
];

const LINE_PRESETS = [
  { id: 'line', label: 'خط', make: () => createElement('line', { width: 320 }) },
  { id: 'dashed', label: 'خط متقطع', make: () => createElement('line', { width: 320, dash: [6, 4] }) },
  { id: 'dotted', label: 'خط منقط', make: () => createElement('line', { width: 320, dash: [0, 3], strokeWidth: 4 }) },
  { id: 'arrow', label: 'سهم', make: () => createElement('line', { width: 300, endHead: 'triangle' }) },
  { id: 'double-arrow', label: 'سهم مزدوج', make: () => createElement('line', { width: 300, startHead: 'arrow', endHead: 'arrow' }) },
  { id: 'dots-line', label: 'خط بنقاط', make: () => createElement('line', { width: 300, startHead: 'circle', endHead: 'circle', stroke: GOLD }) },
];

const FRAME_PRESETS = [
  { id: 'frame-rect', label: 'إطار مستطيل', shape: 'rect' },
  { id: 'frame-rounded', label: 'إطار مستدير', shape: 'rounded' },
  { id: 'frame-circle', label: 'إطار دائري', shape: 'circle' },
  { id: 'frame-arch', label: 'إطار محراب', shape: 'arch' },
  { id: 'frame-hexagon', label: 'إطار سداسي', shape: 'hexagon' },
  { id: 'frame-star8', label: 'إطار نجمة', shape: 'star8' },
].map((preset) => ({ ...preset, make: () => createElement('frame', { shape: preset.shape, width: preset.shape === 'arch' ? 200 : 240, height: preset.shape === 'arch' ? 280 : 240 }) }));

function ornamentPreset(key) {
  const entry = ORNAMENTS[key];
  const base = 180;
  const width = entry.aspect >= 1 ? Math.round(base * Math.min(entry.aspect, 4.5)) : Math.round(base * entry.aspect);
  const height = entry.aspect >= 1 ? Math.round(width / entry.aspect) : base;
  return {
    id: `orn-${key}`,
    label: entry.label,
    keywords: entry.keywords,
    category: entry.category,
    make: () => createElement('ornament', { ornament: key, width, height, color: GOLD, accentColor: GREEN }),
  };
}
const ORNAMENT_PRESETS = Object.keys(ORNAMENTS).map(ornamentPreset);

const tileClass = 'flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface-2 p-1 text-fg-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-sm active:scale-95';

function matches(preset, query) {
  return !query || preset.label.includes(query) || (preset.keywords || '').includes(query);
}

function Tiles({ title, presets, query, cols = 'grid-cols-3' }) {
  const shown = presets.filter((preset) => matches(preset, query));
  if (!shown.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold text-fg-subtle">{title}</h3>
      <div className={`grid gap-2 ${cols}`}>
        {shown.map((preset) => {
          const preview = preset.icon ? <preset.icon size={30} className="text-primary" /> : <OpPreview element={preset.make()} />;
          return (
            <DraggableTile key={preset.id} id={`el-${preset.id}`} testId={`tile-${preset.id}`} label={preset.label} payload={{ make: preset.make, preview }} className={tileClass}>
              {preview}
              <span className="line-clamp-1 text-[10.5px] font-semibold">{preset.label}</span>
            </DraggableTile>
          );
        })}
      </div>
    </section>
  );
}

function IconTiles({ query }) {
  const { names, library } = useIconSearch(query);
  if (!library) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold text-fg-subtle">أيقونات</h3>
      <div className="grid grid-cols-5 gap-1.5">
        {names.filter((name) => library[name]).map((name) => {
          const paths = iconNodeToPaths(library[name]);
          const make = () => createElement('icon', { iconName: name, paths, width: 96, height: 96, color: GREEN });
          const glyph = (
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {paths.map((d) => <path key={d} d={d} />)}
            </svg>
          );
          return (
            <DraggableTile key={name} id={`icon-${name}`} label={iconLabel(name)} payload={{ make, preview: glyph }} className="grid aspect-square place-items-center rounded-sm text-fg hover:bg-primary-50 hover:text-primary">
              {glyph}
            </DraggableTile>
          );
        })}
      </div>
      {query && names.length === 0 && <p className="py-3 text-center text-xs text-fg-muted">لا توجد أيقونات بهذا الاسم. جرّب كلمة أخرى.</p>}
    </section>
  );
}

const CODE_PRESETS = [
  { id: 'qrcode', label: 'رمز QR للتحقق', keywords: 'تحقق رابط', icon: QrCode, make: () => createElement('qrcode', { width: 140, height: 140 }) },
  { id: 'barcode', label: 'باركود الرقم', keywords: 'رقم تسلسلي', icon: ScanBarcode, make: () => createElement('barcode', { width: 300, height: 96 }) },
  { id: 'date', label: 'تاريخ هجري', keywords: 'تاريخ', icon: CalendarDays, make: () => createElement('dateField', { date: { calendar: 'hijri', style: 'long', source: 'issue' } }) },
  { id: 'date-g', label: 'تاريخ ميلادي', keywords: 'تاريخ', icon: CalendarDays, make: () => createElement('dateField', { date: { calendar: 'gregorian', style: 'long', source: 'issue' } }) },
];

export default function ElementsPanel({ query }) {
  return (
    <div className="flex flex-col gap-5">
      <Tiles title="أشكال" presets={SHAPE_PRESETS} query={query} />
      <Tiles title="خطوط وأسهم" presets={LINE_PRESETS} query={query} />
      <Tiles title="إطارات صور" presets={FRAME_PRESETS} query={query} />
      {ORNAMENT_CATEGORIES.map((category) => (
        <Tiles key={category.id} title={`زخارف إسلامية · ${category.label}`} presets={ORNAMENT_PRESETS.filter((preset) => preset.category === category.id)} query={query} cols={['borders', 'dividers'].includes(category.id) ? 'grid-cols-2' : 'grid-cols-3'} />
      ))}
      <Tiles title="رموز وتواريخ" presets={CODE_PRESETS} query={query} cols="grid-cols-2" />
      <IconTiles query={query} />
    </div>
  );
}

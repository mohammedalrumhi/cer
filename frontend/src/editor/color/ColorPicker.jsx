import { useRef, useState } from 'react';
import { Ban, Check, Pipette, Plus, Trash2 } from 'lucide-react';
import { isGradient, paintToCss } from '@shared/render/index.js';
import { cx } from '../../ui/cx';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/Popover';
import { Segmented } from '../../ui/Segmented';
import { useEditor } from '../store/EditorStoreContext';
import { hexToHsv, hsvToHex, isLight, normalizeHex } from './colorMath';
import { CERTIFICATE_PALETTE, documentColors, useRecentColors } from './colorStores';

const CHECKER = 'repeating-conic-gradient(#d4d4d8 0% 25%, #fff 0% 50%) 50% / 10px 10px';
const L = {
  none: 'بلا لون',
  solid: 'لون',
  gradient: 'تدرّج',
  linear: 'خطي',
  radial: 'دائري',
  angle: 'الزاوية',
  hex: 'رمز اللون',
  eyedropper: 'التقاط لون من الشاشة',
  saturation: 'التشبع والسطوع',
  hue: 'درجة اللون',
  document: 'ألوان التصميم',
  brand: 'ألوان الهوية',
  recent: 'الألوان الأخيرة',
  addBrand: 'إضافة إلى ألوان الهوية',
  removeStop: 'حذف نقطة اللون',
  addStop: 'انقر لإضافة نقطة لون',
  stop: 'نقطة لون',
};

/** Drag helper: calls onMove with 0–1 fractions inside the element (left→right, top→bottom). */
function useDrag2D(onMove) {
  return (event) => {
    const el = event.currentTarget;
    const move = (ev) => {
      const r = el.getBoundingClientRect();
      onMove(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
    };
    el.setPointerCapture(event.pointerId);
    move(event);
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };
}

function SolidEditor({ hex, onChange }) {
  const [hsv, setHsv] = useState(() => hexToHsv(hex));
  const [draft, setDraft] = useState(null);
  const shown = hsvToHex(hsv) === hex ? hsv : hexToHsv(hex);
  const apply = (next) => {
    setHsv(next);
    onChange(hsvToHex(next));
  };
  const onSV = useDrag2D((fx, fy) => apply({ ...shown, s: fx, v: 1 - fy }));
  const onHue = useDrag2D((fx) => apply({ ...shown, h: fx * 360 }));
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  // Colour areas are drawn left-to-right like every colour tool, even in RTL.
  return (
    <div className="flex flex-col gap-3" dir="ltr">
      <div
        role="slider"
        aria-label={L.saturation}
        aria-valuenow={Math.round(shown.s * 100)}
        tabIndex={0}
        onPointerDown={onSV}
        onKeyDown={(e) => {
          const d = e.shiftKey ? 0.1 : 0.02;
          if (e.key === 'ArrowRight') apply({ ...shown, s: Math.min(1, shown.s + d) });
          else if (e.key === 'ArrowLeft') apply({ ...shown, s: Math.max(0, shown.s - d) });
          else if (e.key === 'ArrowUp') apply({ ...shown, v: Math.min(1, shown.v + d) });
          else if (e.key === 'ArrowDown') apply({ ...shown, v: Math.max(0, shown.v - d) });
          else return;
          e.preventDefault();
        }}
        className="relative h-36 cursor-crosshair touch-none rounded-sm"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${shown.h} 100% 50%)` }}
      >
        <span className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.3)]" style={{ left: `${shown.s * 100}%`, top: `${(1 - shown.v) * 100}%`, background: hex }} />
      </div>
      <div
        role="slider"
        aria-label={L.hue}
        aria-valuenow={Math.round(shown.h)}
        aria-valuemin={0}
        aria-valuemax={360}
        tabIndex={0}
        onPointerDown={onHue}
        onKeyDown={(e) => {
          const d = e.shiftKey ? 15 : 2;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') apply({ ...shown, h: (shown.h + d) % 360 });
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') apply({ ...shown, h: (shown.h + 360 - d) % 360 });
          else return;
          e.preventDefault();
        }}
        className="relative h-3 cursor-pointer touch-none rounded-full"
        style={{ background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
      >
        <span className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.3)]" style={{ left: `${(shown.h / 360) * 100}%`, background: `hsl(${shown.h} 100% 50%)` }} />
      </div>
      <div className="flex items-center gap-2">
        <span className="size-8 shrink-0 rounded-sm border border-border" style={{ background: hex }} />
        <input
          value={draft ?? hex}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = draft === null ? null : normalizeHex(draft);
            if (n) onChange(n);
            setDraft(null);
          }}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); }}
          aria-label={L.hex}
          spellCheck={false}
          className="field field-sm min-w-0 flex-1 font-mono uppercase"
        />
        {hasEyeDropper && (
          <button
            type="button"
            aria-label={L.eyedropper}
            title={L.eyedropper}
            onClick={async () => {
              try {
                const { sRGBHex } = await new window.EyeDropper().open();
                const n = normalizeHex(sRGBHex);
                if (n) onChange(n);
              } catch {
                // Cancelled.
              }
            }}
            className="grid size-8 shrink-0 place-items-center rounded-sm border border-border text-fg-muted hover:text-fg"
          >
            <Pipette size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function Swatches({ title, colors, current, onPick, extra }) {
  if (!colors.length && !extra) return null;
  return (
    <div>
      <p className="mb-1.5 text-2xs font-bold text-fg-subtle">{title}</p>
      <div className="grid grid-cols-8 gap-1.5">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={color}
            onClick={() => onPick(color)}
            className="grid aspect-square place-items-center rounded-full border border-black/10 transition-transform hover:scale-110"
            style={{ background: color }}
          >
            {current === color && <Check size={12} className={isLight(color) ? 'text-black' : 'text-white'} />}
          </button>
        ))}
        {extra}
      </div>
    </div>
  );
}

function GradientEditor({ value, onChange }) {
  const [selected, setSelected] = useState(0);
  const barRef = useRef(null);
  const sel = Math.min(selected, value.stops.length - 1);
  const stop = value.stops[sel];
  const setStops = (stops) => onChange({ ...value, stops });

  const dragStop = (index) => (event) => {
    event.stopPropagation();
    setSelected(index);
    const bar = barRef.current;
    const move = (ev) => {
      const r = bar.getBoundingClientRect();
      const offset = Math.round(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)) * 100) / 100;
      setStops(value.stops.map((s, i) => (i === index ? { ...s, offset } : s)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        size="sm"
        fullWidth
        value={value.type === 'radial' ? 'radial' : 'linear'}
        onChange={(type) => onChange(type === 'linear' ? { type, angle: value.angle ?? 90, stops: value.stops } : { type, stops: value.stops })}
        options={[{ value: 'linear', label: L.linear }, { value: 'radial', label: L.radial }]}
      />
      <div
        ref={barRef}
        dir="ltr"
        className="relative mx-2 h-6 cursor-copy rounded-sm border border-border"
        style={{ background: `${paintToCss({ type: 'linear', angle: 90, stops: value.stops })}, ${CHECKER}` }}
        title={L.addStop}
        onPointerDown={(event) => {
          if (value.stops.length >= 8) return;
          const r = event.currentTarget.getBoundingClientRect();
          const offset = Math.round(((event.clientX - r.left) / r.width) * 100) / 100;
          setStops([...value.stops, { offset, color: stop.color }]);
          setSelected(value.stops.length);
        }}
      >
        {value.stops.map((s, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${L.stop} ${i + 1}`}
            onPointerDown={dragStop(i)}
            className={cx('absolute top-1/2 h-8 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-[4px] border-2 shadow', i === sel ? 'border-primary ring-2 ring-primary/30' : 'border-white')}
            style={{ left: `${s.offset * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
        {value.type !== 'radial' && (
          <label className="flex flex-1 items-center gap-2">
            {L.angle}
            <input type="range" min={0} max={360} value={value.angle ?? 90} onChange={(e) => onChange({ ...value, angle: Number(e.target.value) })} className="flex-1 accent-[var(--primary)]" />
            <span className="w-10 text-end tabular-nums text-fg">{value.angle ?? 90}°</span>
          </label>
        )}
        <button
          type="button"
          disabled={value.stops.length <= 2}
          onClick={() => { setStops(value.stops.filter((_, i) => i !== sel)); setSelected(0); }}
          aria-label={L.removeStop}
          title={L.removeStop}
          className="ms-auto grid size-7 place-items-center rounded-sm hover:bg-surface-2 disabled:opacity-30"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <SolidEditor key={sel} hex={normalizeHex(stop.color) || '#000000'} onChange={(color) => setStops(value.stops.map((s, i) => (i === sel ? { ...s, color } : s)))} />
    </div>
  );
}

/**
 * Solid / gradient colour picker with document, brand, recent and certificate swatches.
 * @param {{ value: string|object|null, onChange: (paint) => void, label: string, allowGradient?: boolean,
 *   allowNone?: boolean, brandColors?: string[], onAddBrandColor?: (hex: string) => void, children?: React.ReactNode }} props
 */
export function ColorPicker({ value, onChange, label, allowGradient = false, allowNone = false, brandColors = [], onAddBrandColor, children, side = 'bottom', testId }) {
  const document = useEditor((state) => state.document);
  const recent = useRecentColors((state) => state.colors);
  const pushRecent = useRecentColors((state) => state.push);
  const gradient = isGradient(value);
  const [mode, setMode] = useState(gradient ? 'gradient' : 'solid');
  const solid = value === null || value === undefined ? null : gradient ? normalizeHex(value.stops[0]?.color) : normalizeHex(value);
  const pick = (color) => {
    onChange(color);
    pushRecent(color);
  };

  return (
    <Popover onOpenChange={(open) => {
      if (!open && typeof value === 'string') pushRecent(value);
      if (open) setMode(gradient ? 'gradient' : 'solid');
    }}
    >
      <PopoverTrigger asChild>
        {children || (
          <button
            type="button"
            aria-label={label}
            title={label}
            data-testid={testId}
            className="size-7 shrink-0 rounded-full border border-black/15 shadow-sm ring-offset-2 ring-offset-surface transition hover:ring-2 hover:ring-primary/40"
            style={{ background: value === null || value === undefined ? CHECKER : paintToCss(value) }}
          />
        )}
      </PopoverTrigger>
      <PopoverContent side={side} className="flex max-h-[80vh] w-[280px] flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">{label}</p>
          {allowNone && (
            <button type="button" onClick={() => onChange(null)} className={cx('inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-semibold hover:bg-surface-2', value === null ? 'text-primary' : 'text-fg-muted')}>
              <Ban size={14} /> {L.none}
            </button>
          )}
        </div>
        {allowGradient && (
          <Segmented
            size="sm"
            fullWidth
            value={mode}
            onChange={(next) => {
              setMode(next);
              if (next === 'gradient' && !gradient) {
                const base = solid || '#0F6B52';
                onChange({ type: 'linear', angle: 90, stops: [{ offset: 0, color: base }, { offset: 1, color: '#B8893C' }] });
              } else if (next === 'solid' && gradient) onChange(solid || '#000000');
            }}
            options={[{ value: 'solid', label: L.solid }, { value: 'gradient', label: L.gradient }]}
          />
        )}
        {mode === 'gradient' && gradient ? <GradientEditor value={value} onChange={onChange} /> : <SolidEditor hex={solid || '#FFFFFF'} onChange={onChange} />}
        <Swatches title={L.document} colors={documentColors(document)} current={solid} onPick={pick} />
        <Swatches
          title={L.brand}
          colors={brandColors.map((c) => normalizeHex(c)).filter(Boolean)}
          current={solid}
          onPick={pick}
          extra={onAddBrandColor && typeof value === 'string' ? (
            <button type="button" aria-label={L.addBrand} title={L.addBrand} onClick={() => onAddBrandColor(normalizeHex(value))} className="grid aspect-square place-items-center rounded-full border border-dashed border-fg-subtle text-fg-muted hover:border-primary hover:text-primary">
              <Plus size={12} />
            </button>
          ) : undefined}
        />
        <Swatches title={L.recent} colors={recent} current={solid} onPick={pick} />
        {CERTIFICATE_PALETTE.map((row) => <Swatches key={row.label} title={row.label} colors={row.colors} current={solid} onPick={pick} />)}
      </PopoverContent>
    </Popover>
  );
}

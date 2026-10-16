import { useMemo, useState } from 'react';
import { Check, ChevronDown, Minus, Plus, Search } from 'lucide-react';
import { cx } from '../../ui/cx';
import { formatNumber, toLatinDigits } from '../../ui/format';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/Popover';
import { Tooltip } from '../../ui/Tooltip';

/**
 * Numeric field: accepts Arabic-Indic or Latin digits, commits on Enter/blur, arrows step
 * (Shift = ×10). Shows Arabic-Indic digits.
 */
export function NumberField({ label, value, onChange, onCommit, min = -Infinity, max = Infinity, step = 1, suffix, className, compact = false, testId, mixed = false }) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? (mixed || value === undefined || value === null || Number.isNaN(value) ? '' : formatNumber(Math.round(Number(value) * 100) / 100));
  const commit = (text) => {
    const n = Number(toLatinDigits(String(text)).replace(/[٫,]/g, '.').replace(/[^\d.-]/g, ''));
    setDraft(null);
    if (Number.isFinite(n)) {
      onChange(Math.min(max, Math.max(min, n)));
      onCommit?.();
    }
  };
  return (
    <label className={cx('flex min-w-0 items-center gap-1.5', compact ? 'h-8' : '', className)}>
      {label && <span className="shrink-0 text-2xs font-semibold text-fg-subtle">{label}</span>}
      <span className="relative flex min-w-0 flex-1 items-center">
        <input
          value={shown}
          placeholder={mixed ? '—' : undefined}
          inputMode="decimal"
          data-testid={testId}
          aria-label={label}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => { if (draft !== null) commit(event.target.value); }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') {
              commit(event.currentTarget.value);
              event.currentTarget.blur();
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              const delta = (event.key === 'ArrowUp' ? 1 : -1) * step * (event.shiftKey ? 10 : 1);
              onChange(Math.min(max, Math.max(min, Math.round(((Number(value) || 0) + delta) * 100) / 100)));
            } else if (event.key === 'Escape') {
              setDraft(null);
              event.currentTarget.blur();
            }
          }}
          className="field field-sm w-full min-w-0 text-center tabular-nums"
        />
        {suffix && <span className="pointer-events-none absolute end-2 text-2xs text-fg-subtle">{suffix}</span>}
      </span>
    </label>
  );
}

/** − value + stepper, for font sizes in the toolbar. */
export function Stepper({ value, onChange, min = 1, max = 999, step = 1, label, testId }) {
  return (
    <div className="flex items-center rounded-sm border border-border bg-surface">
      <Tooltip content={`${label} −`}>
        <button type="button" aria-label={`تقليل ${label}`} onClick={() => onChange(Math.max(min, Math.round((Number(value) || 0) - step)))} className="grid size-8 place-items-center text-fg-muted hover:text-fg"><Minus size={14} /></button>
      </Tooltip>
      <NumberField value={value} onChange={onChange} min={min} max={max} className="w-12" testId={testId} label={undefined} />
      <Tooltip content={`${label} +`}>
        <button type="button" aria-label={`زيادة ${label}`} onClick={() => onChange(Math.min(max, Math.round((Number(value) || 0) + step)))} className="grid size-8 place-items-center text-fg-muted hover:text-fg"><Plus size={14} /></button>
      </Tooltip>
    </div>
  );
}

/** Searchable font picker (Arabic labels; Latin-only fonts are already filtered out). */
export function FontPicker({ value, options, onChange, testId }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = options.find((option) => option.value === value);
  const shown = useMemo(() => options.filter((option) => !query || option.label.includes(query)), [options, query]);
  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button type="button" data-testid={testId} className="flex h-8 w-44 items-center justify-between gap-2 rounded-sm border border-border bg-surface px-2.5 text-xs font-semibold hover:border-border-strong" aria-label="الخط">
          <span className="truncate">{current?.label || value || 'الخط'}</span>
          <ChevronDown size={14} className="shrink-0 text-fg-subtle" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-64 flex-col gap-2 p-2">
        <label className="relative block">
          <Search size={14} className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="ابحث عن خط…" className="field field-sm ps-8" />
        </label>
        <div className="max-h-72 overflow-y-auto">
          {shown.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={cx('flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-start text-sm hover:bg-surface-2', option.value === value && 'bg-primary-50 text-primary')}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check size={14} />}
            </button>
          ))}
          {!shown.length && <p className="p-3 text-center text-xs text-fg-muted">لا يوجد خط بهذا الاسم.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Small labelled section used in popovers and the properties panel. */
export function Section({ title, children, action }) {
  return (
    <section className="flex flex-col gap-2.5 border-b border-border px-4 py-3 last:border-b-0">
      {(title || action) && (
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-fg-subtle">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Row({ label, children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-fg-muted">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

import { Heart, Search, X } from 'lucide-react';
import { CATEGORIES } from '@shared/templates/index.js';
import { cx } from '../../ui/cx';
import { EMPTY_FILTERS } from './filterModel';

function Chip({ active, onClick, children, testId }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId} className={cx('h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition', active ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg')}>
      {children}
    </button>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-fg-muted">
      {label}
      <select className="field field-sm h-8 w-auto py-0" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

/** Category chips, orientation/audience/detail filters, favourites and search. */
export function GalleryFilters({ filters, onChange, showFavorites = false, compact = false }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const active = JSON.stringify({ ...filters, query: '' }) !== JSON.stringify({ ...EMPTY_FILTERS, query: '' }) || filters.query;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input type="search" value={filters.query} onChange={(e) => set({ query: e.target.value })} placeholder="ابحث باسم القالب أو اللون…" className="field ps-9" aria-label="بحث في القوالب" />
        </label>
        {!compact && (
          <>
            <Select label="الاتجاه" value={filters.orientation} onChange={(orientation) => set({ orientation })} options={[['all', 'الكل'], ['landscape', 'عرضي'], ['portrait', 'طولي']]} />
            <Select label="الفئة" value={filters.audience} onChange={(audience) => set({ audience })} options={[['all', 'الكل'], ['student', 'الطلاب'], ['adult', 'الدارسين']]} />
            <Select label="التفاصيل" value={filters.detail} onChange={(detail) => set({ detail })} options={[['all', 'الكل'], ['simple', 'بسيط'], ['detailed', 'مفصّل']]} />
          </>
        )}
        {showFavorites && (
          <button type="button" onClick={() => set({ favorites: !filters.favorites })} className={cx('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold', filters.favorites ? 'border-danger/40 bg-danger-bg text-danger' : 'border-border text-fg-muted')}>
            <Heart size={14} fill={filters.favorites ? 'currentColor' : 'none'} /> المفضلة
          </button>
        )}
        {active && (
          <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold text-fg-muted hover:text-fg">
            <X size={14} /> مسح الفلاتر
          </button>
        )}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={filters.category === 'all'} onClick={() => set({ category: 'all' })} testId="category-all">الكل</Chip>
        {CATEGORIES.map((category) => (
          <Chip key={category.id} active={filters.category === category.id} onClick={() => set({ category: category.id })} testId={`category-${category.id}`}>{category.label}</Chip>
        ))}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Check, LayoutTemplate } from 'lucide-react';
import { STARTERS } from '@shared/templates/index.js';
import { GalleryFilters } from '../../components/gallery/GalleryFilters';
import { EMPTY_FILTERS, matchesFilters } from '../../components/gallery/filterModel';
import { StarterCard } from '../../components/gallery/StarterCard';
import { TemplateThumbnail } from '../../components/gallery/TemplateThumbnail';
import { createFromStarter } from '../../components/gallery/templateActions';
import { cx } from '../../ui/cx';
import { Segmented } from '../../ui/Segmented';
import { EmptyState } from '../../ui/States';
import { toast } from '../../ui/toast';

/** Step 1: choose a saved template (or start from a ready one) and, if offered, its colour. */
export function StepTemplate({ templates, branding, selectedId, variantKey, audienceType, onAudience, onSelect, onVariant, onCreated }) {
  const [tab, setTab] = useState('mine');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [busy, setBusy] = useState(null);
  const shown = useMemo(() => templates.filter((template) => matchesFilters(template, filters)), [templates, filters]);
  const selected = templates.find((template) => template.id === selectedId);

  return (
    <div className="flex flex-col gap-4">
      <Segmented value={tab} onChange={setTab} options={[{ value: 'mine', label: 'قوالبي' }, { value: 'starters', label: 'قوالب جاهزة' }]} />
      <GalleryFilters filters={filters} onChange={setFilters} showFavorites={tab === 'mine'} />

      {tab === 'mine' && (shown.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="لا توجد قوالب مطابقة" body="جرّب تبويب «قوالب جاهزة» أو امسح الفلاتر." compact />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" role="radiogroup" aria-label="القالب">
          {shown.map((template) => {
            const active = template.id === selectedId;
            return (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid="wizard-template"
                onClick={() => onSelect(template.id)}
                className={cx('group relative flex flex-col gap-2 rounded-md border bg-surface p-2 text-start transition', active ? 'border-primary ring-4 ring-primary/20' : 'border-border hover:border-border-strong hover:shadow-sm')}
              >
                <span className="grid place-items-center rounded-sm bg-canvas p-2">
                  <TemplateThumbnail template={template} branding={branding} variantKey={active ? variantKey : undefined} className="max-h-44 rounded-xs shadow-sm" />
                </span>
                <span className="line-clamp-1 px-1 text-xs font-bold">{template.name}</span>
                {active && <span className="absolute end-3 top-3 grid size-7 place-items-center rounded-full bg-primary text-primary-fg shadow-md"><Check size={16} /></span>}
              </button>
            );
          })}
        </div>
      ))}

      {tab === 'starters' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {STARTERS.map((starter) => (
            <StarterCard
              key={starter.id}
              starter={starter}
              branding={branding}
              busy={busy === starter.id}
              onUse={async (item, paletteKey) => {
                try {
                  setBusy(item.id);
                  const created = await createFromStarter(item.id, paletteKey);
                  onCreated(created);
                  setTab('mine');
                  toast.success('أُضيف القالب إلى «قوالبي» واختير للإصدار.');
                } catch {
                  toast.error('تعذّر إنشاء القالب.');
                } finally {
                  setBusy(null);
                }
              }}
            />
          ))}
        </div>
      )}

      {selected && audienceType && (
        <section className="card flex flex-col gap-2 p-4" data-testid="wizard-audience">
          <h3 className="text-sm font-bold">لمن هذه الشهادات؟</h3>
          <Segmented
            value={audienceType}
            onChange={onAudience}
            label="الفئة"
            options={[{ value: 'student', label: 'الطلاب' }, { value: 'adult', label: 'الدارسون' }]}
          />
          <p className="text-xs text-fg-muted">
            {audienceType === 'adult'
              ? 'يُكتب «الدارس» للرجال و«الدارسة» للنساء تلقائيًا.'
              : 'يُكتب «الطالب» للأولاد و«الطالبة» للبنات تلقائيًا.'}
            {' '}يُعرف الجنس من الاسم. ومن حُدّدت فئته في قائمة الطلاب أو في الملف (عمود «الفئة») يُطبع حسب فئته، ويمكنك تعديل الفئة والجنس لأي شخص في خطوة المراجعة.
          </p>
        </section>
      )}

      {selected?.availableBackgroundVariants?.length > 0 && (
        <section className="card flex flex-col gap-2 p-4">
          <h3 className="text-sm font-bold">لون الخلفية</h3>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => onVariant(null)} className={cx('h-8 rounded-full border px-3 text-xs font-semibold', !variantKey ? 'border-primary bg-primary-50 text-primary' : 'border-border')}>الأصلي</button>
            {selected.availableBackgroundVariants.map((variant) => (
              <button
                key={variant.key}
                type="button"
                title={variant.label}
                aria-label={variant.label}
                onClick={() => onVariant(variant.key)}
                className={cx('size-8 rounded-full border-2 shadow-sm transition hover:scale-110', variantKey === variant.key ? 'border-fg ring-2 ring-primary/30' : 'border-white')}
                style={{ background: `linear-gradient(135deg, ${variant.accentColor} 50%, ${variant.color} 50%)` }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

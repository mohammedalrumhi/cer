import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, ImageUp, LayoutTemplate } from 'lucide-react';
import { STARTERS } from '@shared/templates/index.js';
import { createTemplate, fetchBranding, uploadTemplateDesign } from '../api/client';
import { GalleryFilters } from '../components/gallery/GalleryFilters';
import { EMPTY_FILTERS, matchesFilters } from '../components/gallery/filterModel';
import { StarterCard } from '../components/gallery/StarterCard';
import { createFromStarter } from '../components/gallery/templateActions';
import { PAGE_SIZES } from '../editor/model/pageSizes';
import { S } from '../strings.ar';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/Field';
import { formatNumber } from '../ui/format';
import { EmptyState } from '../ui/States';
import { toast } from '../ui/toast';

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => { resolve({ width: image.width, height: image.height }); URL.revokeObjectURL(objectUrl); };
    image.onerror = () => { reject(new Error('invalid image')); URL.revokeObjectURL(objectUrl); };
    image.src = objectUrl;
  });
}

// Starters carry their audience/detail on the built template; precompute them for filtering.
const STARTER_META = STARTERS.map((starter) => {
  const sample = starter.build({ primary: '#000000', secondary: '#000000', paper: '#FFFFFF' });
  return { ...starter, width: sample.width, height: sample.height, audienceType: sample.audienceType, detailLevel: sample.detailLevel };
});

export default function TemplateNew() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [branding, setBranding] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchBranding().then((data) => { if (alive) setBranding(data); }, () => {});
    return () => { alive = false; };
  }, []);

  const starters = useMemo(() => STARTER_META.filter((starter) => matchesFilters(starter, filters)), [filters]);

  async function run(key, task) {
    try {
      setBusy(key);
      const template = await task();
      navigate(`/templates/${template.id}/edit`);
    } catch {
      toast.error(S.newTemplate.createError);
      setBusy(null);
    }
  }

  const blank = (size) => run(`blank-${size.id}`, () => createTemplate({
    name: S.template.untitled,
    schemaVersion: 3,
    width: size.width,
    height: size.height,
    orientation: size.width >= size.height ? 'landscape' : 'portrait',
    digits: 'arabic',
    page: { margins: { top: 40, right: 40, bottom: 40, left: 40 }, bleed: 0 },
    background: { type: 'solid', color: '#FFFFFF', customLayout: true },
    elements: [],
  }));

  const fromImage = (file) => run('image', async () => {
    const [{ width, height }, uploaded] = await Promise.all([readImageDimensions(file), uploadTemplateDesign(file)]);
    return createTemplate({
      name: S.template.untitled,
      schemaVersion: 3,
      width,
      height,
      orientation: width >= height ? 'landscape' : 'portrait',
      digits: 'arabic',
      background: { type: 'image', color: '#FFFFFF', imagePath: uploaded.path, customLayout: true },
      elements: [],
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={S.newTemplate.eyebrow} title={S.newTemplate.title} subtitle="اختر قالبًا جاهزًا وألوانه، ثم عدّل كل شيء فيه كما تريد." />

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-md font-bold">{S.newTemplate.blank}</h2>
        <div className="flex flex-wrap gap-2">
          {PAGE_SIZES.slice(0, 6).map((size) => (
            <Button key={size.id} size="sm" icon={FilePlus2} loading={busy === `blank-${size.id}`} onClick={() => blank(size)}>
              {size.label}
            </Button>
          ))}
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-dashed border-border-strong px-3 text-xs font-semibold text-fg-muted hover:border-primary hover:text-primary">
            <ImageUp size={15} aria-hidden /> {S.newTemplate.designImage}
            <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) fromImage(file); }} />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">قوالب جاهزة</h2>
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary">{`${formatNumber(starters.length)} قالبًا`}</span>
        </div>
        <GalleryFilters filters={filters} onChange={setFilters} />
        {starters.length === 0 ? (
          <EmptyState icon={LayoutTemplate} title="لا توجد قوالب بهذه المواصفات" body="جرّب تغيير الفلاتر أو مسحها." compact />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {starters.map((starter) => <StarterCard key={starter.id} starter={starter} branding={branding} onUse={(item, paletteKey) => run(item.id, () => createFromStarter(item.id, paletteKey))} busy={busy === starter.id} />)}
          </div>
        )}
      </section>
    </div>
  );
}

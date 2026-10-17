import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileStack, LayoutTemplate, Plus, Search, Users } from 'lucide-react';
import { STARTERS } from '@shared/templates/index.js';
import { TemplateCard } from '../components/TemplateCard';
import { BrandingPanel } from '../components/BrandingPanel';
import { GalleryFilters } from '../components/gallery/GalleryFilters';
import { EMPTY_FILTERS, matchesFilters } from '../components/gallery/filterModel';
import { StarterCard } from '../components/gallery/StarterCard';
import { createFromStarter, deleteTemplate, duplicateTemplate, renameTemplate, setFavorite } from '../components/gallery/templateActions';
import { fetchBranding, fetchTemplates, updateBranding, uploadLogo, uploadSignature, uploadStamp } from '../api/client';
import { S } from '../strings.ar';
import { confirm } from '../ui/confirm';
import { PageHeader } from '../ui/Field';
import { formatNumber } from '../ui/format';
import { EmptyState, ErrorState, Skeleton } from '../ui/States';
import { toast } from '../ui/toast';

const UPLOADERS = { logo: uploadLogo, signature: uploadSignature, stamp: uploadStamp };

function QuickAction({ to, icon: Icon, title, hint, tone = 'primary' }) {
  return (
    <Link to={to} className="card hover-lift flex items-center gap-4 p-4">
      <span className={`grid size-12 shrink-0 place-items-center rounded-md text-white shadow-sm ${tone === 'gold' ? 'bg-gold' : 'bg-brand'}`}>
        <Icon size={22} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs text-fg-muted">{hint}</span>
      </span>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-48 rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [branding, setBranding] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [status, setStatus] = useState('loading');
  const [savingBranding, setSavingBranding] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [busyStarter, setBusyStarter] = useState(null);

  const load = useCallback(async () => {
    try {
      const [templateData, brandingData] = await Promise.all([fetchTemplates(), fetchBranding()]);
      setTemplates(templateData);
      setBranding(brandingData);
      setSchoolName(brandingData.schoolName || '');
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(template) {
    const ok = await confirm({ title: S.dashboard.deleteTitle, body: S.dashboard.deleteBody(template.name), confirmLabel: S.common.delete, danger: true });
    if (!ok) return;
    try {
      await deleteTemplate(template);
      setTemplates((prev) => prev.filter((item) => item.id !== template.id));
      toast.success(S.dashboard.deleted);
    } catch {
      toast.error(S.dashboard.deleteError);
    }
  }

  async function handleDuplicate(template) {
    try {
      const copy = await duplicateTemplate(template);
      setTemplates((prev) => [copy, ...prev]);
      toast.success('أُنشئت نسخة من القالب');
    } catch {
      toast.error(S.common.errorGeneric);
    }
  }

  async function handleRename(template, name) {
    try {
      const updated = await renameTemplate(template, name);
      setTemplates((prev) => prev.map((item) => (item.id === template.id ? { ...item, ...updated } : item)));
    } catch {
      toast.error(S.common.errorGeneric);
    }
  }

  async function handleFavorite(template, favorite) {
    setTemplates((prev) => prev.map((item) => (item.id === template.id ? { ...item, favorite } : item)));
    try {
      await setFavorite(template, favorite);
    } catch {
      setTemplates((prev) => prev.map((item) => (item.id === template.id ? { ...item, favorite: !favorite } : item)));
      toast.error(S.common.errorGeneric);
    }
  }

  async function handleUseStarter(starter, paletteKey) {
    try {
      setBusyStarter(starter.id);
      const created = await createFromStarter(starter.id, paletteKey);
      navigate(`/templates/${created.id}/edit`);
    } catch {
      toast.error(S.newTemplate.createError);
      setBusyStarter(null);
    }
  }

  async function handleSaveBranding() {
    try {
      setSavingBranding(true);
      const updated = await updateBranding({ schoolName });
      setBranding(updated);
      toast.success(S.branding.saved);
    } catch {
      toast.error(S.branding.saveError);
    } finally {
      setSavingBranding(false);
    }
  }

  async function handleUpload(kind, file) {
    try {
      const updated = await UPLOADERS[kind](file);
      setBranding(updated);
      toast.success(S.branding.uploadedOk(S.branding[kind]));
    } catch {
      toast.error(S.branding.uploadError);
    }
  }

  const filtered = useMemo(() => [...templates]
    .filter((template) => matchesFilters(template, filters))
    .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)), [templates, filters]);
  const featured = STARTERS.slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={S.dashboard.greeting} title={S.dashboard.title} subtitle={S.dashboard.subtitle} />

      <section aria-label={S.dashboard.quickActions} className="grid gap-3 md:grid-cols-3">
        <QuickAction to="/templates/new" icon={Plus} title={S.dashboard.actionNewTemplate} hint={S.dashboard.actionNewTemplateHint} tone="gold" />
        <QuickAction to="/generate" icon={FileStack} title={S.dashboard.actionGenerate} hint={S.dashboard.actionGenerateHint} />
        <QuickAction to="/students" icon={Users} title={S.dashboard.actionStudents} hint={S.dashboard.actionStudentsHint} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{S.dashboard.templatesTitle}</h2>
            {status === 'ready' && (
              <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {S.dashboard.templatesCount(formatNumber(templates.length))}
              </span>
            )}
          </div>
          <GalleryFilters filters={filters} onChange={setFilters} showFavorites />

          {status === 'loading' && (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
            </div>
          )}
          {status === 'error' && <ErrorState body={S.dashboard.loadError} onRetry={() => { setStatus('loading'); load(); }} />}
          {status === 'ready' && templates.length === 0 && (
            <EmptyState icon={LayoutTemplate} title={S.dashboard.emptyTitle} body={S.dashboard.emptyBody} />
          )}
          {status === 'ready' && templates.length > 0 && filtered.length === 0 && <EmptyState icon={Search} title={S.dashboard.noResults} compact />}
          {status === 'ready' && filtered.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((template) => (
                <TemplateCard key={template.id} template={template} branding={branding} onDelete={handleDelete} onDuplicate={handleDuplicate} onRename={handleRename} onFavorite={handleFavorite} />
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">ابدأ من قالب جاهز</h2>
            <Link to="/templates/new" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              كل القوالب الجاهزة <ArrowLeft size={15} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {featured.map((starter) => <StarterCard key={starter.id} starter={starter} branding={branding} onUse={handleUseStarter} busy={busyStarter === starter.id} />)}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          {branding ? (
            <BrandingPanel branding={branding} schoolName={schoolName} onSchoolNameChange={setSchoolName} onUpload={handleUpload} onSave={handleSaveBranding} saving={savingBranding} />
          ) : status === 'loading' ? (
            <div className="card space-y-3 p-5"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-10" /><Skeleton className="h-24" /></div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

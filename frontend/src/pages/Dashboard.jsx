import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileStack, LayoutTemplate, Plus, Search, Users, X } from 'lucide-react';
import { TemplateCard } from '../components/TemplateCard';
import { BrandingPanel } from '../components/BrandingPanel';
import {
  fetchBranding,
  fetchTemplates,
  removeTemplate,
  updateBranding,
  uploadLogo,
  uploadSignature,
  uploadStamp,
} from '../api/client';
import { S } from '../strings.ar';
import { confirm } from '../ui/confirm';
import { PageHeader } from '../ui/Field';
import { formatNumber } from '../ui/format';
import { EmptyState, ErrorState, Skeleton } from '../ui/States';
import { toast } from '../ui/toast';

const UPLOADERS = { logo: uploadLogo, signature: uploadSignature, stamp: uploadStamp };

function normalizeSearchText(value) {
  return String(value || '').trim().normalize('NFKC').replace(/[ً-ٰٟ]/g, '').toLowerCase();
}

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
  const [templates, setTemplates] = useState([]);
  const [branding, setBranding] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [status, setStatus] = useState('loading');
  const [savingBranding, setSavingBranding] = useState(false);
  const [query, setQuery] = useState('');

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
      await removeTemplate(template.id);
      setTemplates((prev) => prev.filter((item) => item.id !== template.id));
      toast.success(S.dashboard.deleted);
    } catch {
      toast.error(S.dashboard.deleteError);
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

  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    const sorted = [...templates].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    if (!q) return sorted;
    return sorted.filter((template) => {
      const haystack = normalizeSearchText([
        template.name,
        ...(template.availableBackgroundVariants || []).map((variant) => variant.label),
      ].join(' '));
      return haystack.includes(q);
    });
  }, [templates, query]);

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{S.dashboard.templatesTitle}</h2>
              {status === 'ready' && (
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {S.dashboard.templatesCount(formatNumber(templates.length))}
                </span>
              )}
            </div>
            <label className="relative w-full sm:w-72">
              <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={S.dashboard.searchPlaceholder} className="field ps-9 pe-9" aria-label={S.common.search} />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label={S.common.clearSearch} className="absolute end-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-xs text-fg-subtle hover:bg-surface-2">
                  <X size={14} />
                </button>
              )}
            </label>
          </div>

          {status === 'loading' && (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
            </div>
          )}
          {status === 'error' && <ErrorState body={S.dashboard.loadError} onRetry={() => { setStatus('loading'); load(); }} />}
          {status === 'ready' && templates.length === 0 && (
            <EmptyState
              icon={LayoutTemplate}
              title={S.dashboard.emptyTitle}
              body={S.dashboard.emptyBody}
              action={<Link to="/templates/new" className="inline-flex h-10 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-semibold text-primary-fg"><Plus size={16} />{S.nav.newTemplate}</Link>}
            />
          )}
          {status === 'ready' && templates.length > 0 && filtered.length === 0 && (
            <EmptyState icon={Search} title={S.dashboard.noResults} compact />
          )}
          {status === 'ready' && filtered.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((template) => <TemplateCard key={template.id} template={template} onDelete={handleDelete} />)}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          {branding ? (
            <BrandingPanel
              branding={branding}
              schoolName={schoolName}
              onSchoolNameChange={setSchoolName}
              onUpload={handleUpload}
              onSave={handleSaveBranding}
              saving={savingBranding}
            />
          ) : status === 'loading' ? (
            <div className="card space-y-3 p-5"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-10" /><Skeleton className="h-24" /></div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

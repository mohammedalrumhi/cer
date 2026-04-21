import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { TemplateCard } from '../components/TemplateCard';
import { BrandingPanel } from '../components/BrandingPanel';
import {
  fetchBranding,
  fetchTemplates,
  removeTemplate,
  updateBranding,
  uploadLogo,
  uploadStamp,
  uploadSignature,
} from '../api/client';

function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .toLowerCase();
}

function extractColorLabel(templateName) {
  const match = String(templateName || '').match(/لون\s+(.+?)\s+-/);
  return match?.[1] || '';
}

function extractVariantLabels(template) {
  if (!Array.isArray(template?.availableBackgroundVariants)) return '';
  return template.availableBackgroundVariants.map((variant) => variant.label).join(' ');
}

export default function Dashboard() {
  const [templates, setTemplates] = useState([]);
  const [branding, setBranding] = useState({ schoolName: '' });
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  function getUploadErrorMessage(err, fallback) {
    return err?.response?.data?.message || fallback;
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [templateData, brandingData] = await Promise.all([fetchTemplates(), fetchBranding()]);
        setTemplates(templateData);
        setBranding(brandingData);
        setSchoolName(brandingData.schoolName || '');
      } catch (err) {
        setError('فشل في تحميل البيانات. حاول مرة أخرى.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleDeleteTemplate(id) {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا القالب؟')) {
      return;
    }

    try {
      await removeTemplate(id);
      setTemplates((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError('حدث خطأ أثناء حذف القالب. حاول مرة أخرى.');
    }
  }

  async function handleSaveBranding() {
    try {
      setSavingBranding(true);
      const updated = await updateBranding({ schoolName });
      setBranding(updated);
      setError('');
    } catch (err) {
      setError('تعذر حفظ هوية المدرسة. حاول مرة أخرى.');
    } finally {
      setSavingBranding(false);
    }
  }

  async function handleUploadLogo(file) {
    try {
      const updated = await uploadLogo(file);
      setBranding(updated);
      setSchoolName(updated.schoolName || '');
      setError('');
    } catch (err) {
      setError(getUploadErrorMessage(err, 'فشل رفع الشعار. تأكد من نوع الملف وحاول مرة أخرى.'));
    }
  }

  async function handleUploadSignature(file) {
    try {
      const updated = await uploadSignature(file);
      setBranding(updated);
      setError('');
    } catch (err) {
      setError(getUploadErrorMessage(err, 'فشل رفع التوقيع. تأكد من نوع الملف وحاول مرة أخرى.'));
    }
  }

  async function handleUploadStamp(file) {
    try {
      const updated = await uploadStamp(file);
      setBranding(updated);
      setError('');
    } catch (err) {
      setError(getUploadErrorMessage(err, 'فشل رفع الختم. تأكد من نوع الملف وحاول مرة أخرى.'));
    }
  }

  function clearTemplateFilters() {
    setSearchQuery('');
  }

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);

    const next = templates
      .map((template) => {
        const nameText = normalizeSearchText(template.name);
        const colorLabel = normalizeSearchText(extractColorLabel(template.name));
        const variantLabels = normalizeSearchText(extractVariantLabels(template));
        const colorHex = normalizeSearchText(template.background?.accentColor || template.background?.color || '');
        const updatedAt = new Date(template.updatedAt || 0).getTime();

        let score = 0;
        if (!normalizedQuery) {
          score = updatedAt;
        } else {
          if (colorLabel === normalizedQuery) score += 500;
          else if (colorLabel.startsWith(normalizedQuery)) score += 350;
          else if (colorLabel.includes(normalizedQuery)) score += 250;

          if (variantLabels.includes(normalizedQuery)) score += 220;

          if (nameText.startsWith(normalizedQuery)) score += 180;
          else if (nameText.includes(normalizedQuery)) score += 120;

          if (colorHex.includes(normalizedQuery)) score += 80;
        }

        return { template, score, updatedAt };
      })
      .filter((item) => !normalizedQuery || item.score > 0)
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        return right.updatedAt - left.updatedAt;
      })
      .map((item) => item.template);

    return next;
  }, [templates, searchQuery]);

  const hasActiveFilters = Boolean(searchQuery);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">مرحبًا بكم في لوحة إدارة الشهادات</p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">لوحة التحكم</h1>
        </div>
        <button
          type="button"
          onClick={handleSaveBranding}
          disabled={savingBranding}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
        >
          {savingBranding ? 'جاري الحفظ...' : 'حفظ هوية المدرسة'}
        </button>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <BrandingPanel
          branding={branding}
          onSchoolNameChange={setSchoolName}
          onUploadLogo={handleUploadLogo}
          onUploadSignature={handleUploadSignature}
          onUploadStamp={handleUploadStamp}
        />

        <section className="min-w-0 rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">قوالب الشهادات</h2>
              <p className="text-sm text-slate-500">ابحث مباشرة باسم اللون أو اسم القالب للوصول السريع إلى التعديل.</p>
            </div>
            <span className="whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {filteredTemplates.length} / {templates.length} قالب
            </span>
          </div>

          <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ابحث باللون أولاً، مثال: زمردي، عنابي، كهرماني..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm text-slate-800 outline-none ring-emerald-300 focus:ring"
              />
            </label>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                {hasActiveFilters ? 'نتائج البحث ترتب اللون أولاً' : 'اكتب اسم اللون وستظهر أقرب القوالب أولاً'}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearTemplateFilters}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  <X size={14} />
                  مسح البحث
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-slate-500">جاري التحميل...</div>
          ) : templates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 p-8 text-center text-slate-500">
              لم يتم العثور على قوالب. أنشئ قالبًا جديدًا من القائمة الجانبية.
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              لا توجد قوالب مطابقة للبحث الحالي. جرّب اسم لون مختلف أو امسح البحث.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} onDelete={handleDeleteTemplate} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

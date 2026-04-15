import { useEffect, useState } from 'react';
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

export default function Dashboard() {
  const [templates, setTemplates] = useState([]);
  const [branding, setBranding] = useState({ schoolName: '' });
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">مرحبًا بكم في لوحة إدارة الشهادات</p>
          <h1 className="text-3xl font-bold text-slate-900">لوحة التحكم</h1>
        </div>
        <button
          type="button"
          onClick={handleSaveBranding}
          disabled={savingBranding}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {savingBranding ? 'جاري الحفظ...' : 'حفظ هوية المدرسة'}
        </button>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <BrandingPanel
          branding={branding}
          onSchoolNameChange={setSchoolName}
          onUploadLogo={handleUploadLogo}
          onUploadSignature={handleUploadSignature}
          onUploadStamp={handleUploadStamp}
        />

        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">قوالب الشهادات</h2>
              <p className="text-sm text-slate-500">قم بتحرير أو حذف القوالب الجاهزة.</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {templates.length} قالب
            </span>
          </div>

          {loading ? (
            <div className="text-slate-500">جاري التحميل...</div>
          ) : templates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 p-8 text-center text-slate-500">
              لم يتم العثور على قوالب. أنشئ قالبًا جديدًا من القائمة الجانبية.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} onDelete={handleDeleteTemplate} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

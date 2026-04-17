import { useEffect, useMemo, useState } from 'react';
import { fetchTemplates, generateCertificates } from '../api/client';
import { getTemplateDetailLabel } from '../utils/templateMetadata';
import { TemplatePreviewPanel } from '../components/TemplatePreviewPanel';

function parseManualStudents(value) {
  return value
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

export default function GenerateSimple() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [studentInput, setStudentInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const simpleTemplates = useMemo(
    () => templates.filter((template) => getTemplateDetailLabel(template) === 'بسيط'),
    [templates]
  );
  const selectedTemplate = simpleTemplates.find((template) => template.id === selectedTemplateId) || null;
  const students = useMemo(() => parseManualStudents(studentInput), [studentInput]);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const templateData = await fetchTemplates();
        setTemplates(templateData);
        const simple = templateData.filter((template) => getTemplateDetailLabel(template) === 'بسيط');
        if (simple.length > 0) {
          setSelectedTemplateId(simple[0].id);
        }
      } catch {
        setError('فشل تحميل القوالب البسيطة. حاول مرة أخرى.');
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  async function handleGenerate() {
    if (!selectedTemplateId) {
      setError('اختر قالبًا بسيطًا قبل التوليد.');
      return;
    }

    if (students.length === 0) {
      setError('أدخل أسماء الطلاب سطرًا بسطر أولاً.');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      const { blob, filename, contentType } = await generateCertificates({
        templateId: selectedTemplateId,
        students,
      });

      const isZip = contentType.includes('zip') || students.length > 1;
      const downloadName = filename || (isZip ? 'certificates.zip' : 'certificate.pdf');
      const safeName = isZip && !downloadName.toLowerCase().endsWith('.zip')
        ? 'certificates.zip'
        : downloadName;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = safeName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      setMessage(students.length > 1 ? 'تم إنشاء ملف ZIP للشهادات البسيطة.' : 'تم إنشاء الشهادة البسيطة بنجاح.');
    } catch {
      setError('حدث خطأ أثناء إنشاء الشهادات. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">صفحة الشهادات السريعة</p>
        <h1 className="text-3xl font-bold text-slate-900">توليد الشهادات البسيطة</h1>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6 rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900">القوالب البسيطة</h2>
            <p className="mt-1 text-sm text-slate-500">هذه الصفحة مخصصة للقوالب البسيطة وإدخال الأسماء فقط سطرًا بسطر.</p>
          </div>

          {loading ? (
            <p className="text-slate-500">جاري تحميل القوالب...</p>
          ) : simpleTemplates.length === 0 ? (
            <p className="text-slate-500">لا يوجد قالب بسيط حاليًا.</p>
          ) : (
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
            >
              {simpleTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            أدخل أسماء الطلاب فقط، كل اسم في سطر جديد. إذا كنت تحتاج الحقول التفصيلية مثل نوع الاستظهار أو نص السور فاستخدم صفحة الشهادات المفصلة.
          </div>

          <textarea
            rows={14}
            value={studentInput}
            onChange={(event) => setStudentInput(event.target.value)}
            className="w-full rounded-3xl border border-amber-200 bg-white px-4 py-4 text-sm text-slate-800 outline-none ring-emerald-300 focus:ring"
            placeholder="أدخل أسماء الطلاب فقط، كل اسم في سطر جديد..."
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">عدد الطلاب: {students.length}</span>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={processing || loading}
              className="rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {processing ? 'جاري التوليد...' : 'تحميل الشهادات'}
            </button>
          </div>
        </section>

        <TemplatePreviewPanel template={selectedTemplate} />
      </div>
    </div>
  );
}
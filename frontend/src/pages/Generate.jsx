import { useEffect, useState } from 'react';
import {
  fetchTemplates,
  fetchStudents,
  generateCertificates,
  parseExcel,
} from '../api/client';

export default function Generate() {
  const [templates, setTemplates] = useState([]);
  const [savedStudents, setSavedStudents] = useState([]);
  const [selectedSavedIds, setSelectedSavedIds] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [studentInput, setStudentInput] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [templateData, studentData] = await Promise.all([fetchTemplates(), fetchStudents()]);
        setTemplates(templateData);
        setSavedStudents(studentData);
        setSelectedSavedIds(studentData.map((student) => student.id));
        if (templateData.length > 0) {
          setSelectedTemplateId(templateData[0].id);
        }
      } catch (err) {
        setError('فشل تحميل القوالب أو الطلاب. حاول مرة أخرى.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function parseManualStudents(value) {
    const nextStudents = value
      .split(/\r?\n|,|;/)
      .map((item) => item.trim())
      .filter(Boolean);
    setStudents(nextStudents);
  }

  async function handleExcelUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setProcessing(true);
      const parsedStudents = await parseExcel(file);
      setStudents(parsedStudents);
      setMessage(`${parsedStudents.length} طالب/طالبة تم استيرادهم من الملف.`);
      setError('');
    } catch (err) {
      setError('فشل قراءة ملف Excel. تأكد من أن الملف صالح وحاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  function toggleSavedSelection(id) {
    setSelectedSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function selectAllSaved() {
    setSelectedSavedIds(savedStudents.map((student) => student.id));
  }

  function clearSavedSelection() {
    setSelectedSavedIds([]);
  }

  async function handleGenerate() {
    if (!selectedTemplateId) {
      setError('اختر قالبًا قبل التوليد.');
      return;
    }

    const effectiveStudents = students.length > 0
      ? students
      : savedStudents.filter((student) => selectedSavedIds.includes(student.id)).map((item) => item.name);

    if (effectiveStudents.length === 0) {
      setError('أدخل أسماء الطلاب أو استورد ملف Excel أولاً.');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      const pdfBlob = await generateCertificates({ templateId: selectedTemplateId, students: effectiveStudents });
      const url = window.URL.createObjectURL(pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'شهادات.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setMessage('تم إنشاء الشهادات بنجاح. انقر لتنزيل الملف.');
    } catch (err) {
      setError('حدث خطأ أثناء إنشاء الشهادات. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">صفحة إنشاء الشهادات</p>
        <h1 className="text-3xl font-bold text-slate-900">توليد الشهادات</h1>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-slate-900">اختر القالب</h2>
          {loading ? (
            <p className="text-slate-500">جاري تحميل القوالب...</p>
          ) : templates.length === 0 ? (
            <p className="text-slate-500">لا يوجد أي قالب. أضف قالبًا أولاً.</p>
          ) : (
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          )}

          {savedStudents.length > 0 && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">الطلاب المحفوظون</h3>
                  <p className="text-xs text-slate-500">حدد الطلاب الذين تريد إنشاء شهاداتهم.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllSaved}
                    className="rounded-2xl border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    اختيار الكل
                  </button>
                  <button
                    type="button"
                    onClick={clearSavedSelection}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              <div className="grid max-h-48 gap-2 overflow-auto">
                {savedStudents.map((student) => {
                  const isChecked = selectedSavedIds.includes(student.id);
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleSavedSelection(student.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${isChecked ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span>{student.name}</span>
                      <span className="text-xs font-semibold">{isChecked ? 'محدد' : 'غير محدد'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">استيراد قائمة الطلاب</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              className="block w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
            />
            <p className="text-xs text-slate-500">أو أدخل الأسماء مفصولة بسطر جديد أو فاصلة.</p>
            {savedStudents.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">سيتم استخدام {savedStudents.length} طالبًا محفوظًا إذا تركت القائمة فارغة.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-slate-900">قائمة الطلاب</h2>
          <textarea
            rows={10}
            value={studentInput}
            onChange={(event) => {
              setStudentInput(event.target.value);
              parseManualStudents(event.target.value);
            }}
            className="w-full rounded-3xl border border-amber-200 bg-white px-4 py-4 text-sm text-slate-800 outline-none ring-emerald-300 focus:ring"
            placeholder="أدخل أسماء الطلاب، كل اسم في سطر جديد..."
          />
          {studentInput.trim() && (
            <p className="mt-3 text-xs text-slate-500">سيتم استخدام الأسماء المدخلة يدويًا بدلاً من الطلاب المحفوظين.</p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
      </div>
    </div>
  );
}

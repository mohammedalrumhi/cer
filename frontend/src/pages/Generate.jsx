import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchTemplates,
  fetchStudents,
  generateCertificates,
  parseExcel,
} from '../api/client';
import { getTemplateDetailLabel } from '../utils/templateMetadata';
import { TemplatePreviewPanel } from '../components/TemplatePreviewPanel';

function normalizeStudentRecord(student) {
  if (typeof student === 'string') {
    const name = student.trim();
    return name ? { name } : null;
  }

  if (!student || typeof student !== 'object') return null;

  const name = String(student.name || student.studentName || '').trim();
  if (!name) return null;

  return {
    id: student.id,
    name,
    issueDate: String(student.issueDate || '').trim(),
    recitalType: String(student.recitalType || '').trim(),
    surahRange: String(student.surahRange || '').trim(),
    programName: String(student.programName || '').trim(),
    calendar: String(student.calendar || '').trim(),
    mistakesCount: String(student.mistakesCount || '').trim(),
    teacherName: String(student.teacherName || '').trim(),
  };
}

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
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const detailedTemplates = useMemo(
    () => templates.filter((template) => getTemplateDetailLabel(template) === 'مفصل'),
    [templates]
  );
  const selectedTemplate = detailedTemplates.find((template) => template.id === selectedTemplateId) || null;

  useEffect(() => {
    async function loadData() {
      try {
        const [templateData, studentData] = await Promise.all([fetchTemplates(), fetchStudents()]);
        setTemplates(templateData);
        setSavedStudents(studentData);
        setSelectedSavedIds(studentData.map((student) => student.id));
        const detailed = templateData.filter((template) => getTemplateDetailLabel(template) === 'مفصل');
        if (detailed.length > 0) {
          setSelectedTemplateId(detailed[0].id);
        }
      } catch {
        setError('فشل تحميل القوالب أو الطلاب. حاول مرة أخرى.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleExcelUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setProcessing(true);
      setError('');
      const parsedStudents = await parseExcel(file);
      setStudents(parsedStudents.map(normalizeStudentRecord).filter(Boolean));
      setMessage(`${parsedStudents.length} طالب/طالبة تم استيرادهم من الملف.`);
    } catch {
      setError('فشل قراءة ملف Excel أو CSV. تأكد من أن الملف صالح وحاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check if file is Excel or CSV
      if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'].includes(file.type) &&
          !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError('يرجى اسقاط ملف Excel أو CSV فقط.');
        return;
      }

      try {
        setProcessing(true);
        setError('');
        const parsedStudents = await parseExcel(file);
        setStudents(parsedStudents.map(normalizeStudentRecord).filter(Boolean));
        setMessage(`${parsedStudents.length} طالب/طالبة تم استيرادهم من الملف.`);
      } catch {
        setError('فشل قراءة ملف Excel أو CSV. تأكد من أن الملف صالح وحاول مرة أخرى.');
      } finally {
        setProcessing(false);
      }
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

    const effectiveStudents = savedStudents
      .filter((student) => selectedSavedIds.includes(student.id))
      .map(normalizeStudentRecord)
      .filter(Boolean);

    if (effectiveStudents.length === 0) {
      setError('حدد الطلاب أو استورد ملف Excel/CSV أولاً.');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      const { blob, filename, contentType } = await generateCertificates({
        templateId: selectedTemplateId,
        students: effectiveStudents,
      });

      const isZip = contentType.includes('zip') || effectiveStudents.length > 1;
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
      setMessage(
        effectiveStudents.length > 1
          ? 'تم إنشاء ملف ZIP يحتوي على شهادة مستقلة لكل طالب.'
          : 'تم إنشاء الشهادة بنجاح.'
      );
    } catch {
      setError('حدث خطأ أثناء إنشاء الشهادات. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">صفحة إنشاء الشهادات</p>
        <h1 className="text-3xl font-bold text-slate-900">توليد الشهادات المفصلة</h1>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-slate-900">اختر القالب</h2>
          {loading ? (
            <p className="text-slate-500">جاري تحميل القوالب...</p>
          ) : detailedTemplates.length === 0 ? (
            <p className="text-slate-500">لا يوجد قالب مفصل حاليًا. استخدم صفحة القوالب أو أنشئ قالبًا جديدًا.</p>
          ) : (
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
            >
              {detailedTemplates.map((template) => (
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
                      <span className="text-right">
                        <span className="block">{student.name}</span>
                        {(student.programName || student.teacherName) && (
                          <span className="block text-xs text-slate-500">
                            {[student.programName, student.teacherName].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-semibold">{isChecked ? 'محدد' : 'غير محدد'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">استيراد قائمة الطلاب</label>
            
            {/* Drag and Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-3xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <div className="pointer-events-none">
                <svg className="mx-auto h-12 w-12 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm font-semibold text-slate-700">
                  {dragActive ? 'أفلت الملف هنا' : 'اسحب ملف Excel أو CSV هنا'}
                </p>
                <p className="mt-1 text-xs text-slate-500">أو اضغط لاختيار ملف</p>
              </div>
            </div>

            <p className="text-xs text-slate-500">يدعم ملفات Excel (.xlsx, .xls) و CSV. إذا كان الملف يحتوي أعمدة تفصيلية (نوع الاستظهار، نص السور، إلخ) فستُستخدم داخل الشهادة.</p>
            {savedStudents.length > 0 && <p className="text-xs text-slate-500">يمكنك أيضًا استخدام الطلاب المحفوظين فقط دون رفع ملف جديد.</p>}
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            هذه الصفحة مخصصة للقوالب المفصلة. للإنشاء السريع بالقوالب البسيطة والكتابة سطرًا بسطر استخدم صفحة الشهادات السريعة.
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">عدد الطلاب المحددين: {selectedSavedIds.length}</span>
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

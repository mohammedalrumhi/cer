import { useEffect, useState, useRef } from 'react';
import { parseExcel, fetchStudents, saveStudents, updateStudent, deleteStudent, downloadTemplate } from '../api/client';

const EMPTY_STUDENT = {
  name: '',
  recitalType: '',
  surahRange: '',
  programName: '',
  calendar: '',
  mistakesCount: '',
  teacherName: '',
};

const STUDENT_FIELDS = [
  { key: 'name', label: 'اسم الطالب', placeholder: 'مثال: أحمد محمد' },
  { key: 'recitalType', label: 'نوع الاستظهار', placeholder: 'مثال: نص كامل' },
  { key: 'surahRange', label: 'نص السور (من إلى)', placeholder: 'مثال: من سورة النبأ إلى سورة الناس' },
  { key: 'programName', label: 'اسم البرنامج', placeholder: 'مثال: برنامج الإتقان' },
  { key: 'calendar', label: 'التقويم', placeholder: 'مثال: ممتاز' },
  { key: 'mistakesCount', label: 'عدد الأخطاء', placeholder: 'مثال: 2' },
  { key: 'teacherName', label: 'المعلم', placeholder: 'مثال: الأستاذ خالد' },
];

function normalizeStudent(student) {
  if (!student || typeof student !== 'object') return { ...EMPTY_STUDENT };
  return {
    name: String(student.name || '').trim(),
    recitalType: String(student.recitalType || '').trim(),
    surahRange: String(student.surahRange || '').trim(),
    programName: String(student.programName || '').trim(),
    calendar: String(student.calendar || '').trim(),
    mistakesCount: String(student.mistakesCount || '').trim(),
    teacherName: String(student.teacherName || '').trim(),
  };
}

function escapeCsv(value) {
  const text = String(value || '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function StudentForm({ value, onChange, disabled }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {STUDENT_FIELDS.map((field) => (
        <label key={field.key} className="block text-sm font-semibold text-slate-700">
          {field.label}
          <input
            type="text"
            value={value[field.key] || ''}
            onChange={(event) => onChange(field.key, event.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>
      ))}
    </div>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT);
  const [editingId, setEditingId] = useState('');
  const [editingForm, setEditingForm] = useState(EMPTY_STUDENT);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function loadStudents() {
      try {
        setProcessing(true);
        const savedStudents = await fetchStudents();
        setStudents(savedStudents);
      } catch {
        setError('فشل تحميل قائمة الطلاب. حاول مرة أخرى.');
      } finally {
        setProcessing(false);
      }
    }

    loadStudents();
  }, []);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setProcessing(true);
      setError('');
      setMessage('');
      const parsedStudents = await parseExcel(file);
      if (parsedStudents.length === 0) {
        setError('لم يتم العثور على بيانات طلاب صالحة في الملف.');
        return;
      }

      const savedStudents = await saveStudents(parsedStudents);
      setStudents(savedStudents);
      setMessage(`تم حفظ ${parsedStudents.length} طالب/طالبة بنجاح.`);
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
        setMessage('');
        const parsedStudents = await parseExcel(file);
        if (parsedStudents.length === 0) {
          setError('لم يتم العثور على بيانات طلاب صالحة في الملف.');
          return;
        }

        const savedStudents = await saveStudents(parsedStudents);
        setStudents(savedStudents);
        setMessage(`تم حفظ ${parsedStudents.length} طالب/طالبة بنجاح.`);
      } catch {
        setError('فشل قراءة ملف Excel أو CSV. تأكد من أن الملف صالح وحاول مرة أخرى.');
      } finally {
        setProcessing(false);
      }
    }
  }

  async function handleAddStudent() {
    if (!studentForm.name.trim()) {
      setError('اسم الطالب مطلوب.');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      setMessage('');
      const savedStudents = await saveStudents([normalizeStudent(studentForm)]);
      setStudents(savedStudents);
      setStudentForm(EMPTY_STUDENT);
      setMessage('تم إضافة الطالب بنجاح.');
    } catch {
      setError('تعذر إضافة الطالب. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleDeleteStudent(id) {
    try {
      setProcessing(true);
      setError('');
      await deleteStudent(id);
      setStudents((prev) => prev.filter((item) => item.id !== id));
      setMessage('تم حذف الطالب.');
    } catch {
      setError('فشل حذف الطالب. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  function handleStartEdit(student) {
    setEditingId(student.id);
    setEditingForm(normalizeStudent(student));
    setError('');
    setMessage('');
  }

  function handleCancelEdit() {
    setEditingId('');
    setEditingForm(EMPTY_STUDENT);
  }

  async function handleEditStudent(id) {
    const payload = normalizeStudent(editingForm);
    if (!payload.name) {
      setError('الاسم لا يمكن أن يكون فارغاً.');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      setMessage('');
      const updated = await updateStudent(id, payload);
      setStudents((prev) => prev.map((student) => (student.id === id ? updated : student)));
      setEditingId('');
      setEditingForm(EMPTY_STUDENT);
      setMessage('تم تحديث بيانات الطالب بنجاح.');
    } catch {
      setError('فشل تحديث بيانات الطالب. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  function handleExportCsv() {
    const headers = STUDENT_FIELDS.map((field) => field.label).join(',');
    const rows = students.map((student) =>
      STUDENT_FIELDS.map((field) => escapeCsv(student[field.key])).join(',')
    );
    const csvContent = [headers].concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'students.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadTemplate() {
    try {
      setProcessing(true);
      setError('');
      const { blob, filename } = await downloadTemplate();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage('تم تحميل الملف النموذجي بنجاح.');
    } catch {
      setError('فشل تحميل الملف النموذجي. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">صفحة الطلاب</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">استيراد وإدارة الطلاب</h1>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">إضافة طالب جديد</h2>
        <StudentForm
          value={studentForm}
          onChange={(key, nextValue) => setStudentForm((prev) => ({ ...prev, [key]: nextValue }))}
          disabled={processing}
        />
        <div className="mt-4 flex justify-stretch sm:justify-end">
          <button
            type="button"
            onClick={handleAddStudent}
            disabled={processing}
            className="w-full rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
          >
            إضافة
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">رفع ملف Excel أو CSV</h2>
        
        {/* Drag and Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-5 text-center transition sm:p-8 ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleUpload}
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

        <p className="mt-3 text-xs text-slate-500">
          الأعمدة المدعومة: اسم الطالب، نوع الاستظهار، نص السور، اسم البرنامج، التقويم، عدد الأخطاء، المعلم.
        </p>
        {processing && <p className="mt-4 text-slate-500">جاري استيراد الطلاب...</p>}
      </section>

      <section className="rounded-3xl border border-blue-100 bg-linear-to-br from-blue-50 to-cyan-50 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-900">📥 هل تريد ملف نموذجي؟</h3>
            <p className="mt-1 text-sm text-slate-600">
              حمّل الملف النموذجي مع أمثلة على البيانات الصحيحة وأضف طلابك مباشرة.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={processing}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v4a2 2 0 002 2h12a2 2 0 002-2v-4m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            تحميل الملف النموذجي
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">قائمة الطلاب المحفوظين</h2>
            <p className="text-sm text-slate-500">يمكنك تعديل كل بيانات الطالب أو تصدير القائمة لملف CSV.</p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={students.length === 0}
            className="min-h-11 rounded-2xl border border-emerald-700 bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            تصدير CSV
          </button>
        </div>
        <div className="mb-4">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {students.length} طالب
          </span>
        </div>
        {students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            لا يوجد طلاب محفوظين حتى الآن.
          </div>
        ) : (
          <div className="grid gap-3">
            {students.map((student) => (
              <div key={student.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                {editingId === student.id ? (
                  <div className="space-y-3">
                    <StudentForm
                      value={editingForm}
                      onChange={(key, nextValue) => setEditingForm((prev) => ({ ...prev, [key]: nextValue }))}
                      disabled={processing}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditStudent(student.id)}
                        disabled={processing}
                        className="rounded-2xl bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        حفظ
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2 text-sm text-slate-700">
                      <div className="text-base font-semibold text-slate-900">{student.name}</div>
                      <div className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                        {STUDENT_FIELDS.filter((field) => field.key !== 'name').map((field) => (
                          <div key={field.key}>
                            {field.label}: {student[field.key] || '—'}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(student)}
                        className="min-h-11 rounded-2xl border border-amber-200 bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-200"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(student.id)}
                        disabled={processing}
                        className="min-h-11 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}




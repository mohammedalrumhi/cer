import { useEffect, useState } from 'react';
import { parseExcel, fetchStudents, saveStudents, updateStudent, deleteStudent } from '../api/client';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadStudents() {
      try {
        setProcessing(true);
        const savedStudents = await fetchStudents();
        setStudents(savedStudents);
      } catch (err) {
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
        setError('لم يتم العثور على أسماء صالحة في الملف.');
        return;
      }

      const savedStudents = await saveStudents(parsedStudents);
      setStudents(savedStudents);
      setMessage(`تم حفظ ${parsedStudents.length} طالب/طالبة بنجاح.`);
    } catch (err) {
      setError('فشل قراءة ملف Excel. تأكد من أن الملف صالح وحاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleAddStudent() {
    if (!studentName.trim()) return;

    try {
      setProcessing(true);
      setError('');
      setMessage('');
      const savedStudents = await saveStudents([studentName.trim()]);
      setStudents(savedStudents);
      setStudentName('');
      setMessage('تم إضافة الطالب بنجاح.');
    } catch (err) {
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
    } catch (err) {
      setError('فشل حذف الطالب. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  function handleStartEdit(student) {
    setEditingId(student.id);
    setEditingName(student.name);
    setError('');
    setMessage('');
  }

  function handleCancelEdit() {
    setEditingId('');
    setEditingName('');
  }

  async function handleEditStudent(id) {
    const name = editingName.trim();
    if (!name) {
      setError('الاسم لا يمكن أن يكون فارغاً.');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      setMessage('');
      const updated = await updateStudent(id, { name });
      setStudents((prev) => prev.map((student) => (student.id === id ? updated : student)));
      setEditingId('');
      setEditingName('');
      setMessage('تم تحديث اسم الطالب بنجاح.');
    } catch (err) {
      setError('فشل تحديث اسم الطالب. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  function handleExportCsv() {
    const csvContent = ['الاسم']
      .concat(students.map((student) => student.name))
      .join('\n');
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">صفحة الطلاب</p>
        <h1 className="text-3xl font-bold text-slate-900">استيراد وإدارة الطلاب</h1>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">إضافة طالب جديد</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            placeholder="اسم الطالب"
            className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
          />
          <button
            type="button"
            onClick={handleAddStudent}
            disabled={processing}
            className="rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            إضافة
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">رفع ملف Excel</h2>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleUpload}
          className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none"
        />
        {processing && <p className="mt-4 text-slate-500">جاري استيراد الطلاب...</p>}
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">قائمة الطلاب المحفوظين</h2>
            <p className="text-sm text-slate-500">يمكنك تعديل الأسماء أو تصدير القائمة لملف CSV.</p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={students.length === 0}
            className="rounded-2xl border border-emerald-700 bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
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
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-slate-700">{student.name}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(student)}
                        className="rounded-2xl border border-amber-200 bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-200"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(student.id)}
                        disabled={processing}
                        className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed"
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

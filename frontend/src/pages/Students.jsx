import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet, PenLine, Plus, Search, Trash2, UploadCloud, UserPlus, Users } from 'lucide-react';
import { deleteStudent, downloadTemplate, fetchStudents, parseExcel, saveStudents, updateStudent } from '../api/client';
import { S } from '../strings.ar';
import { Button, IconButton } from '../ui/Button';
import { confirm } from '../ui/confirm';
import { cx } from '../ui/cx';
import { Dialog } from '../ui/Dialog';
import { Field, PageHeader } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { formatNumber } from '../ui/format';
import { EmptyState, ErrorState, Skeleton } from '../ui/States';
import { toast } from '../ui/toast';

const FIELDS = ['name', 'recitalType', 'surahRange', 'programName', 'calendar', 'mistakesCount', 'teacherName'];
const EMPTY = Object.fromEntries(FIELDS.map((key) => [key, '']));

function normalizeSearch(value) {
  return String(value || '').normalize('NFKC').replace(/[ً-ٰٟ]/g, '').toLowerCase().trim();
}

function escapeCsv(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function StudentDialog({ open, onOpenChange, initial, onSubmit, busy }) {
  const [form, setForm] = useState(initial || EMPTY);
  const isEdit = Boolean(initial?.id);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      icon={isEdit ? PenLine : UserPlus}
      title={isEdit ? S.common.edit : S.students.addTitle}
      size="lg"
      footer={(
        <>
          <Button onClick={() => onOpenChange(false)}>{S.common.cancel}</Button>
          <Button variant="primary" loading={busy} onClick={() => onSubmit(form)}>{isEdit ? S.common.save : S.students.addButton}</Button>
        </>
      )}
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}
      >
        {FIELDS.map((key) => (
          <Field key={key} label={S.students.fields[key]} className={key === 'name' || key === 'surahRange' ? 'sm:col-span-2' : ''}>
            <input
              className="field"
              value={form[key] || ''}
              onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
              placeholder={S.students.placeholders[key]}
              autoFocus={key === 'name'}
            />
          </Field>
        ))}
        <Field label={S.students.gender} className="sm:col-span-2">
          <Segmented
            value={form.gender || 'auto'}
            onChange={(gender) => setForm((prev) => ({ ...prev, gender: gender === 'auto' ? undefined : gender }))}
            options={[{ value: 'auto', label: `${S.students.genderAuto} (من الاسم)` }, { value: 'male', label: S.students.male }, { value: 'female', label: S.students.female }]}
          />
        </Field>
        <Field label={S.students.audience} hint={S.students.audienceHint} className="sm:col-span-2">
          <Segmented
            value={form.audienceType || 'batch'}
            onChange={(audienceType) => setForm((prev) => ({ ...prev, audienceType: audienceType === 'batch' ? undefined : audienceType }))}
            options={[{ value: 'batch', label: S.students.audienceBatch }, { value: 'student', label: S.students.audienceStudent }, { value: 'adult', label: S.students.audienceAdult }]}
            label={S.students.audience}
          />
        </Field>
        {form.fields && Object.keys(form.fields).length > 0 && (
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            {Object.entries(form.fields).map(([key, value]) => (
              <Field key={key} label={key.replace(/_/g, ' ')}>
                <input className="field" value={value} onChange={(event) => setForm((prev) => ({ ...prev, fields: { ...prev.fields, [key]: event.target.value } }))} />
              </Field>
            ))}
          </div>
        )}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState('all');
  const [dialog, setDialog] = useState(null); // null | { initial }
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setStudents(await fetchStudents());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function importFile(file) {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error(S.students.onlySheets);
      return;
    }
    try {
      setBusy(true);
      const parsed = await parseExcel(file);
      if (parsed.length === 0) {
        toast.error(S.students.importEmpty);
        return;
      }
      const before = students.length;
      const saved = await saveStudents(parsed);
      setStudents(saved);
      toast.success(S.students.imported(formatNumber(Math.max(0, saved.length - before))));
    } catch {
      toast.error(S.students.importError);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(form) {
    const student = Object.fromEntries(FIELDS.map((key) => [key, String(form[key] || '').trim()]));
    student.gender = form.gender || '';
    student.audienceType = form.audienceType || '';
    if (form.fields) student.fields = form.fields;
    if (!student.name) {
      toast.error(S.students.nameRequired);
      return;
    }
    try {
      setBusy(true);
      if (dialog?.initial?.id) {
        const updated = await updateStudent(dialog.initial.id, { ...dialog.initial, ...student });
        setStudents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        toast.success(S.students.updated);
      } else {
        setStudents(await saveStudents([student]));
        toast.success(S.students.added);
      }
      setDialog(null);
    } catch {
      toast.error(S.students.saveError);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(student) {
    const ok = await confirm({ title: S.students.deleteTitle, body: S.students.deleteBody(student.name), confirmLabel: S.common.delete, danger: true });
    if (!ok) return;
    try {
      await deleteStudent(student.id);
      setStudents((prev) => prev.filter((item) => item.id !== student.id));
      toast.success(S.students.deleted);
    } catch {
      toast.error(S.students.deleteError);
    }
  }

  async function handleDownloadSample() {
    try {
      const { blob, filename } = await downloadTemplate();
      downloadBlob(blob, filename);
    } catch {
      toast.error(S.common.errorGeneric);
    }
  }

  function handleExportCsv() {
    const audienceLabel = (student) => (student.audienceType === 'adult' ? S.students.audienceAdult : student.audienceType === 'student' ? S.students.audienceStudent : '');
    const header = [...FIELDS.map((key) => S.students.fields[key]), S.students.audience];
    const rows = students.map((student) => [...FIELDS.map((key) => escapeCsv(student[key])), audienceLabel(student)]);
    const csv = `${String.fromCharCode(0xfeff)}${[header, ...rows].map((row) => row.join(',')).join('\n')}`;
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'الطلاب.csv');
  }

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return students.filter((student) => (audience === 'all' || student.audienceType === audience)
      && (!q || normalizeSearch(FIELDS.map((key) => student[key]).join(' ')).includes(q)));
  }, [students, query, audience]);
  const hasAudience = students.some((student) => student.audienceType);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={S.students.eyebrow}
        title={S.students.title}
        subtitle={S.students.subtitle}
        actions={(
          <>
            <Button icon={Download} onClick={handleDownloadSample}>{S.students.downloadSample}</Button>
            <Button variant="primary" icon={Plus} onClick={() => setDialog({ initial: null })}>{S.students.addTitle}</Button>
          </>
        )}
      />

      <section
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); importFile(e.dataTransfer.files?.[0]); }}
        className={cx(
          'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragActive ? 'border-primary bg-primary-50' : 'border-border-strong bg-surface',
        )}
      >
        <span className="grid size-12 place-items-center rounded-md bg-gold-50 text-gold-600"><FileSpreadsheet size={24} aria-hidden /></span>
        <div>
          <h2 className="text-md font-bold">{dragActive ? S.students.dropHere : S.students.importTitle}</h2>
          <p className="text-sm text-fg-muted">{S.students.importHint}</p>
        </div>
        <Button variant="soft" icon={UploadCloud} loading={busy} onClick={() => fileRef.current?.click()}>{S.students.importButton}</Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ''; }} />
      </section>

      <section className="card flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{S.students.listTitle}</h2>
            {status === 'ready' && <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary">{S.students.count(formatNumber(students.length))}</span>}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {hasAudience && (
              <Segmented
                value={audience}
                onChange={setAudience}
                label={S.students.audience}
                options={[{ value: 'all', label: S.students.audienceAll }, { value: 'student', label: S.students.audienceStudents }, { value: 'adult', label: S.students.audienceAdults }]}
              />
            )}
            <label className="relative flex-1 sm:w-72">
              <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input type="search" className="field ps-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={S.students.searchPlaceholder} aria-label={S.common.search} />
            </label>
            <Button onClick={handleExportCsv} disabled={students.length === 0}>{S.students.exportCsv}</Button>
          </div>
        </div>

        {status === 'loading' && <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>}
        {status === 'error' && <ErrorState body={S.students.loadError} onRetry={() => { setStatus('loading'); load(); }} />}
        {status === 'ready' && students.length === 0 && (
          <EmptyState icon={Users} title={S.students.emptyTitle} body={S.students.emptyBody} action={<Button variant="primary" icon={Plus} onClick={() => setDialog({ initial: null })}>{S.students.addTitle}</Button>} />
        )}
        {status === 'ready' && students.length > 0 && filtered.length === 0 && <EmptyState icon={Search} title={S.students.noResults} compact />}
        {status === 'ready' && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface-2 text-xs text-fg-muted">
                <tr>
                  {FIELDS.map((key) => <th key={key} scope="col" className="px-3 py-2.5 text-start font-semibold">{S.students.fields[key]}</th>)}
                  <th scope="col" className="px-3 py-2.5 text-start font-semibold">حقول إضافية</th>
                  <th scope="col" className="w-24 px-3 py-2.5"><span className="sr-only">{S.common.edit}</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id} className="border-t border-border transition-colors hover:bg-surface-2/60">
                    {FIELDS.map((key) => (
                      <td key={key} className={cx('px-3 py-2.5', key === 'name' ? 'font-semibold' : 'text-fg-muted')}>{student[key] || '—'}</td>
                    ))}
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {student.audienceType && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-2xs font-semibold text-primary" data-testid="student-audience">{student.audienceType === 'adult' ? S.students.audienceAdult : S.students.audienceStudent}</span>}
                        {student.gender && <span className="rounded-full bg-gold-50 px-2 py-0.5 text-2xs font-semibold text-gold-600">{student.gender === 'female' ? S.students.female : S.students.male}</span>}
                        {Object.entries(student.fields || {}).map(([key, value]) => <span key={key} className="rounded-full bg-surface-2 px-2 py-0.5 text-2xs">{`${key.replace(/_/g, ' ')}: ${value}`}</span>)}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex justify-end gap-1">
                        <IconButton icon={PenLine} label={S.common.edit} onClick={() => setDialog({ initial: student })} />
                        <IconButton icon={Trash2} label={S.common.delete} variant="danger" onClick={() => handleDelete(student)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <StudentDialog key={dialog ? dialog.initial?.id || 'new' : 'closed'} open={Boolean(dialog)} onOpenChange={(open) => { if (!open) setDialog(null); }} initial={dialog?.initial} onSubmit={handleSubmit} busy={busy} />
    </div>
  );
}

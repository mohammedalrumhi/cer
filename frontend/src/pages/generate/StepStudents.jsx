import { useMemo, useRef, useState } from 'react';
import { ClipboardList, FileSpreadsheet, Search, UploadCloud, Users } from 'lucide-react';
import { customFieldKey, rowToStudent } from '@shared/model/index.js';
import { parseSheet } from '../../api/client';
import { S } from '../../strings.ar';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { formatNumber } from '../../ui/format';
import { Segmented } from '../../ui/Segmented';
import { Banner, EmptyState } from '../../ui/States';
import { toast } from '../../ui/toast';

const MAPPING_OPTIONS = [
  ['name', 'اسم الطالب'],
  ['recitalType', 'نوع الاستظهار'],
  ['surahRange', 'نص السور'],
  ['programName', 'اسم البرنامج / المسار'],
  ['calendar', 'التقدير / التقويم'],
  ['mistakesCount', 'عدد الأخطاء'],
  ['teacherName', 'المعلّم'],
  ['issueDate', 'تاريخ الإصدار'],
  ['gender', 'الجنس'],
  ['custom', 'حقل إضافي (يُحفظ باسم العمود)'],
  ['ignore', 'تجاهل هذا العمود'],
];

function SavedStudents({ students, selected, onChange }) {
  const [query, setQuery] = useState('');
  const shown = students.filter((s) => !query || String(s.name).includes(query) || String(s.teacherName || '').includes(query) || String(s.programName || '').includes(query));
  const allShown = shown.length > 0 && shown.every((s) => selected.has(s.id));
  const toggle = (ids, on) => {
    const next = new Set(selected);
    for (const id of ids) (on ? next.add(id) : next.delete(id));
    onChange(next);
  };
  if (!students.length) return <EmptyState compact icon={Users} title={S.students.emptyTitle} body="أضف طلابك من صفحة «الطلاب»، أو استورد ملفًا هنا مباشرة." />;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input className="field ps-9" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={S.students.searchPlaceholder} aria-label={S.common.search} />
        </label>
        <Button size="sm" onClick={() => toggle(shown.map((s) => s.id), !allShown)} data-testid="select-all-saved">{allShown ? 'إلغاء تحديد الظاهرين' : 'تحديد الظاهرين'}</Button>
      </div>
      <div className="max-h-[360px] overflow-y-auto rounded-md border border-border">
        {shown.map((student) => (
          <label key={student.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0 hover:bg-surface-2">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={selected.has(student.id)} onChange={(e) => toggle([student.id], e.target.checked)} />
            <span className="flex-1 font-semibold">{student.name}</span>
            <span className="text-xs text-fg-muted">{[student.programName, student.teacherName].filter(Boolean).join(' · ')}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SheetImport({ sheet, onSheet }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function load(file) {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error(S.students.onlySheets);
      return;
    }
    try {
      setBusy(true);
      const parsed = await parseSheet(file);
      if (!parsed.rows.length) {
        toast.error(S.students.importEmpty);
        return;
      }
      onSheet({ ...parsed, fileName: file.name });
    } catch {
      toast.error(S.students.importError);
    } finally {
      setBusy(false);
    }
  }

  const students = useMemo(() => (sheet ? sheet.rows.map((row) => rowToStudent(row, sheet.mapping)).filter(Boolean) : []), [sheet]);
  const hasName = sheet && Object.values(sheet.mapping).includes('name');

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); load(e.dataTransfer.files?.[0]); }}
        className={cx('flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-center text-sm transition-colors', over ? 'border-primary bg-primary-50' : 'border-border-strong')}
      >
        <FileSpreadsheet size={26} className="text-gold-600" aria-hidden />
        {sheet ? <span className="font-semibold">{`${sheet.fileName} — ${formatNumber(sheet.rows.length)} صفًا`}</span> : <span className="text-fg-muted">{S.students.importHint}</span>}
        <Button variant="soft" size="sm" icon={UploadCloud} loading={busy} onClick={() => inputRef.current?.click()} data-testid="wizard-upload">{sheet ? 'اختيار ملف آخر' : S.students.importButton}</Button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" data-testid="wizard-file" onChange={(e) => { load(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {sheet && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-bold">ربط الأعمدة بالحقول</h3>
          <p className="text-xs text-fg-muted">طابقنا الأعمدة تلقائيًا من عناوينها. غيّر أي عمود إن لزم؛ الأعمدة الإضافية تُحفظ وتصبح حقولًا يمكن استخدامها في القالب.</p>
          {!hasName && <Banner tone="danger">اختر العمود الذي يحتوي اسم الطالب.</Banner>}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs text-fg-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">العمود في الملف</th>
                  <th className="px-3 py-2 text-start font-semibold">مثال</th>
                  <th className="px-3 py-2 text-start font-semibold">يُستخدم كـ</th>
                </tr>
              </thead>
              <tbody>
                {sheet.headers.map((header) => (
                  <tr key={header} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{header}</td>
                    <td className="max-w-56 truncate px-3 py-2 text-fg-muted">{sheet.rows.find((row) => row[header])?.[header] || '—'}</td>
                    <td className="px-3 py-2">
                      <select
                        className="field field-sm"
                        value={sheet.mapping[header]}
                        data-testid={`map-${header}`}
                        onChange={(e) => onSheet({ ...sheet, mapping: { ...sheet.mapping, [header]: e.target.value } })}
                      >
                        {MAPPING_OPTIONS.map(([value, label]) => <option key={value} value={value}>{value === 'custom' ? `حقل إضافي: ${customFieldKey(header).replace(/_/g, ' ')}` : label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-semibold text-primary">{`${formatNumber(students.length)} طالبًا جاهزًا من الملف`}</p>
        </section>
      )}
    </div>
  );
}

function PasteList({ value, onChange, count }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-fg-muted">اكتب أو الصق الأسماء، كل اسم في سطر. الفواصل جزء من الاسم ولا تُقسّمه.</p>
      <textarea className="field min-h-56 leading-8" value={value} onChange={(e) => onChange(e.target.value)} placeholder={'محمد بن سعيد الرمحي\nفاطمة بنت علي الكثيرية\n…'} data-testid="wizard-paste" aria-label="قائمة الأسماء" />
      <p className="text-xs font-semibold text-primary">{`${formatNumber(count)} اسمًا`}</p>
    </div>
  );
}

/** Step 2: saved students, an imported sheet and/or a pasted list — combined and deduplicated. */
export function StepStudents({ savedStudents, selectedSaved, onSelectedSaved, sheet, onSheet, pasted, onPasted, pastedCount, saveImported, onSaveImported, total, duplicatesRemoved }) {
  const [tab, setTab] = useState(savedStudents.length ? 'saved' : 'file');
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'saved', label: `الطلاب المحفوظون (${formatNumber(selectedSaved.size)})`, icon: Users },
          { value: 'file', label: 'استيراد ملف', icon: FileSpreadsheet },
          { value: 'paste', label: 'لصق قائمة', icon: ClipboardList },
        ]}
      />
      {tab === 'saved' && <SavedStudents students={savedStudents} selected={selectedSaved} onChange={onSelectedSaved} />}
      {tab === 'file' && <SheetImport sheet={sheet} onSheet={onSheet} />}
      {tab === 'paste' && <PasteList value={pasted} onChange={onPasted} count={pastedCount} />}
      {(sheet || pastedCount > 0) && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={saveImported} onChange={(e) => onSaveImported(e.target.checked)} />
          حفظ الطلاب المستوردين في قائمة الطلاب لاستخدامهم لاحقًا
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3 rounded-md bg-primary-50 px-4 py-3 text-sm" data-testid="wizard-total">
        <Users size={18} className="text-primary" />
        <span className="font-bold text-primary">{`الإجمالي: ${formatNumber(total)} طالبًا`}</span>
        {duplicatesRemoved > 0 && <span className="text-xs text-fg-muted">{`(حُذف ${formatNumber(duplicatesRemoved)} مكرر)`}</span>}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleCheck, Download, FileArchive, FileImage, FileText, History, LoaderCircle, ShieldCheck, Trash2, X } from 'lucide-react';
import { renderTextTemplate } from '@shared/render/index.js';
import { cancelJob, createJob, deleteJob, downloadJob, fetchJob, fetchJobs, issueSerials, saveBlob } from '../../api/client';
import { FIELD_LABELS } from '../../strings.ar';
import { Button, IconButton } from '../../ui/Button';
import { confirm } from '../../ui/confirm';
import { cx } from '../../ui/cx';
import { Field } from '../../ui/Field';
import { formatNumber, formatPercent, formatRelativeTime } from '../../ui/format';
import { Segmented } from '../../ui/Segmented';
import { Banner } from '../../ui/States';
import { toast } from '../../ui/toast';
import { buildPreviewValues } from '../../editor/model/sampleData';
import { renderTemplateToCanvas } from '../../editor/render/renderScene';
import { createZip } from '../../generate/zip';

const FORMATS = [
  { value: 'pdf', label: 'ملف PDF واحد', icon: FileText, hint: 'كل الشهادات في ملف واحد جاهز للطباعة.' },
  { value: 'zip', label: 'ملفات PDF منفصلة', icon: FileArchive, hint: 'ملف مضغوط فيه شهادة لكل طالب.' },
  { value: 'png', label: 'صور PNG', icon: FileImage, hint: 'صورة عالية الدقة لكل طالب، للمشاركة الإلكترونية.' },
  { value: 'jpg', label: 'صور JPG', icon: FileImage, hint: 'صور أخف حجمًا للإرسال عبر الجوال.' },
];
const PATTERN_FIELDS = ['studentName', 'programName', 'teacherName', 'calendar', 'serial'];
const STATUS = { queued: 'في الانتظار', running: 'جارٍ الإنشاء', done: 'جاهز', failed: 'تعذّر', cancelled: 'أُلغي' };

function sanitize(name, fallback) {
  // eslint-disable-next-line no-control-regex -- control characters are invalid in file names
  return String(name || '').replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || fallback;
}

function JobHistory({ refreshKey }) {
  const [jobs, setJobs] = useState([]);
  const load = useCallback(() => fetchJobs().then(setJobs, () => {}), []);
  useEffect(() => { load(); }, [load, refreshKey]);
  if (!jobs.length) return null;
  return (
    <section className="card flex flex-col gap-2 p-4" data-testid="job-history">
      <h3 className="flex items-center gap-2 text-sm font-bold"><History size={16} /> الإصدارات السابقة</h3>
      <ul className="divide-y divide-border">
        {jobs.slice(0, 12).map((job) => (
          <li key={job.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{job.templateName || job.fileName}</span>
              <span className="block text-2xs text-fg-muted">{`${formatNumber(job.total)} شهادة · ${job.output === 'zip' ? 'ملفات منفصلة' : 'ملف واحد'} · ${formatRelativeTime(job.createdAt)}`}</span>
            </span>
            <span className={cx('rounded-full px-2 py-0.5 text-2xs font-semibold', job.status === 'done' ? 'bg-success-bg text-success' : job.status === 'failed' ? 'bg-danger-bg text-danger' : 'bg-surface-2 text-fg-muted')}>{STATUS[job.status] || job.status}</span>
            {job.status === 'done' && (
              <IconButton icon={Download} label="تنزيل" onClick={async () => {
                try {
                  const { blob, filename } = await downloadJob(job);
                  saveBlob(blob, filename);
                } catch {
                  toast.error('انتهت صلاحية هذا الملف؛ أنشئه من جديد.');
                }
              }} />
            )}
            <IconButton icon={Trash2} label="حذف" variant="danger" onClick={async () => {
              if (!(await confirm({ title: 'حذف هذا الإصدار؟', body: 'سيُحذف الملف من الخادم.', danger: true, confirmLabel: 'حذف' }))) return;
              await deleteJob(job.id).catch(() => {});
              load();
            }} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Step 4: output format, file names, layout, verification; runs the job with progress. */
export function StepOutput({ template, templateId, variantKey, branding, rows, verificationDefault }) {
  const [format, setFormat] = useState('pdf');
  const [pattern, setPattern] = useState('{{studentName}}');
  const [layout, setLayout] = useState('1up');
  const [verification, setVerification] = useState(verificationDefault);
  const [batchName, setBatchName] = useState(template.name || 'شهادات');
  const [run, setRun] = useState(null); // { status, done, total, job? }
  const [historyKey, setHistoryKey] = useState(0);
  const cancelRef = useRef(false);
  const pollRef = useRef(null);
  useEffect(() => () => clearTimeout(pollRef.current), []);

  const exampleValues = buildPreviewValues(template, branding, rows[0]);
  const exampleName = sanitize(renderTextTemplate(pattern, { ...exampleValues, serial: verification ? '2026-000001' : '' }, 'studentName'), 'شهادة');

  async function runServerJob() {
    const job = await createJob({
      templateId,
      backgroundVariantKey: variantKey || undefined,
      audienceType: template.audienceType,
      students: rows.map(({ key: _key, ...student }) => student),
      output: format,
      layout,
      fileNamePattern: pattern,
      verification,
      fileName: batchName,
    });
    setRun({ status: job.status, done: 0, total: job.total, job });
    const poll = async () => {
      const latest = await fetchJob(job.id).catch(() => null);
      if (!latest) {
        pollRef.current = setTimeout(poll, 1500);
        return;
      }
      setRun({ status: latest.status, done: latest.done, total: latest.total, job: latest });
      if (latest.status === 'done') {
        setHistoryKey((k) => k + 1);
        const { blob, filename } = await downloadJob(latest);
        saveBlob(blob, filename);
        toast.success(`أُنشئت ${formatNumber(latest.total)} شهادة`);
      } else if (latest.status === 'failed') {
        toast.error('تعذّر إنشاء الشهادات. حاول مرة أخرى.');
      } else if (latest.status !== 'cancelled') {
        pollRef.current = setTimeout(poll, 600);
      }
    };
    poll();
  }

  async function runImages() {
    cancelRef.current = false;
    const total = rows.length;
    setRun({ status: 'running', done: 0, total });
    const extras = verification ? await issueSerials(templateId, rows.map((row) => ({ name: row.name, programName: row.programName }))) : null;
    const zip = createZip();
    const used = new Map();
    const type = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const scale = Math.min(3, 3508 / Math.max(Number(template.width) || 1123, Number(template.height) || 794));
    for (let index = 0; index < total; index += 1) {
      if (cancelRef.current) {
        setRun({ status: 'cancelled', done: index, total });
        return;
      }
      const student = rows[index];
      const extra = extras?.[index];
      const { canvas } = await renderTemplateToCanvas(template, { branding, student, scale, extra });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
      const values = { ...buildPreviewValues(template, branding, student), ...(extra || {}) };
      let name = sanitize(renderTextTemplate(pattern, values, 'studentName'), `شهادة-${index + 1}`);
      const count = (used.get(name) || 0) + 1;
      used.set(name, count);
      if (count > 1) name = `${name} (${count})`;
      zip.add(`${name}.${format}`, new Uint8Array(await blob.arrayBuffer()));
      setRun({ status: 'running', done: index + 1, total });
    }
    saveBlob(zip.finish(), `${sanitize(batchName, 'شهادات')}.zip`);
    setRun({ status: 'done', done: total, total });
    toast.success(`أُنشئت ${formatNumber(total)} صورة`);
  }

  async function start() {
    try {
      if (format === 'png' || format === 'jpg') await runImages();
      else await runServerJob();
    } catch {
      setRun(null);
      toast.error('تعذّر بدء الإنشاء. تحقّق من الاتصال وحاول مرة أخرى.');
    }
  }

  async function cancel() {
    cancelRef.current = true;
    if (run?.job) {
      clearTimeout(pollRef.current);
      const job = await cancelJob(run.job.id).catch(() => null);
      setRun((prev) => ({ ...prev, status: 'cancelled', job }));
    }
  }

  const busy = run && (run.status === 'running' || run.status === 'queued');
  const fraction = run?.total ? run.done / run.total : 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-5">
        <section className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="صيغة الإخراج">
          {FORMATS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={format === option.value}
              onClick={() => setFormat(option.value)}
              data-testid={`format-${option.value}`}
              className={cx('flex items-start gap-3 rounded-md border p-3 text-start transition', format === option.value ? 'border-primary bg-primary-50 ring-2 ring-primary/20' : 'border-border hover:border-border-strong')}
            >
              <option.icon size={22} className="mt-0.5 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="block text-xs text-fg-muted">{option.hint}</span>
              </span>
            </button>
          ))}
        </section>

        <Field label="اسم الملف لكل شهادة" hint={`مثال: ${exampleName}`}>
          <input className="field" value={pattern} onChange={(e) => setPattern(e.target.value)} dir="auto" data-testid="file-pattern" />
          <div className="flex flex-wrap gap-1.5">
            {PATTERN_FIELDS.map((field) => (
              <button key={field} type="button" onClick={() => setPattern((p) => `${p}${p ? ' - ' : ''}{{${field}}}`)} className="rounded-full bg-surface-2 px-2.5 py-1 text-2xs font-semibold hover:bg-primary-50 hover:text-primary">
                {`+ ${FIELD_LABELS[field]}`}
              </button>
            ))}
          </div>
        </Field>

        {format === 'pdf' && (
          <Field label="ترتيب الطباعة">
            <Segmented value={layout} onChange={setLayout} options={[{ value: '1up', label: 'شهادة في كل صفحة' }, { value: '2up', label: 'شهادتان في صفحة A4' }]} />
          </Field>
        )}

        <label className="flex items-start gap-3 rounded-md border border-border p-3">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={verification} onChange={(e) => setVerification(e.target.checked)} data-testid="verification" />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-bold"><ShieldCheck size={16} className="text-primary" /> رقم تسلسلي ورمز تحقق</span>
            <span className="block text-xs text-fg-muted">يحصل كل طالب على رقم فريد، ويفتح رمز QR في الشهادة صفحة عامة تؤكد صحتها. أضف عنصر «رمز QR للتحقق» إلى القالب لطباعته.</span>
          </span>
        </label>

        <Field label="اسم الدفعة">
          <input className="field" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
        </Field>
      </div>

      <aside className="flex flex-col gap-4">
        <section className="card flex flex-col gap-3 p-4" data-testid="generate-panel">
          <p className="text-sm">{`سيتم إنشاء ${formatNumber(rows.length)} شهادة.`}</p>
          {!busy && <Button variant="gold" size="lg" icon={FileText} onClick={start} disabled={!rows.length} data-testid="start-generate">إنشاء الشهادات</Button>}
          {run && (
            <div className="flex flex-col gap-2" data-testid="job-progress" data-status={run.status}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  {busy ? <LoaderCircle size={14} className="animate-spin-slow" /> : run.status === 'done' ? <CircleCheck size={14} className="text-success" /> : null}
                  {STATUS[run.status] || run.status}
                </span>
                <span>{`${formatNumber(run.done)} / ${formatNumber(run.total)} · ${formatPercent(fraction)}`}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={run.total} aria-valuenow={run.done}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round(fraction * 100)}%` }} />
              </div>
              {busy && <Button icon={X} onClick={cancel} data-testid="cancel-generate">إلغاء</Button>}
              {run.status === 'done' && run.job && (
                <Button icon={Download} onClick={async () => { const { blob, filename } = await downloadJob(run.job); saveBlob(blob, filename); }} data-testid="download-result">تنزيل مرة أخرى</Button>
              )}
              {run.status === 'done' && <Button variant="ghost" onClick={() => setRun(null)}>إنشاء دفعة أخرى</Button>}
            </div>
          )}
          {(format === 'png' || format === 'jpg') && rows.length > 300 && <Banner tone="info">تُرسم الصور في متصفحك؛ قد يستغرق ذلك بضع دقائق لهذا العدد. أبقِ الصفحة مفتوحة.</Banner>}
        </section>
        <JobHistory refreshKey={historyKey} />
      </aside>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Trash2 } from 'lucide-react';
import { FIELD_LABELS } from '../../strings.ar';
import { IconButton } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { formatNumber } from '../../ui/format';
import { Segmented } from '../../ui/Segmented';
import { LoadingState } from '../../ui/States';
import { detectGenderFromName } from '../../utils/templateMetadata';
import { renderTemplateToCanvas } from '../../editor/render/renderScene';
import { ISSUE_LABELS, ISSUE_SEVERITY, studentValue, templateFields } from '../../generate/preflight';

const PAGE = 50;
const SEVERITY_CLASSES = {
  error: 'bg-danger-bg text-danger',
  warning: 'bg-warning-bg text-warning',
  info: 'bg-info-bg text-info',
};

function setValue(student, field, value) {
  if (field === 'studentName' || field === 'name') return { ...student, name: value };
  if (['recitalType', 'surahRange', 'programName', 'calendar', 'mistakesCount', 'teacherName', 'issueDate'].includes(field)) return { ...student, [field]: value };
  return { ...student, fields: { ...(student.fields || {}), [field]: value } };
}

function Preview({ template, branding, student }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const scale = 420 / (Number(template.width) || 1123);
        const { canvas } = await renderTemplateToCanvas(template, { branding, student, scale: scale * 2 });
        if (alive) setUrl(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        if (alive) setUrl(null);
      }
    }, 150);
    return () => { alive = false; clearTimeout(timer); };
  }, [template, branding, student]);
  return (
    <div className="grid min-h-60 place-items-center rounded-md bg-canvas p-3" data-testid="review-preview">
      {url ? <img src={url} alt={`معاينة شهادة ${student?.name || ''}`} className="max-h-[520px] w-full rounded-xs object-contain shadow-md" /> : <LoadingState />}
    </div>
  );
}

/** Step 3: editable grid, gender per student, pre-flight checks and a live preview. */
export function StepReview({ template, branding, rows, onRows, issues, checking, checkProgress }) {
  const batchAudience = template?.audienceType === 'adult' ? 'adult' : 'student';
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(0);
  const fields = useMemo(() => templateFields(template), [template]);
  const columns = useMemo(() => ['studentName', ...fields.filter((f) => f !== 'studentName' && f !== 'name')], [fields]);

  const problemRows = issues ? rows.map((_, i) => i).filter((i) => issues[i]?.some((issue) => ISSUE_SEVERITY[issue.kind] !== 'info')) : [];
  const indexes = filter === 'problems' ? problemRows : rows.map((_, i) => i);
  const pages = Math.max(1, Math.ceil(indexes.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = indexes.slice(current * PAGE, current * PAGE + PAGE);
  const counts = issues ? issues.flat().reduce((acc, issue) => ({ ...acc, [issue.kind]: (acc[issue.kind] || 0) + 1 }), {}) : {};

  const update = (index, next) => onRows(rows.map((row, i) => (i === index ? next : row)));
  const remove = (index) => onRows(rows.filter((_, i) => i !== index));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={filter} onChange={(value) => { setFilter(value); setPage(0); }} options={[{ value: 'all', label: `الكل (${formatNumber(rows.length)})` }, { value: 'problems', label: `تحتاج مراجعة (${formatNumber(problemRows.length)})` }]} />
          {checking && <span className="text-xs text-fg-muted">{`جارٍ الفحص… ${formatNumber(checkProgress)}٪`}</span>}
          {!checking && issues && Object.entries(counts).map(([kind, count]) => (
            <span key={kind} className={cx('rounded-full px-2.5 py-0.5 text-2xs font-semibold', SEVERITY_CLASSES[ISSUE_SEVERITY[kind]])}>{`${ISSUE_LABELS[kind]}: ${formatNumber(count)}`}</span>
          ))}
          {!checking && issues && !Object.keys(counts).length && <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-2xs font-semibold text-success">لا توجد مشكلات — كل الشهادات جاهزة</span>}
        </div>
        <div className="overflow-x-auto rounded-md border border-border" data-testid="review-grid">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-2 text-xs text-fg-muted">
              <tr>
                <th className="w-10 px-2 py-2">#</th>
                {columns.map((field) => <th key={field} className="px-2 py-2 text-start font-semibold">{FIELD_LABELS[field] || field.replace(/_/g, ' ')}</th>)}
                <th className="px-2 py-2 text-start font-semibold">الفئة</th>
                <th className="px-2 py-2 text-start font-semibold">الصيغة</th>
                <th className="px-2 py-2 text-start font-semibold">الفحص</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {visible.map((index) => {
                const row = rows[index];
                const rowIssues = issues?.[index] || [];
                const worst = rowIssues.some((i) => ISSUE_SEVERITY[i.kind] === 'error') ? 'error' : rowIssues.some((i) => ISSUE_SEVERITY[i.kind] === 'warning') ? 'warning' : null;
                const auto = detectGenderFromName(row.name);
                return (
                  <tr
                    key={row.key}
                    onClick={() => setSelected(index)}
                    data-testid="review-row"
                    data-problem={worst || undefined}
                    className={cx('border-t border-border', worst === 'error' && 'bg-danger-bg/60', worst === 'warning' && 'bg-warning-bg/50', selected === index && 'outline-2 -outline-offset-2 outline-primary')}
                  >
                    <td className="px-2 py-1 text-center text-xs text-fg-subtle">{formatNumber(index + 1)}</td>
                    {columns.map((field) => {
                      const missing = rowIssues.some((i) => i.kind === 'missing' && i.field === field);
                      return (
                        <td key={field} className="px-1 py-1">
                          <input
                            className={cx('field field-sm min-w-28', missing && 'border-danger')}
                            value={studentValue(row, field)}
                            onChange={(e) => update(index, setValue(row, field, e.target.value))}
                            aria-label={FIELD_LABELS[field] || field}
                          />
                        </td>
                      );
                    })}
                    <td className="px-1 py-1">
                      <Segmented
                        size="sm"
                        label="الفئة"
                        value={row.audienceType || batchAudience}
                        onChange={(audienceType) => update(index, { ...row, audienceType })}
                        options={[{ value: 'student', label: 'طالب' }, { value: 'adult', label: 'دارس' }]}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <Segmented
                        size="sm"
                        label="الصيغة"
                        value={row.gender || auto}
                        onChange={(gender) => update(index, { ...row, gender })}
                        options={[{ value: 'male', label: 'مذكر' }, { value: 'female', label: 'مؤنث' }]}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex flex-wrap gap-1">
                        {rowIssues.map((issue, i) => (
                          <span key={i} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-semibold', SEVERITY_CLASSES[ISSUE_SEVERITY[issue.kind]])} title={issue.field ? FIELD_LABELS[issue.field] || issue.field : undefined}>
                            {ISSUE_SEVERITY[issue.kind] === 'info' ? <Info size={11} /> : <AlertTriangle size={11} />}
                            {ISSUE_LABELS[issue.kind]}{issue.field && issue.kind === 'missing' ? `: ${FIELD_LABELS[issue.field] || issue.field}` : ''}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-1"><IconButton icon={Trash2} label="حذف من الإصدار" size="xs" variant="danger" onClick={(e) => { e.stopPropagation(); remove(index); }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 text-xs">
            <IconButton icon={ChevronRight} label="الصفحة السابقة" disabled={current === 0} onClick={() => setPage(current - 1)} />
            <span>{`صفحة ${formatNumber(current + 1)} من ${formatNumber(pages)}`}</span>
            <IconButton icon={ChevronLeft} label="الصفحة التالية" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} />
          </div>
        )}
      </div>
      <aside className="flex flex-col gap-2 xl:sticky xl:top-4 xl:self-start">
        <h3 className="text-sm font-bold">{`معاينة: ${rows[selected]?.name || ''}`}</h3>
        {rows[selected] && <Preview template={template} branding={branding} student={rows[selected]} />}
        <p className="text-2xs text-fg-subtle">انقر أي صف لمعاينة شهادته كما ستُطبع.</p>
      </aside>
    </div>
  );
}

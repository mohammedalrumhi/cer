import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { dedupeStudents, parsePastedList, rowToStudent } from '@shared/model/index.js';
import { fetchBranding, fetchStudents, fetchTemplate, fetchTemplates, saveStudents } from '../../api/client';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { PageHeader } from '../../ui/Field';
import { formatNumber } from '../../ui/format';
import { Banner, ErrorState, LoadingState } from '../../ui/States';
import { toast } from '../../ui/toast';
import { runPreflight } from '../../generate/preflight';
import { withVariant } from '../../generate/variants';
import { StepOutput } from './StepOutput';
import { StepReview } from './StepReview';
import { StepStudents } from './StepStudents';
import { StepTemplate } from './StepTemplate';

const STEPS = ['اختيار القالب', 'الطلاب', 'المراجعة', 'الإخراج'];
let keySeq = 0;

function Stepper({ step, onStep, canReach }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="خطوات الإصدار">
      {STEPS.map((label, index) => {
        const done = index < step;
        const active = index === step;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canReach(index)}
              onClick={() => onStep(index)}
              aria-current={active ? 'step' : undefined}
              data-testid={`step-${index}`}
              className={cx('flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50', active ? 'bg-primary text-primary-fg shadow-sm' : done ? 'bg-primary-50 text-primary' : 'bg-surface-2 text-fg-muted')}
            >
              <span className={cx('grid size-6 place-items-center rounded-full text-xs', active ? 'bg-white/20' : 'bg-surface')}>{done ? <Check size={14} /> : formatNumber(index + 1)}</span>
              {label}
            </button>
            {index < STEPS.length - 1 && <ChevronLeft size={16} className="text-fg-subtle" />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The one generation wizard: template → students → review → output. Replaces the separate
 * "detailed" and "quick" pages (every template works with any student list).
 */
export default function GenerateWizard() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [templates, setTemplates] = useState([]);
  const [branding, setBranding] = useState(null);
  const [saved, setSaved] = useState([]);
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState(params.get('template') || '');
  const [variantKey, setVariantKey] = useState(null);
  const [template, setTemplate] = useState(null);
  const [selectedSaved, setSelectedSaved] = useState(new Set());
  const [sheet, setSheet] = useState(null);
  const [pasted, setPasted] = useState('');
  const [saveImported, setSaveImported] = useState(false);
  const [rows, setRows] = useState([]);
  const [issues, setIssues] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [list, brand, students] = await Promise.all([fetchTemplates(), fetchBranding().catch(() => ({})), fetchStudents().catch(() => [])]);
      setTemplates(list);
      setBranding(brand);
      setSaved(students);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Full template (with elements) for the selection.
  useEffect(() => {
    if (!templateId) return undefined;
    let alive = true;
    fetchTemplate(templateId).then((full) => { if (alive) setTemplate(full); }, () => { if (alive) setTemplate(null); });
    return () => { alive = false; };
  }, [templateId]);

  const imported = useMemo(() => (sheet ? sheet.rows.map((row) => rowToStudent(row, sheet.mapping)).filter(Boolean) : []), [sheet]);
  const pastedStudents = useMemo(() => parsePastedList(pasted), [pasted]);
  const combined = useMemo(() => {
    const fromSaved = saved.filter((s) => selectedSaved.has(s.id)).map(({ id: _id, ...rest }) => rest);
    return [...fromSaved, ...imported, ...pastedStudents];
  }, [saved, selectedSaved, imported, pastedStudents]);
  const unique = useMemo(() => dedupeStudents(combined), [combined]);

  const effectiveTemplate = useMemo(() => (template ? withVariant(template, variantKey) : null), [template, variantKey]);

  const startReview = useCallback(async (nextRows) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIssues(null);
    setChecking(true);
    setCheckProgress(0);
    try {
      const result = await runPreflight(effectiveTemplate, nextRows, branding, { signal: controller.signal, onProgress: (done, total) => setCheckProgress(Math.round((done / total) * 100)) });
      if (!controller.signal.aborted) setIssues(result);
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }, [effectiveTemplate, branding]);

  // Re-check rows after edits (debounced).
  const editTimer = useRef(null);
  const handleRows = (next) => {
    setRows(next);
    clearTimeout(editTimer.current);
    editTimer.current = setTimeout(() => startReview(next), 500);
  };

  async function goTo(next) {
    if (next === 2 && step < 2) {
      if (saveImported && (imported.length || pastedStudents.length)) {
        try {
          const list = await saveStudents([...imported, ...pastedStudents]);
          setSaved(list);
          toast.success('حُفظ الطلاب الجدد في القائمة');
        } catch {
          toast.error('تعذّر حفظ الطلاب في القائمة، لكن يمكنك المتابعة.');
        }
      }
      const nextRows = unique.map((student) => ({ ...student, key: `r${keySeq += 1}` }));
      setRows(nextRows);
      startReview(nextRows);
    }
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const canReach = (index) => (index === 0) || (index >= 1 && Boolean(template)) && (index < 2 || unique.length > 0 || rows.length > 0) && (index < 3 || rows.length > 0);
  const nextDisabled = (step === 0 && !template) || (step === 1 && unique.length === 0) || (step === 2 && rows.length === 0);
  const usesVerification = Boolean(template?.verification?.enabled) || (template?.elements || []).some((el) => /serial|verifyUrl/.test(`${el.value || ''}${el.field || ''}${el.dynamicTextTemplate || ''}`));

  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState onRetry={() => { setStatus('loading'); load(); }} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="الإصدار الجماعي" title="إصدار الشهادات" subtitle="اختر القالب والطلاب، راجع الشهادات، ثم نزّلها دفعة واحدة." />
      <Stepper step={step} onStep={goTo} canReach={canReach} />
      {template && step > 0 && <Banner tone="info">{`القالب: ${template.name}${unique.length ? ` · ${formatNumber(step >= 2 ? rows.length : unique.length)} طالبًا` : ''}`}</Banner>}

      <div className="min-h-[360px]">
        {step === 0 && (
          <StepTemplate
            templates={templates}
            branding={branding}
            selectedId={templateId}
            variantKey={variantKey}
            onSelect={(id) => { setTemplateId(id); setVariantKey(null); }}
            onVariant={setVariantKey}
            onCreated={(created) => { setTemplates((prev) => [created, ...prev]); setTemplateId(created.id); }}
          />
        )}
        {step === 1 && (
          <StepStudents
            savedStudents={saved}
            selectedSaved={selectedSaved}
            onSelectedSaved={setSelectedSaved}
            sheet={sheet}
            onSheet={setSheet}
            pasted={pasted}
            onPasted={setPasted}
            pastedCount={pastedStudents.length}
            saveImported={saveImported}
            onSaveImported={setSaveImported}
            total={unique.length}
            duplicatesRemoved={combined.length - unique.length}
          />
        )}
        {step === 2 && effectiveTemplate && (
          <StepReview template={effectiveTemplate} branding={branding} rows={rows} onRows={handleRows} issues={issues} checking={checking} checkProgress={checkProgress} />
        )}
        {step === 3 && effectiveTemplate && (
          <StepOutput template={effectiveTemplate} templateId={templateId} variantKey={variantKey} branding={branding} rows={rows} verificationDefault={usesVerification} />
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-md sm:border">
        <Button icon={ChevronRight} disabled={step === 0} onClick={() => goTo(step - 1)}>السابق</Button>
        {step < 3 && <Button variant="primary" disabled={nextDisabled} onClick={() => goTo(step + 1)} data-testid="wizard-next">{`التالي: ${STEPS[step + 1]}`}<ChevronLeft size={16} /></Button>}
      </div>
    </div>
  );
}

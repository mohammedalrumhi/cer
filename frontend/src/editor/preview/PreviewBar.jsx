import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, UserRound } from 'lucide-react';
import { detectGenderFromName } from '../../utils/templateMetadata';
import { IconButton } from '../../ui/Button';
import { formatNumber } from '../../ui/format';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/Popover';
import { useEditorData } from '../EditorDataContext';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

/**
 * Preview mode: step through real students (next/previous, jump to a name) to check long names,
 * female wording and empty fields before printing.
 */
export function PreviewBar() {
  const store = useEditorStoreApi();
  const { students = [] } = useEditorData();
  const index = useEditor((state) => state.ui.previewIndex);
  const [query, setQuery] = useState('');
  const count = students.length;
  const current = students[Math.min(index, count - 1)];
  const go = (next) => store.getState().setUi({ previewIndex: (next + count) % count });
  const matches = useMemo(() => students.map((s, i) => ({ s, i })).filter(({ s }) => !query || String(s.name).includes(query)).slice(0, 40), [students, query]);

  if (!count) {
    return <div className="flex h-11 shrink-0 items-center justify-center border-b border-border bg-gold-50 text-xs font-semibold text-fg-muted">لا يوجد طلاب محفوظون للمعاينة. تُعرض بيانات تجريبية؛ أضف طلابًا من صفحة «الطلاب».</div>;
  }
  const female = (current.gender || detectGenderFromName(current.name)) === 'female';
  return (
    <div className="flex h-11 shrink-0 items-center justify-center gap-2 border-b border-border bg-gold-50 px-3 text-sm" data-testid="preview-bar">
      <IconButton icon={ChevronRight} label="الطالب السابق" onClick={() => go(index - 1)} data-testid="preview-prev" />
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="flex min-w-56 items-center justify-center gap-2 rounded-sm bg-surface px-3 py-1 font-semibold shadow-xs" data-testid="preview-student">
            <UserRound size={15} className="text-gold-600" />
            <span className="truncate">{current.name}</span>
            <span className="text-xs text-fg-muted">{`${formatNumber(index + 1)} من ${formatNumber(count)}`}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="flex w-72 flex-col gap-2 p-2">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input autoFocus className="field field-sm ps-8" placeholder="ابحث عن اسم…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          </label>
          <ul className="max-h-64 overflow-y-auto">
            {matches.map(({ s, i }) => (
              <li key={s.id || i}>
                <button type="button" onClick={() => store.getState().setUi({ previewIndex: i })} className="w-full rounded-sm px-2.5 py-1.5 text-start text-sm hover:bg-surface-2">{s.name}</button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      <IconButton icon={ChevronLeft} label="الطالب التالي" onClick={() => go(index + 1)} data-testid="preview-next" />
      <span className="ms-2 rounded-full bg-surface px-2 py-0.5 text-2xs font-semibold text-fg-muted">{female ? 'صيغة المؤنث' : 'صيغة المذكر'}</span>
    </div>
  );
}

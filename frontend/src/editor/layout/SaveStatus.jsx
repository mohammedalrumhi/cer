import { CloudAlert, CloudCheck, CloudUpload, LoaderCircle, TriangleAlert } from 'lucide-react';
import { S } from '../../strings.ar';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Dialog } from '../../ui/Dialog';
import { formatRelativeTime } from '../../ui/format';
import { Tooltip } from '../../ui/Tooltip';
import { useSaveStatus } from '../store/autosave';

const ICONS = { saved: CloudCheck, pending: CloudUpload, saving: LoaderCircle, error: CloudAlert, conflict: TriangleAlert };
const T = S.editor.save;

/** Save status pill: محفوظ / جارٍ الحفظ / خطأ / تعارض, with the conflict dialog. */
export function SaveStatus({ onRetry, onReload, onKeepMine }) {
  const status = useSaveStatus((state) => state.status);
  const lastSavedAt = useSaveStatus((state) => state.lastSavedAt);
  const Icon = ICONS[status];
  const tone = status === 'error' || status === 'conflict' ? 'bg-danger-bg text-danger' : status === 'saved' ? 'bg-success-bg text-success' : 'bg-surface-2 text-fg-muted';

  return (
    <>
      <Tooltip content={status === 'saved' && lastSavedAt ? T.savedAt(formatRelativeTime(lastSavedAt)) : T[status]}>
        <button
          type="button"
          role="status"
          aria-live="polite"
          data-testid="save-status"
          data-status={status}
          onClick={status === 'error' ? onRetry : undefined}
          className={cx('inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs max-md:px-2 font-semibold transition-colors', tone)}
        >
          <Icon size={15} className={status === 'saving' ? 'animate-spin-slow' : ''} aria-hidden />
          <span className={status === 'saved' ? 'max-md:hidden' : undefined}>{T[status]}</span>
          {status === 'error' && <span className="underline">{T.retry}</span>}
        </button>
      </Tooltip>
      <Dialog
        open={status === 'conflict'}
        onOpenChange={() => {}}
        icon={TriangleAlert}
        tone="danger"
        title={T.conflictTitle}
        description={T.conflictBody}
        footer={(
          <>
            <Button onClick={onReload} data-testid="conflict-reload">{T.reload}</Button>
            <Button variant="primary" onClick={onKeepMine} data-testid="conflict-keep">{T.keepMine}</Button>
          </>
        )}
      >
        <ul className="list-disc space-y-1 ps-5 text-sm text-fg-muted">
          <li><strong className="text-fg">{T.reload}:</strong> {T.reloadHint}</li>
          <li><strong className="text-fg">{T.keepMine}:</strong> {T.keepMineHint}</li>
        </ul>
      </Dialog>
    </>
  );
}

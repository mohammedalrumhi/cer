import { CloudOff, Inbox } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';
import { Spinner } from './Spinner';
import { S } from '../strings.ar';

/** Friendly empty state with an optional call to action. */
export function EmptyState({ icon: Icon = Inbox, title = S.states.emptyTitle, body, action, className, compact = false }) {
  return (
    <div className={cx('flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong text-center', compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14', className)}>
      <span className="relative grid size-14 place-items-center rounded-lg bg-primary-50 text-primary">
        <span className="islamic-pattern absolute inset-0 rounded-lg opacity-70" aria-hidden />
        <Icon size={26} strokeWidth={1.6} aria-hidden className="relative" />
      </span>
      <h3 className="text-md font-bold">{title}</h3>
      {body && <p className="max-w-md text-sm text-fg-muted">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = S.states.errorTitle, body = S.states.errorBody, onRetry, className }) {
  return (
    <div role="alert" className={cx('flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/25 bg-danger-bg px-6 py-12 text-center', className)}>
      <span className="grid size-12 place-items-center rounded-lg bg-surface text-danger shadow-sm">
        <CloudOff size={24} aria-hidden />
      </span>
      <h3 className="text-md font-bold">{title}</h3>
      <p className="max-w-md text-sm text-fg-muted">{body}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>{S.common.retry}</Button>}
    </div>
  );
}

export function LoadingState({ label = S.states.loadingTitle, className }) {
  return (
    <div role="status" className={cx('flex flex-col items-center justify-center gap-3 py-16 text-sm text-fg-muted', className)}>
      <Spinner size={26} className="text-primary" />
      {label}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div aria-hidden className={cx('skeleton rounded-sm', className)} />;
}

/** Inline banner for page-level messages (info, warning, error, success). */
export function Banner({ tone = 'info', icon: Icon, children, action, className }) {
  const tones = {
    info: 'border-info/25 bg-info-bg text-fg',
    warning: 'border-warning/30 bg-warning-bg text-fg',
    danger: 'border-danger/25 bg-danger-bg text-fg',
    success: 'border-success/25 bg-success-bg text-fg',
  };
  const iconTone = { info: 'text-info', warning: 'text-warning', danger: 'text-danger', success: 'text-success' };
  return (
    <div className={cx('flex items-start gap-3 rounded-md border px-4 py-3 text-sm', tones[tone], className)}>
      {Icon && <Icon size={18} aria-hidden className={cx('mt-0.5 shrink-0', iconTone[tone])} />}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

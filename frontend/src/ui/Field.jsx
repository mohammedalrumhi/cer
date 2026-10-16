import { cx } from './cx';

/** Label + control + hint, stacked. */
export function Field({ label, hint, error, children, className, htmlFor }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && <label htmlFor={htmlFor} className="text-sm font-semibold text-fg">{label}</label>}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-medium text-gold-600">{eyebrow}</p>}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

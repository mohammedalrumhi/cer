import { forwardRef } from 'react';
import { cx } from './cx';
import { Spinner } from './Spinner';
import { Tooltip } from './Tooltip';

const VARIANTS = {
  primary: 'bg-primary text-primary-fg shadow-sm hover:bg-primary-600 active:bg-primary-700',
  gold: 'bg-gold text-white shadow-sm hover:bg-gold-600',
  secondary: 'border border-border bg-surface text-fg shadow-xs hover:border-border-strong hover:bg-surface-2',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white shadow-sm hover:brightness-110',
  'danger-ghost': 'text-danger hover:bg-danger-bg',
  soft: 'bg-primary-50 text-primary hover:bg-primary-100',
};

const SIZES = {
  xs: 'h-7 gap-1 rounded-xs px-2 text-xs',
  sm: 'h-8 gap-1.5 rounded-sm px-3 text-xs',
  md: 'h-10 gap-2 rounded-sm px-4 text-sm',
  lg: 'h-12 gap-2 rounded-md px-5 text-base',
};

/** Text button. `loading` shows a spinner and disables it. */
export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading = false, icon: Icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 ease-brand active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={size === 'lg' ? 18 : 15} /> : Icon ? <Icon size={size === 'lg' ? 18 : size === 'xs' ? 13 : 15} aria-hidden /> : null}
      {children}
    </button>
  );
});

const ICON_SIZES = { xs: 'size-7', sm: 'size-8', md: 'size-9', lg: 'size-10' };

/** Square icon button with a tooltip (label + optional shortcut). */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, shortcut, size = 'sm', active = false, tooltipSide = 'bottom', className, variant = 'ghost', iconSize, ...props },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={active || undefined}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-sm transition-all duration-150 ease-brand active:scale-95 disabled:pointer-events-none disabled:opacity-35',
        variant === 'ghost' && (active ? 'bg-primary-50 text-primary' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'),
        variant === 'secondary' && 'border border-border bg-surface text-fg hover:bg-surface-2',
        variant === 'danger' && 'text-danger hover:bg-danger-bg',
        ICON_SIZES[size],
        className,
      )}
      {...props}
    >
      <Icon size={iconSize || (size === 'xs' ? 14 : size === 'lg' ? 20 : 17)} strokeWidth={1.9} aria-hidden />
    </button>
  );
  return label ? <Tooltip content={label} shortcut={shortcut} side={tooltipSide}>{button}</Tooltip> : button;
});

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { cx } from './cx';
import { Tooltip } from './Tooltip';

/**
 * Segmented control (one choice). Options: { value, label?, icon?, tooltip? }.
 * Icon-only options get their tooltip as the accessible name.
 */
export function Segmented({ value, onChange, options, size = 'md', className, label, fullWidth = false }) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => { if (next) onChange(next); }}
      aria-label={label}
      className={cx('inline-flex items-center gap-0.5 rounded-sm bg-surface-2 p-0.5', fullWidth && 'flex w-full', className)}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const item = (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            aria-label={option.tooltip || option.label}
            className={cx(
              'inline-flex items-center justify-center gap-1.5 rounded-[6px] font-semibold text-fg-muted transition-all duration-150 hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-primary data-[state=on]:shadow-sm',
              size === 'sm' ? 'h-7 min-w-7 px-2 text-xs' : 'h-8 min-w-8 px-3 text-xs',
              fullWidth && 'flex-1',
            )}
          >
            {Icon && <Icon size={size === 'sm' ? 14 : 15} aria-hidden />}
            {option.label}
          </ToggleGroup.Item>
        );
        return option.tooltip ? <Tooltip key={option.value} content={option.tooltip}>{item}</Tooltip> : item;
      })}
    </ToggleGroup.Root>
  );
}

import * as RadixSlider from '@radix-ui/react-slider';
import { cx } from './cx';
import { formatNumber } from './format';

/**
 * Single-value slider. Radix handles RTL (min on the right) through the DirectionProvider.
 * `onCommit` fires once when the drag ends (use it to seal an undo step).
 */
export function Slider({ value, onChange, onCommit, min = 0, max = 100, step = 1, label, showValue = false, suffix = '', className, format = formatNumber }) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <RadixSlider.Root
        className="relative flex h-5 flex-1 touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={[Number(value) || 0]}
        onValueChange={([next]) => onChange?.(next)}
        onValueCommit={([next]) => onCommit?.(next)}
        aria-label={label}
      >
        <RadixSlider.Track className="relative h-1.5 grow rounded-full bg-surface-3">
          <RadixSlider.Range className="absolute h-full rounded-full bg-primary" />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="block size-4 rounded-full border-2 border-primary bg-surface shadow-md transition-transform hover:scale-110 focus-visible:scale-110" aria-label={label} />
      </RadixSlider.Root>
      {showValue && <span className="w-12 text-end text-xs font-semibold tabular-nums text-fg-muted">{format(value)}{suffix}</span>}
    </div>
  );
}

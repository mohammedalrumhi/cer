import * as RadixPopover from '@radix-ui/react-popover';
import { cx } from './cx';

export function Popover(props) {
  return <RadixPopover.Root {...props} />;
}

export function PopoverTrigger(props) {
  return <RadixPopover.Trigger {...props} />;
}

export function PopoverClose(props) {
  return <RadixPopover.Close {...props} />;
}

export function PopoverContent({ children, className, side = 'bottom', align = 'start', sideOffset = 8, ...props }) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cx('z-[75] animate-pop rounded-md border border-border bg-surface p-3 shadow-lg outline-none', className)}
        {...props}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}

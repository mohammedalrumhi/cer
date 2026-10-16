import * as RadixTooltip from '@radix-ui/react-tooltip';
import { shortcutLabel } from './format';

export const TooltipProvider = ({ children }) => (
  <RadixTooltip.Provider delayDuration={350} skipDelayDuration={150}>{children}</RadixTooltip.Provider>
);

/** Tooltip that can show the keyboard shortcut next to the label. */
export function Tooltip({ content, shortcut, side = 'bottom', children }) {
  if (!content) return children;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-[80] flex animate-fade-in items-center gap-2 rounded-sm bg-[#16241e] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-[#eef3ef] dark:text-[#16241e]"
        >
          {content}
          {shortcut && <kbd dir="ltr" className="rounded bg-white/15 px-1.5 font-sans text-[11px] opacity-85 dark:bg-black/10">{shortcutLabel(shortcut)}</kbd>}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

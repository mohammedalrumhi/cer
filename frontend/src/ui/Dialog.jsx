import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cx } from './cx';
import { S } from '../strings.ar';

const WIDTHS = { sm: 'w-[min(420px,94vw)]', md: 'w-[min(560px,94vw)]', lg: 'w-[min(780px,94vw)]', xl: 'w-[min(1080px,96vw)]' };

/**
 * Modal dialog. Centred with inset + margin (not transforms) so the entrance animation can't shift it.
 * `icon` shows a tinted badge next to the title; `tone="danger"` tints it red.
 */
export function Dialog({ open, onOpenChange, title, description, icon: Icon, tone = 'brand', size = 'md', children, footer, className }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[70] animate-fade-in bg-[var(--overlay)] backdrop-blur-[2px]" />
        <RadixDialog.Content
          className={cx('fixed inset-0 z-[70] m-auto flex h-fit max-h-[92vh] animate-pop flex-col rounded-lg border border-border bg-surface shadow-lg outline-none', WIDTHS[size], className)}
        >
          <div className="flex items-start gap-3 px-5 pb-2 pt-5">
            {Icon && (
              <span className={cx('grid size-10 shrink-0 place-items-center rounded-md', tone === 'danger' ? 'bg-danger-bg text-danger' : 'bg-brand text-white')}>
                <Icon size={20} aria-hidden />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="text-lg font-bold">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-0.5 text-sm text-fg-muted">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close className="grid size-8 place-items-center rounded-sm text-fg-muted hover:bg-surface-2" aria-label={S.common.close}>
              <X size={16} />
            </RadixDialog.Close>
          </div>
          {children && <div className="min-h-0 overflow-y-auto px-5 py-3">{children}</div>}
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

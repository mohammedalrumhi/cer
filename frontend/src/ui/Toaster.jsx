import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cx } from './cx';
import { useToasts } from './toast';
import { S } from '../strings.ar';

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const COLORS = { success: 'text-success', error: 'text-danger', info: 'text-info' };

export function Toaster() {
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex flex-col items-center gap-2 px-4">
      {toasts.map((item) => {
        const Icon = ICONS[item.kind];
        return (
          <div
            key={item.id}
            role={item.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-[min(480px,92vw)] animate-fade-up items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium shadow-lg"
          >
            <Icon size={18} className={cx('shrink-0', COLORS[item.kind])} aria-hidden />
            <span className="flex-1">{item.message}</span>
            {item.action && (
              <button type="button" onClick={() => { item.action.onClick(); dismiss(item.id); }} className="rounded-xs px-2 py-1 text-xs font-bold text-primary hover:bg-primary-50">
                {item.action.label}
              </button>
            )}
            <button type="button" onClick={() => dismiss(item.id)} aria-label={S.common.close} className="text-fg-subtle hover:text-fg">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

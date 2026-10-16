import { create } from 'zustand';

let nextId = 1;

/** Toast queue. Use `toast.success(message)`, `toast.error(message)` or `toast.info(message)`. */
export const useToasts = create((set, get) => ({
  toasts: [],
  push(kind, message, { duration, action } = {}) {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-3), { id, kind, message, action }] });
    const ms = duration ?? (kind === 'error' ? 6000 : 3500);
    if (ms > 0) setTimeout(() => get().dismiss(id), ms);
    return id;
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((item) => item.id !== id) });
  },
}));

export const toast = {
  success: (message, options) => useToasts.getState().push('success', message, options),
  error: (message, options) => useToasts.getState().push('error', message, options),
  info: (message, options) => useToasts.getState().push('info', message, options),
  dismiss: (id) => useToasts.getState().dismiss(id),
};

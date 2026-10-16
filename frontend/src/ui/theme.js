import { create } from 'zustand';

/**
 * Light / dark / system theme. The choice is remembered per browser; "system" follows
 * prefers-color-scheme live. index.html applies the stored theme before first paint.
 */
const KEY = 'cer:theme';
const MODES = ['light', 'dark', 'system'];

function readMode() {
  try {
    const value = window.localStorage.getItem(KEY);
    return MODES.includes(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function resolveTheme(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return media?.matches ? 'dark' : 'light';
}

function apply(mode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = resolveTheme(mode);
}

export const useTheme = create((set) => ({
  mode: typeof window === 'undefined' ? 'system' : readMode(),
  setMode(mode) {
    try { window.localStorage.setItem(KEY, mode); } catch { /* storage unavailable */ }
    apply(mode);
    set({ mode });
  },
}));

media?.addEventListener?.('change', () => apply(useTheme.getState().mode));
if (typeof window !== 'undefined') apply(useTheme.getState().mode);

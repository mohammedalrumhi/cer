import { create } from 'zustand';

/** Canvas view options (View menu), remembered per browser. */
const KEY = 'cer:view';
const DEFAULTS = { rulers: true, grid: false, guides: true, snapping: true, gridSize: 20 };

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(window.localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const useViewPrefs = create((set, get) => ({
  ...read(),
  toggle(key) {
    set({ [key]: !get()[key] });
    try {
      const { rulers, grid, guides, snapping, gridSize } = get();
      window.localStorage.setItem(KEY, JSON.stringify({ rulers, grid, guides, snapping, gridSize }));
    } catch {
      // Storage unavailable: the choice lasts for this session.
    }
  },
}));

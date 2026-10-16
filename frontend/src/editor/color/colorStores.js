import { create } from 'zustand';
import { paintColors } from '@shared/render/index.js';
import { normalizeHex } from './colorMath';

const KEY = 'cer:recent-colors';
const LIMIT = 12;

function read() {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value.slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

/** The 12 most recently picked colours, remembered per browser. */
export const useRecentColors = create((set, get) => ({
  colors: typeof window === 'undefined' ? [] : read(),
  push(color) {
    const hex = normalizeHex(color);
    if (!hex) return;
    const colors = [hex, ...get().colors.filter((item) => item !== hex)].slice(0, LIMIT);
    set({ colors });
    try { window.localStorage.setItem(KEY, JSON.stringify(colors)); } catch { /* ignore */ }
  },
}));

/** Curated certificate palette: golds, emeralds, navies, burgundies and neutrals. */
export const CERTIFICATE_PALETTE = [
  { label: 'ذهبي', colors: ['#7A5A1E', '#9A7130', '#B8893C', '#D6B066', '#EBD7A4', '#F7EED7'] },
  { label: 'زمردي', colors: ['#06352A', '#094837', '#0F6B52', '#2FA37F', '#8FD1B8', '#E1F2EA'] },
  { label: 'كحلي', colors: ['#0D1B33', '#1C3156', '#2D4F7C', '#4F78A8', '#9BB6D6', '#E5EDF6'] },
  { label: 'عنابي', colors: ['#3D0F17', '#6B1E2C', '#8A2E3F', '#B64A5D', '#DE9AA6', '#F7E4E8'] },
  { label: 'محايد', colors: ['#000000', '#1B2A23', '#5F6D65', '#A8B0AA', '#E9E2D3', '#FFFFFF'] },
];

/** Every colour already used in the document (the "document colours" row). */
export function documentColors(document) {
  if (!document) return [];
  const out = new Set();
  const add = (paint) => paintColors(paint).forEach((color) => { const hex = normalizeHex(color); if (hex) out.add(hex); });
  add(document.background?.fill || document.background?.color);
  for (const el of document.elements || []) {
    for (const key of ['fill', 'stroke', 'color', 'accentColor', 'background']) add(el[key]);
    if (el.effects?.outline) add(el.effects.outline.color);
  }
  return [...out].slice(0, 24);
}

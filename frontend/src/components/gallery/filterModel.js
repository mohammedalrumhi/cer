import { CATEGORIES } from '@shared/templates/index.js';

export const EMPTY_FILTERS = { query: '', category: 'all', orientation: 'all', audience: 'all', detail: 'all', favorites: false };

export function normalizeSearch(value) {
  return String(value || '').trim().normalize('NFKC').replace(/[ً-ٰٟ]/g, '').toLowerCase();
}

export function categoryLabel(id) {
  return CATEGORIES.find((category) => category.id === id)?.label || '';
}

function orientationOf(template) {
  const w = Number(template.width) || 1123;
  const h = Number(template.height) || 794;
  return w === h ? 'square' : w > h ? 'landscape' : 'portrait';
}

/** Does a template (stored or starter) pass the gallery filters? */
export function matchesFilters(template, filters) {
  if (filters.category !== 'all' && template.category !== filters.category) return false;
  if (filters.orientation !== 'all' && orientationOf(template) !== filters.orientation) return false;
  if (filters.audience !== 'all' && (template.audienceType || 'student') !== filters.audience) return false;
  if (filters.detail !== 'all' && (template.detailLevel || 'simple') !== filters.detail) return false;
  if (filters.favorites && !template.favorite) return false;
  const q = normalizeSearch(filters.query);
  if (!q) return true;
  const haystack = normalizeSearch([template.name, categoryLabel(template.category), ...(template.availableBackgroundVariants || []).map((v) => v.label)].join(' '));
  return haystack.includes(q);
}

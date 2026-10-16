/** Numbers in the UI use Arabic-Indic digits. */
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toArabicDigits(value) {
  return String(value ?? '').replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]);
}

export function toLatinDigits(value) {
  return String(value ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

const numberFormat = new Intl.NumberFormat('ar-EG-u-nu-arab', { maximumFractionDigits: 2 });

export function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? numberFormat.format(number) : toArabicDigits(value);
}

export function formatPercent(fraction) {
  return `${formatNumber(Math.round(Number(fraction) * 100))}٪`;
}

const relative = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });

/** "قبل ٥ دقائق", "أمس"… */
export function formatRelativeTime(value, now = Date.now()) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'الآن';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), 'day');
  return new Intl.DateTimeFormat('ar-EG-u-nu-arab', { dateStyle: 'medium' }).format(time);
}

export function formatDateTime(value) {
  const time = new Date(value);
  if (!Number.isFinite(time.getTime())) return '';
  return new Intl.DateTimeFormat('ar-EG-u-nu-arab', { dateStyle: 'medium', timeStyle: 'short' }).format(time);
}

/** Keyboard shortcut label: Ctrl on Windows/Linux, ⌘ on Mac. */
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export const MOD = isMac ? '⌘' : 'Ctrl';
export function shortcutLabel(keys) {
  return String(keys).replace(/MOD/g, MOD).replace(/Shift/g, '⇧').replace(/Alt/g, isMac ? '⌥' : 'Alt');
}

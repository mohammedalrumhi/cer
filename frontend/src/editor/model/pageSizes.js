import { formatNumber } from '../../ui/format';

/** Page presets in template px (96 dpi): A4 = 1123 × 794 landscape. */
export const PAGE_SIZES = [
  { id: 'a4-landscape', label: 'A4 عرضي', width: 1123, height: 794 },
  { id: 'a4-portrait', label: 'A4 طولي', width: 794, height: 1123 },
  { id: 'a4hd-portrait', label: 'A4 طولي عالي الدقة', width: 1414, height: 2000 },
  { id: 'a4hd-landscape', label: 'A4 عرضي عالي الدقة', width: 2000, height: 1414 },
  { id: 'a5-landscape', label: 'A5 عرضي', width: 794, height: 559 },
  { id: 'a5-portrait', label: 'A5 طولي', width: 559, height: 794 },
  { id: 'letter-landscape', label: 'ليتر عرضي', width: 1056, height: 816 },
  { id: 'letter-portrait', label: 'ليتر طولي', width: 816, height: 1056 },
  { id: 'square', label: 'مربّع', width: 1080, height: 1080 },
];

export function matchPageSize(width, height) {
  return PAGE_SIZES.find((size) => Math.abs(size.width - width) < 2 && Math.abs(size.height - height) < 2) || null;
}

export function pageSizeLabel(document) {
  const match = matchPageSize(Number(document.width), Number(document.height));
  return match ? match.label : `مقاس مخصص (${formatNumber(Math.round(document.width))} × ${formatNumber(Math.round(document.height))})`;
}

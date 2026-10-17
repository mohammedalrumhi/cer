/**
 * Colourways for starter templates. `primary` is the deep brand colour (banners, titles, boxes),
 * `secondary` the warm accent (names, ornaments), `paper` the page tint.
 */
export const PALETTES = [
  { key: 'emerald', label: 'زمردي وذهبي', primary: '#1F5D4F', secondary: '#9A6A2F', paper: '#FBF8F1' },
  { key: 'navy', label: 'كحلي وذهبي', primary: '#1C3156', secondary: '#B08A3E', paper: '#F7F6F2' },
  { key: 'burgundy', label: 'عنابي وذهبي', primary: '#6E2233', secondary: '#B8893C', paper: '#FBF6F2' },
  { key: 'teal', label: 'فيروزي', primary: '#16707A', secondary: '#C08A2E', paper: '#F5FAF9' },
  { key: 'plum', label: 'بنفسجي ملكي', primary: '#4F2F63', secondary: '#B8893C', paper: '#F9F6FB' },
  { key: 'olive', label: 'زيتوني', primary: '#4E5A26', secondary: '#A9782E', paper: '#F8F7EF' },
  { key: 'charcoal', label: 'فحمي أنيق', primary: '#2E3438', secondary: '#B8893C', paper: '#F7F7F5' },
  { key: 'royal', label: 'أزرق ملكي', primary: '#24438A', secondary: '#D2A54C', paper: '#F5F7FC' },
  { key: 'terracotta', label: 'طيني دافئ', primary: '#8C3F28', secondary: '#2F5D50', paper: '#FBF5F0' },
  { key: 'rose', label: 'وردي هادئ', primary: '#9B4B5E', secondary: '#B88A54', paper: '#FCF5F6' },
  { key: 'forest', label: 'أخضر غابي', primary: '#174734', secondary: '#B8893C', paper: '#F4F8F4' },
  { key: 'sapphire', label: 'ياقوتي أزرق', primary: '#14506E', secondary: '#C59B45', paper: '#F3F8FA' },
];

export const DEFAULT_PALETTE = PALETTES[0];

export function paletteByKey(key) {
  return PALETTES.find((palette) => palette.key === key) || DEFAULT_PALETTE;
}

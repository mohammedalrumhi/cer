// Islamic and Quran icons drawn for the studio in lucide's format (24×24, 2px round strokes), so
// they sit beside the lucide set and are stored on the element as plain paths like any icon.
const c = (cx, cy, r) => ['circle', { cx, cy, r }];
const p = (d) => ['path', { d }];

// Prayer beads: seven beads on a ring, a larger head bead and a tassel.
const BEAD_ANGLES = [-90, -45, 0, 45, 135, 180, 225];
const beads = BEAD_ANGLES.map((deg) => {
  const a = (deg * Math.PI) / 180;
  return c(Math.round((12 + 6 * Math.cos(a)) * 100) / 100, Math.round((9.5 + 6 * Math.sin(a)) * 100) / 100, 1.1);
});

export const ISLAMIC_ICON_NODES = {
  'islamic-mosque': [
    p('M2 21h20'),
    p('M2.5 21V11l1.5-3 1.5 3v10'),
    p('M18.5 21V11l1.5-3 1.5 3v10'),
    p('M6.5 21v-6h11v6'),
    p('M7 15c0-3.2 2-5.2 5-6.7 3 1.5 5 3.5 5 6.7'),
    p('M12 8.3V5.5'),
    p('M12 5.5a1.2 1.2 0 1 1 1.2-1.6'),
    p('M10.5 21v-2.5a1.5 1.5 0 0 1 3 0V21'),
  ],
  'islamic-dome': [
    p('M3 21h18'),
    p('M5 21v-6h14v6'),
    p('M5.5 15a6.5 6.5 0 0 1 13 0'),
    p('M12 8.5V6'),
    p('M12 6a1.3 1.3 0 1 1 1.3-1.8'),
    p('M8 21v-3M12 21v-3M16 21v-3'),
  ],
  'islamic-minaret': [
    p('M7 22h10'),
    p('M9.5 22V12h5v10'),
    p('M8 12h8'),
    p('M8.5 12l1-2.5h5l1 2.5'),
    p('M10.5 9.5V6.5a1.5 1.5 0 0 1 3 0v3'),
    p('M12 5V2'),
    p('M11 16h2'),
  ],
  'islamic-lantern': [
    p('M12 2v2'),
    p('M10 4h4'),
    p('M8 7l1-3h6l1 3z'),
    p('M8 7h8l1.5 5-1.5 5H8l-1.5-5z'),
    p('M9 17l1 3h4l1-3'),
    p('M12 9.5c1.2 1.1 1.2 2.9 0 4-1.2-1.1-1.2-2.9 0-4z'),
  ],
  'islamic-quran-stand': [
    p('M12 6.5C10 5 7 4.5 4 5v8.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z'),
    p('M12 6.5V15'),
    p('M6 16l12 5'),
    p('M18 16L6 21'),
  ],
  'islamic-prayer-beads': [
    ...beads,
    c(12, 16.6, 1.4),
    p('M12 18v1.5'),
    p('M10.5 22.5l1.5-3 1.5 3'),
  ],
  'islamic-kaaba': [
    p('M3 8l9-4 9 4v10l-9 4-9-4z'),
    p('M3 8l9 4 9-4'),
    p('M12 12v10'),
    p('M3 11l9 4 9-4'),
    p('M15 18.7v-3l2-.9v3'),
  ],
  'islamic-prayer-rug': [
    p('M5 3h14v18H5z'),
    p('M8.5 17.5V11a3.5 3.5 0 0 1 7 0v6.5z'),
    p('M7 21v1.5M10 21v1.5M14 21v1.5M17 21v1.5'),
    p('M7 3V1.5M10 3V1.5M14 3V1.5M17 3V1.5'),
  ],
  'islamic-star': [
    ['rect', { x: 5, y: 5, width: 14, height: 14 }],
    ['polygon', { points: '12,2 22,12 12,22 2,12' }],
    c(12, 12, 2.5),
  ],
  'islamic-crescent': [
    p('M15.5 3.2A9 9 0 1 0 20.8 17 7 7 0 0 1 15.5 3.2z'),
    ['polygon', { points: '17,7.5 17.7,9.3 19.6,9.4 18.1,10.6 18.6,12.5 17,11.4 15.4,12.5 15.9,10.6 14.4,9.4 16.3,9.3' }],
  ],
  'islamic-inkwell': [
    p('M6 21h8a1 1 0 0 0 1-1v-4a4 4 0 0 0-3-3.9V11H8v1.1A4 4 0 0 0 5 16v4a1 1 0 0 0 1 1z'),
    p('M7.5 11h5'),
    p('M11 13L19.3 3.2a1.4 1.4 0 0 1 2 2L12.8 14'),
  ],
  'islamic-laurel': [
    p('M9 21C5 18.5 3 13.5 4.5 7'),
    p('M15 21c4-2.5 6-7.5 4.5-14'),
    p('M4.5 7c1.6.4 2.3 1.6 2 3.1-1.6-.4-2.3-1.6-2-3.1z'),
    p('M4.2 12.2c1.6-.1 2.6.9 2.7 2.4-1.6.1-2.6-.9-2.7-2.4z'),
    p('M6.3 16.9c1.5-.5 2.7.1 3.2 1.5-1.5.5-2.7-.1-3.2-1.5z'),
    p('M19.5 7c-1.6.4-2.3 1.6-2 3.1 1.6-.4 2.3-1.6 2-3.1z'),
    p('M19.8 12.2c-1.6-.1-2.6.9-2.7 2.4 1.6.1 2.6-.9 2.7-2.4z'),
    p('M17.7 16.9c-1.5-.5-2.7.1-3.2 1.5 1.5.5 2.7-.1 3.2-1.5z'),
    p('M12 4l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5L11 6z'),
  ],
};

/** [name, Arabic keywords] for the featured list (the first keyword is the tile label). */
export const ISLAMIC_ICONS = [
  ['islamic-mosque', 'مسجد جامع'],
  ['islamic-quran-stand', 'مصحف على حامل رحل قرآن'],
  ['islamic-lantern', 'فانوس رمضان'],
  ['islamic-crescent', 'هلال ونجمة رمضان عيد'],
  ['islamic-star', 'نجمة ثمانية ربع الحزب'],
  ['islamic-prayer-beads', 'سبحة مسبحة ذكر'],
  ['islamic-kaaba', 'الكعبة حج عمرة'],
  ['islamic-dome', 'قبة'],
  ['islamic-minaret', 'مئذنة منارة أذان'],
  ['islamic-prayer-rug', 'سجادة صلاة'],
  ['islamic-inkwell', 'دواة وقلم خط كتابة'],
  ['islamic-laurel', 'إكليل غار تكريم فوز'],
];

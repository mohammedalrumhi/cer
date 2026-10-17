import { gradient, page, shade, tint } from './kit.js';
import { DEFAULT_PALETTE, PALETTES, paletteByKey } from './palettes.js';

/**
 * Starter templates: high-quality Arabic certificates built only from editor elements. Each is a
 * function of a palette (one design, many colourways), carries a category, a style and an audience,
 * and stays fully editable once a teacher uses it.
 */

export const CATEGORIES = [
  { id: 'memorization', label: 'حفظ وتسميع' },
  { id: 'khatm', label: 'ختم القرآن' },
  { id: 'excellence', label: 'تفوق دراسي' },
  { id: 'attendance', label: 'حضور ومواظبة' },
  { id: 'thanks', label: 'شكر وتقدير' },
  { id: 'participation', label: 'مشاركة' },
  { id: 'competitions', label: 'مسابقات' },
  { id: 'staff', label: 'معلمين ومشرفين' },
];

export const STYLES = {
  islamic: 'إسلامي هندسي',
  minimal: 'عصري بسيط',
  ornate: 'ذهبي مزخرف',
  floral: 'ناعم مزهر',
  kids: 'مرح للأطفال',
  formal: 'رسمي للكبار',
};

const INK = '#1B2A23';
const MUTED = '#6B756F';
const WHITE = '#FFFFFF';
const BLESSING_M = 'بارك الله {{فيه|فيها}}، ونفع {{به|بها}} الإسلام والمسلمين';
const ACHIEVEMENT = 'recipientAchievementSentence';

/* ── 1–2. The Itqan Quran-achievement structure (from Certificate_09) ─────────── */

function quranAchievement(p0, audienceType) {
  const { primary, secondary } = p0;
  const p = page(1414, 2000);
  p.brand('logo', 'logo', { y: 140, w: 260, h: 250 });
  p.rect('title-band', { x: 118, y: 418, w: 1178, h: 210, fill: gradient(90, shade(primary, 0.18), primary, tint(primary, 0.14)) });
  p.ornament('title-pattern-r', 'rosette12', { x: 1130, y: 438, w: 170, color: tint(primary, 0.22), accent: tint(primary, 0.3), opacity: 0.45 });
  p.ornament('title-pattern-l', 'rosette12', { x: 114, y: 438, w: 170, color: tint(primary, 0.22), accent: tint(primary, 0.3), opacity: 0.45 });
  p.text('title', 'شهادة إنجاز قرآنية', { y: 440, w: 1178, size: 112, font: 'Cairo-Black', color: WHITE, kashida: 1, effects: { shadow: { color: '#000000', opacity: 0.22, blur: 8, offsetX: 0, offsetY: 5 }, outline: null, highlight: null } });
  p.field('issue-date', 'dateLabel', { y: 680, w: 900, size: 34, font: 'Cairo-Regular', color: '#9AA39E' });
  p.field('achievement', ACHIEVEMENT, { y: 760, w: 1120, size: 58, font: 'Cairo-SemiBold', color: primary, lineHeight: 1.45 });
  p.field('student-name', 'studentName', { y: 960, w: 1180, size: 76, font: 'Cairo-Black', color: secondary });
  p.ornament('divider', 'divider-flourish', { y: 1078, w: 1180, h: 74, color: primary, accent: primary });
  p.field('recital-type', 'recitalType', { y: 1175, w: 1180, size: 48, font: 'Cairo-SemiBold', color: primary });
  p.field('surah-range', 'surahRange', { y: 1262, w: 1180, size: 54, font: 'Cairo-Bold', color: primary });
  const boxes = [
    { id: 'program', label: 'اسم المسار', field: 'programName', x: 707, w: 589 },
    { id: 'calendar', label: 'التقويم', field: 'calendar', x: 411, w: 263 },
    { id: 'mistakes', label: 'عدد الأخطاء', field: 'mistakesCount', x: 118, w: 260 },
  ];
  for (const box of boxes) {
    p.rect(`${box.id}-label-box`, { x: box.x, y: 1368, w: box.w, h: 74, fill: WHITE, stroke: tint(primary, 0.78), strokeWidth: 1.5 });
    p.text(`${box.id}-label`, box.label, { x: box.x, y: 1380, w: box.w, size: 36, font: 'Cairo-Regular', color: '#7C8984', kashida: 1 });
    p.rect(`${box.id}-value-box`, { x: box.x, y: 1442, w: box.w, h: 88, fill: primary });
    p.field(`${box.id}-value`, box.field, { x: box.x + 10, y: 1456, w: box.w - 20, size: 44, font: 'Cairo-Bold', color: WHITE });
  }
  p.rect('teacher-bar', { x: 118, y: 1556, w: 1178, h: 88, fill: primary });
  p.field('teacher', 'teacherName', { y: 1568, w: 1100, size: 46, font: 'Cairo-Bold', color: WHITE, template: 'المعلّم: {{teacherName}}' });
  p.rect('approvals-box', { x: 118, y: 1672, w: 1178, h: 210, fill: WHITE, stroke: tint(primary, 0.85), strokeWidth: 1.5, radius: 4 });
  [['اعتماد المعلّم/ة:', 900], ['اعتماد المشرف/ة:', 520], ['اعتماد الإدارة:', 140]].forEach(([label, x], index) => {
    p.text(`approval-${index + 1}`, label, { x, y: 1690, w: 370, size: 34, font: 'Cairo-Regular', color: shade(secondary, 0.35) });
  });
  p.brand('signature', 'signature', { x: 220, y: 1748, w: 210, h: 118 });
  p.brand('stamp', 'stamp', { x: 610, y: 1736, w: 136, h: 136 });
  return p.done({
    audienceType,
    detailLevel: 'detailed',
    background: { type: 'image', color: '#FBF7EE', accentColor: primary, imagePath: 'uploads/itqan-bg-gold-arabesque.png', customLayout: true },
  });
}

/* ── 3. Khatm, gold ornate (landscape) ────────────────────────────────────────── */

function khatmOrnate({ primary, secondary, paper }) {
  const p = page(1123, 794);
  p.ornament('frame', 'frame-ornate', { x: 18, y: 18, w: 1087, h: 758, color: secondary, accent: primary });
  p.text('basmala', 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', { y: 74, w: 520, size: 26, font: 'Amiri-Regular', color: primary });
  p.brand('logo', 'logo', { x: 92, y: 80, w: 96 });
  p.text('title', 'شهادة ختم القرآن الكريم', { y: 120, w: 760, size: 64, font: 'alfont_com_ArefRuqaaswashesfixed-Bold', color: gradient(90, shade(secondary, 0.2), tint(secondary, 0.35), shade(secondary, 0.2)) });
  p.ornament('divider', 'divider-star', { y: 222, w: 380, h: 30, color: secondary, accent: primary });
  p.field('lead', 'recipientTitle', { y: 268, w: 700, size: 30, font: 'Amiri-Regular', color: INK, template: 'تتشرّف إدارة {{schoolName}} بمنح {{recipientTitle}}', fit: true });
  p.field('student-name', 'studentName', { y: 322, w: 820, size: 54, font: 'Cairo-Bold', color: primary });
  p.text('body', 'هذه الشهادة بمناسبة {{إتمامه|إتمامها}} ختم القرآن الكريم حفظًا وتلاوة، سائلين الله أن {{يجعله|يجعلها}} من أهل القرآن الذين هم أهل الله وخاصّته.', { y: 410, w: 820, size: 25, font: 'Amiri-Regular', color: INK, lineHeight: 1.75 });
  p.text('verse', '﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾', { y: 520, w: 520, size: 28, font: 'Amiri-Regular', color: secondary });
  p.date('date', { y: 600, x: 760, w: 260, color: MUTED });
  p.signatures('sign', { y: 640, labels: ['المعلّم/ة', 'مدير/ة الدار'], color: MUTED, lineColor: tint(secondary, 0.4) });
  p.brand('stamp', 'stamp', { x: 480, y: 610, w: 120 });
  return p.done({ background: { type: 'solid', color: paper, fill: gradient(180, '#FFFDF8', paper), accentColor: primary, customLayout: true } });
}

/* ── 4. Khatm, mihrab (portrait) ──────────────────────────────────────────────── */

function khatmMihrab({ primary, secondary, paper }) {
  const p = page(794, 1123);
  p.rect('band', { x: 0, y: 0, w: 794, h: 1123, fill: null, stroke: primary, strokeWidth: 14 });
  p.ornament('arch', 'frame-arch', { x: 60, y: 60, w: 674, h: 1003, color: secondary, accent: primary });
  p.ornament('lantern-r', 'lantern', { x: 600, y: 70, w: 70, h: 116, color: secondary, accent: primary });
  p.ornament('lantern-l', 'lantern', { x: 124, y: 70, w: 70, h: 116, color: secondary, accent: primary });
  p.brand('logo', 'logo', { y: 210, w: 110 });
  p.text('title', 'شهادة ختم القرآن', { y: 330, w: 560, size: 58, font: 'Rakkas-Regular', color: primary });
  p.ornament('star', 'star8', { y: 426, w: 50, color: secondary, accent: primary });
  p.field('lead', 'recipientTitle', { y: 492, w: 560, size: 28, font: 'Amiri-Regular', color: INK, template: 'يسرّنا أن نهنّئ {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 545, w: 600, size: 46, font: 'Cairo-Bold', color: secondary });
  p.text('body', 'على إتمام حفظ كتاب الله تعالى كاملًا،\n{{جعله|جعلها}} الله حجّة {{له|لها}}، ورفع به {{درجته|درجتها}} في الدنيا والآخرة.', { y: 635, w: 560, size: 24, font: 'Amiri-Regular', color: INK, lineHeight: 1.8 });
  p.text('verse', '﴿ إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ ﴾', { y: 760, w: 560, size: 24, font: 'Amiri-Regular', color: primary });
  p.date('date', { y: 840, w: 360, color: MUTED });
  p.brand('signature', 'signature', { x: 470, y: 900, w: 130, h: 70 });
  p.brand('stamp', 'stamp', { x: 200, y: 890, w: 100 });
  p.text('sign-label', 'مدير/ة الدار', { x: 450, y: 975, w: 170, size: 18, font: 'Cairo-Regular', color: MUTED });
  return p.done({ background: { type: 'solid', color: paper, accentColor: primary, customLayout: true } });
}

/* ── 5. Hifz of a juz', geometric (landscape) ─────────────────────────────────── */

function hifzJuz({ primary, secondary, paper }) {
  const p = page(1123, 794);
  p.rect('outer', { x: 24, y: 24, w: 1075, h: 746, fill: null, stroke: primary, strokeWidth: 3 });
  p.rect('inner', { x: 36, y: 36, w: 1051, h: 722, fill: null, stroke: tint(primary, 0.55), strokeWidth: 1 });
  p.corners('corner', 'corner-geometric', { inset: 44, size: 120, color: primary, accent: secondary });
  p.ornament('top-band', 'border-diamonds', { y: 44, w: 520, h: 26, color: secondary, accent: primary });
  p.brand('logo', 'logo', { y: 86, w: 92 });
  p.text('title', 'شهادة إتمام حفظ', { y: 182, w: 700, size: 58, font: 'Cairo-Black', color: primary });
  p.field('surah', 'surahRange', { y: 268, w: 760, size: 30, font: 'Cairo-SemiBold', color: secondary, template: '{{surahRange}}' });
  p.field('lead', 'recipientTitle', { y: 330, w: 700, size: 26, font: 'Cairo-Regular', color: MUTED, template: 'تُمنح هذه الشهادة إلى {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 375, w: 760, size: 52, font: 'Cairo-Bold', color: INK });
  p.line('name-line', { y: 455, w: 420, color: secondary, width: 2, start: 'diamond', end: 'diamond' });
  p.text('body', BLESSING_M, { y: 480, w: 700, size: 24, font: 'Amiri-Regular', color: INK });
  p.field('program', 'programName', { y: 530, w: 600, size: 22, font: 'Cairo-Regular', color: MUTED, template: 'ضمن {{programName}}' });
  p.date('date', { y: 575, w: 320, color: MUTED, calendar: 'hijri' });
  p.signatures('sign', { y: 615, labels: ['المعلّم/ة', 'المشرف/ة'], color: MUTED, lineColor: tint(primary, 0.6), w: 200 });
  return p.done({ detailLevel: 'detailed', background: { type: 'solid', color: paper, accentColor: primary, customLayout: true } });
}

/* ── 6. Tasmee' results, modern minimal (landscape) ───────────────────────────── */

function tasmeeModern({ primary, secondary }) {
  const p = page(1123, 794);
  p.rect('side', { x: 963, y: 0, w: 160, h: 794, fill: gradient(180, primary, shade(primary, 0.25)) });
  p.ornament('side-stars', 'border-stars', { x: 1028, y: 30, w: 734, h: 30, color: tint(primary, 0.25), accent: tint(primary, 0.35), rotation: 90 });
  p.brand('logo', 'logo', { x: 120, y: 60, w: 80 });
  p.text('eyebrow', 'شهادة تسميع', { x: 230, y: 70, w: 700, size: 22, font: 'Cairo-SemiBold', color: secondary, align: 'right' });
  p.text('title', 'نتيجة الاستظهار', { x: 230, y: 104, w: 700, size: 56, font: 'Cairo-Black', color: primary, align: 'right' });
  p.field('student-name', 'studentName', { x: 230, y: 230, w: 700, size: 46, font: 'Cairo-Bold', color: INK, align: 'right' });
  p.field('recital', 'recitalType', { x: 230, y: 305, w: 700, size: 26, font: 'Cairo-Regular', color: MUTED, align: 'right' });
  p.field('surah', 'surahRange', { x: 230, y: 350, w: 700, size: 30, font: 'Cairo-SemiBold', color: primary, align: 'right' });
  const stats = [['التقويم', 'calendar'], ['عدد الأخطاء', 'mistakesCount'], ['المعلّم', 'teacherName']];
  stats.forEach(([label, field], index) => {
    const x = 690 - index * 230;
    p.rect(`stat-${field}-box`, { x, y: 450, w: 210, h: 120, fill: tint(primary, 0.92), radius: 14 });
    p.text(`stat-${field}-label`, label, { x, y: 466, w: 210, size: 20, font: 'Cairo-Regular', color: MUTED });
    p.field(`stat-${field}`, field, { x: x + 10, y: 505, w: 190, size: 30, font: 'Cairo-Bold', color: primary });
  });
  p.date('date', { x: 230, y: 650, w: 700, align: 'right', color: MUTED });
  p.brand('signature', 'signature', { x: 110, y: 610, w: 150, h: 80 });
  p.text('sign-label', 'المعلّم/ة', { x: 110, y: 695, w: 150, size: 18, font: 'Cairo-Regular', color: MUTED });
  return p.done({ detailLevel: 'detailed', background: { type: 'solid', color: '#FFFFFF', accentColor: primary, customLayout: true } });
}

/* ── 7. Academic excellence, navy formal (landscape) ──────────────────────────── */

function excellenceFormal({ primary, secondary, paper }) {
  const p = page(1123, 794);
  p.ornament('frame', 'frame-double', { x: 22, y: 22, w: 1079, h: 750, color: primary, accent: secondary });
  p.ornament('medal', 'medallion', { x: 70, y: 70, w: 150, color: secondary, accent: primary });
  p.star('medal-star', { x: 115, y: 113, w: 60, points: 5, fill: tint(secondary, 0.65) });
  p.brand('logo', 'logo', { x: 930, y: 70, w: 110 });
  p.text('title', 'شهادة تفوّق', { y: 120, w: 600, size: 70, font: 'Cairo-Black', color: primary });
  p.ornament('laurel', 'laurel', { y: 222, w: 200, h: 84, color: secondary, weight: 2.5 });
  p.field('lead', 'recipientTitle', { y: 312, w: 700, size: 28, font: 'Amiri-Regular', color: INK, template: 'تفخر {{schoolName}} بتكريم {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 362, w: 800, size: 56, font: 'Cairo-Bold', color: secondary });
  p.text('body', '{{لتفوّقه|لتفوّقها}} الدراسي {{وتميّزه|وتميّزها}} في التحصيل العلمي والانضباط،\nمتمنّين {{له|لها}} دوام التوفيق والنجاح.', { y: 452, w: 760, size: 25, font: 'Amiri-Regular', color: INK, lineHeight: 1.8 });
  p.date('date', { y: 572, w: 320, color: MUTED });
  p.signatures('sign', { y: 625, labels: ['المعلّم/ة', 'المدير/ة'], color: MUTED, lineColor: tint(primary, 0.6) });
  p.brand('stamp', 'stamp', { x: 500, y: 620, w: 116 });
  return p.done({ background: { type: 'solid', color: paper, accentColor: primary, customLayout: true } });
}

/* ── 8. Excellence for kids, playful (landscape) ──────────────────────────────── */

function excellenceKids({ primary, secondary }) {
  const p = page(1123, 794);
  const sky = tint(primary, 0.88);
  p.rect('card', { x: 30, y: 30, w: 1063, h: 734, fill: WHITE, stroke: primary, strokeWidth: 6, radius: 40, dash: [10, 6] });
  p.shape('sun', 'sun', { x: 70, y: 60, w: 120, h: 120, fill: '#F2C14E' });
  p.shape('cloud-1', 'cloud', { x: 900, y: 70, w: 150, h: 92, fill: sky });
  p.shape('cloud-2', 'cloud', { x: 820, y: 640, w: 120, h: 74, fill: sky });
  p.star('star-1', { x: 230, y: 610, w: 56, fill: '#F2C14E', rotation: -12 });
  p.star('star-2', { x: 160, y: 520, w: 36, fill: secondary, rotation: 10 });
  p.star('star-3', { x: 940, y: 220, w: 44, fill: '#F2C14E', rotation: 18 });
  p.brand('logo', 'logo', { y: 52, w: 84 });
  p.shape('banner', 'banner', { y: 150, w: 640, h: 120, fill: primary });
  p.text('title', 'أحسنت يا بطل!', { y: 166, w: 520, size: 52, font: 'Marhey-VariableFont_wght', color: WHITE });
  p.field('lead', 'recipientTitle', { y: 300, w: 600, size: 28, font: 'Cairo-SemiBold', color: MUTED, template: 'شهادة تفوّق مقدّمة إلى {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 345, w: 760, size: 58, font: 'Marhey-VariableFont_wght', color: secondary });
  p.text('body', '{{لأنك مجتهد ومتميّز|لأنكِ مجتهدة ومتميّزة}} في دروسك وحفظك،\nنفخر بك ونتمنّى لك المزيد من النجاح!', { y: 445, w: 700, size: 27, font: 'Cairo-Regular', color: INK, lineHeight: 1.7 });
  p.date('date', { y: 575, w: 320, color: MUTED });
  p.brand('signature', 'signature', { x: 480, y: 620, w: 160, h: 80 });
  return p.done({ background: { type: 'solid', color: '#FFFDF6', fill: gradient(180, '#FFFDF6', tint(primary, 0.93)), accentColor: primary, customLayout: true } });
}

/* ── 9. Attendance, ribbon (landscape) ────────────────────────────────────────── */

function attendanceRibbon({ primary, secondary, paper }) {
  const p = page(1123, 794);
  p.rect('top', { x: 0, y: 0, w: 1123, h: 18, fill: primary });
  p.rect('bottom', { x: 0, y: 776, w: 1123, h: 18, fill: primary });
  p.ornament('border-top', 'border-chain', { x: 40, y: 40, w: 1043, h: 22, color: tint(primary, 0.55), accent: secondary });
  p.ornament('border-bottom', 'border-chain', { x: 40, y: 732, w: 1043, h: 22, color: tint(primary, 0.55), accent: secondary });
  p.brand('logo', 'logo', { y: 86, w: 90 });
  p.shape('ribbon', 'ribbon', { y: 196, w: 620, h: 96, fill: primary });
  p.text('title', 'شهادة حضور ومواظبة', { y: 210, w: 560, size: 44, font: 'Cairo-Bold', color: WHITE });
  p.field('lead', 'recipientTitle', { y: 320, w: 700, size: 27, font: 'Amiri-Regular', color: INK, template: 'تُقدَّم هذه الشهادة إلى {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 370, w: 800, size: 54, font: 'Cairo-Bold', color: secondary });
  p.text('body', 'تقديرًا {{لانتظامه|لانتظامها}} في الحضور {{ومواظبته|ومواظبتها}} على حلقات القرآن الكريم،\n{{زاده|زادها}} الله حرصًا وثباتًا.', { y: 465, w: 800, size: 25, font: 'Amiri-Regular', color: INK, lineHeight: 1.8 });
  p.date('date', { y: 565, w: 320, color: MUTED });
  p.signatures('sign', { y: 615, labels: ['المعلّم/ة', 'الإدارة'], color: MUTED, lineColor: tint(primary, 0.6), w: 200 });
  return p.done({ background: { type: 'solid', color: paper, accentColor: primary, customLayout: true } });
}

/* ── 10. Attendance, minimal (portrait) ───────────────────────────────────────── */

function attendanceMinimal({ primary, secondary }) {
  const p = page(794, 1123);
  p.rect('top-block', { x: 0, y: 0, w: 794, h: 330, fill: gradient(160, primary, shade(primary, 0.3)) });
  p.ornament('top-star', 'star8', { x: 590, y: 40, w: 160, color: tint(primary, 0.18), accent: tint(primary, 0.28), opacity: 0.7 });
  p.brand('logo', 'logo', { y: 70, w: 100 });
  p.text('title', 'شهادة مواظبة', { y: 200, w: 600, size: 56, font: 'Cairo-Black', color: WHITE });
  p.field('lead', 'recipientTitle', { y: 410, w: 600, size: 26, font: 'Cairo-Regular', color: MUTED, template: 'نشهد بأنّ {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 458, w: 680, size: 50, font: 'Cairo-Bold', color: primary });
  p.line('accent-line', { y: 545, w: 120, color: secondary, width: 4 });
  p.text('body', '{{التزم|التزمت}} بالحضور طوال الفصل الدراسي دون غياب،\n{{فاستحقّ|فاستحقّت}} هذه الشهادة تقديرًا وتشجيعًا.', { y: 580, w: 640, size: 25, font: 'Cairo-Regular', color: INK, lineHeight: 1.8 });
  p.field('program', 'programName', { y: 700, w: 560, size: 22, font: 'Cairo-SemiBold', color: secondary });
  p.date('date', { y: 760, w: 340, color: MUTED });
  p.signatures('sign', { y: 900, labels: ['المعلّم/ة', 'الإدارة'], color: MUTED, lineColor: tint(primary, 0.6), w: 220 });
  return p.done({ background: { type: 'solid', color: '#FFFFFF', accentColor: primary, customLayout: true } });
}

/* ── 11. Thanks, soft floral (landscape) ──────────────────────────────────────── */

function thanksFloral({ primary, secondary }) {
  const p = page(1123, 794);
  const blush = tint(primary, 0.85);
  p.rect('frame', { x: 40, y: 40, w: 1043, h: 714, fill: null, stroke: tint(primary, 0.45), strokeWidth: 2, radius: 24 });
  [[30, 30, 170, 0.9], [960, 600, 150, 0.9], [120, 640, 90, 0.75], [930, 50, 100, 0.75]].forEach(([x, y, w, o], index) => {
    p.ornament(`flower-${index + 1}`, index % 2 ? 'rosette8' : 'rosette12', { x, y, w, color: blush, accent: tint(secondary, 0.5), opacity: o });
  });
  p.brand('logo', 'logo', { y: 80, w: 88 });
  p.text('title', 'شهادة شكر وتقدير', { y: 175, w: 700, size: 62, font: 'alfont_com_ArefRuqaaswashesfixed-Bold', color: primary });
  p.ornament('divider', 'divider-flourish', { y: 268, w: 360, h: 30, color: tint(primary, 0.3), accent: secondary });
  p.field('lead', 'recipientTitle', { y: 312, w: 700, size: 27, font: 'Amiri-Regular', color: INK, template: 'تتقدّم {{schoolName}} بخالص الشكر إلى {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 365, w: 800, size: 54, font: 'Cairo-Bold', color: secondary });
  p.text('body', 'تقديرًا {{لجهوده|لجهودها}} المميّزة {{وعطائه|وعطائها}} الدائم،\nسائلين الله أن {{يجزيه|يجزيها}} خير الجزاء.', { y: 455, w: 720, size: 26, font: 'Amiri-Regular', color: INK, lineHeight: 1.8 });
  p.date('date', { y: 570, w: 320, color: MUTED });
  p.signatures('sign', { y: 620, labels: ['المعلّم/ة', 'الإدارة'], color: MUTED, lineColor: tint(primary, 0.55), w: 200 });
  return p.done({ background: { type: 'solid', color: '#FFFBFA', fill: gradient(180, '#FFFFFF', tint(primary, 0.94)), accentColor: primary, customLayout: true } });
}

/* ── 12. Thanks, formal adults (landscape) ────────────────────────────────────── */

function thanksFormal({ primary, secondary, paper }) {
  const p = page(1123, 794);
  p.rect('dark-frame', { x: 0, y: 0, w: 1123, h: 794, fill: null, stroke: primary, strokeWidth: 36 });
  p.rect('gold-line', { x: 30, y: 30, w: 1063, h: 734, fill: null, stroke: secondary, strokeWidth: 2 });
  p.corners('corner', 'corner-arabesque', { inset: 30, size: 110, color: secondary, accent: secondary });
  p.brand('logo', 'logo', { y: 70, w: 96 });
  p.text('title', 'شكر وعرفان', { y: 175, w: 600, size: 66, font: 'Rakkas-Regular', color: primary });
  p.field('lead', 'recipientTitle', { y: 275, w: 760, size: 27, font: 'Amiri-Regular', color: INK, template: 'يسرّ إدارة {{schoolName}} أن تتقدّم بالشكر الجزيل إلى {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 330, w: 820, size: 54, font: 'Cairo-Bold', color: secondary });
  p.text('body', 'تقديرًا {{لإسهاماته|لإسهاماتها}} القيّمة {{وجهوده|وجهودها}} المخلصة في خدمة كتاب الله،\nجعل الله ذلك في موازين {{حسناته|حسناتها}}.', { y: 425, w: 800, size: 25, font: 'Amiri-Regular', color: INK, lineHeight: 1.8 });
  p.date('date', { y: 550, w: 320, color: MUTED });
  p.signatures('sign', { y: 600, labels: ['المشرف/ة', 'المدير/ة'], color: MUTED, lineColor: tint(secondary, 0.4), w: 220 });
  p.brand('stamp', 'stamp', { x: 500, y: 595, w: 116 });
  return p.done({ audienceType: 'adult', background: { type: 'solid', color: paper, accentColor: primary, customLayout: true } });
}

/* ── 13. Participation, modern geometric (landscape) ──────────────────────────── */

function participationModern({ primary, secondary }) {
  const p = page(1123, 794);
  p.polygon('hex-1', { x: -60, y: -40, w: 260, h: 230, sides: 6, fill: tint(primary, 0.85) });
  p.polygon('hex-2', { x: 130, y: 60, w: 120, h: 105, sides: 6, fill: tint(secondary, 0.7) });
  p.polygon('hex-3', { x: 990, y: 680, w: 240, h: 210, sides: 6, fill: tint(primary, 0.85) });
  p.polygon('hex-4', { x: 1052, y: 600, w: 70, h: 62, sides: 6, fill: primary });
  p.brand('logo', 'logo', { x: 940, y: 60, w: 100 });
  p.text('eyebrow', 'شهادة', { y: 140, w: 400, size: 30, font: 'Cairo-SemiBold', color: secondary });
  p.text('title', 'مشاركة', { y: 180, w: 600, size: 84, font: 'Cairo-Black', color: primary });
  p.field('lead', 'recipientTitle', { y: 315, w: 700, size: 26, font: 'Cairo-Regular', color: MUTED, template: 'تُمنح هذه الشهادة إلى {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 360, w: 800, size: 54, font: 'Cairo-Bold', color: INK });
  p.field('program', 'programName', { y: 450, w: 800, size: 25, font: 'Cairo-Regular', color: INK, template: '{{لمشاركته|لمشاركتها}} المتميّزة في {{programName}}' });
  p.date('date', { y: 540, w: 320, color: MUTED });
  p.signatures('sign', { y: 610, labels: ['المنسّق/ة', 'الإدارة'], color: MUTED, lineColor: tint(primary, 0.6), w: 200 });
  return p.done({ background: { type: 'solid', color: '#FFFFFF', accentColor: primary, customLayout: true } });
}

/* ── 14. Participation for kids (portrait) ────────────────────────────────────── */

function participationKids({ primary, secondary }) {
  const p = page(794, 1123);
  p.rect('card', { x: 36, y: 36, w: 722, h: 1051, fill: WHITE, stroke: secondary, strokeWidth: 5, radius: 36 });
  p.shape('cloud-1', 'cloud', { x: 70, y: 80, w: 160, h: 98, fill: tint(primary, 0.85) });
  p.shape('cloud-2', 'cloud', { x: 560, y: 120, w: 150, h: 92, fill: tint(primary, 0.85) });
  p.shape('sun', 'sun', { x: 590, y: 860, w: 120, h: 120, fill: '#F2C14E' });
  p.shape('heart', 'heart', { x: 100, y: 900, w: 80, h: 72, fill: tint(secondary, 0.4) });
  p.brand('logo', 'logo', { y: 120, w: 96 });
  p.text('title', 'شكرًا لمشاركتك!', { y: 260, w: 640, size: 58, font: 'Marhey-VariableFont_wght', color: primary });
  p.field('lead', 'recipientTitle', { y: 370, w: 600, size: 28, font: 'Cairo-SemiBold', color: MUTED, template: 'إلى {{recipientTitle}} {{المتميّز|المتميّزة}}' });
  p.field('student-name', 'studentName', { y: 420, w: 660, size: 52, font: 'Marhey-VariableFont_wght', color: secondary });
  p.field('program', 'programName', { y: 525, w: 620, size: 27, font: 'Cairo-Regular', color: INK, template: '{{شاركتَ|شاركتِ}} معنا في {{programName}}\n{{وكنتَ رائعًا|وكنتِ رائعة}}!', lineHeight: 1.7 });
  p.star('star-1', { x: 160, y: 690, w: 70, fill: '#F2C14E' });
  p.star('star-2', { y: 670, w: 90, fill: '#F2C14E' });
  p.star('star-3', { x: 564, y: 690, w: 70, fill: '#F2C14E' });
  p.date('date', { y: 800, w: 340, color: MUTED });
  return p.done({ background: { type: 'solid', color: tint(primary, 0.93), accentColor: primary, customLayout: true } });
}

/* ── 15. Competition winner (landscape) ───────────────────────────────────────── */

function competitionWinner({ primary, secondary }) {
  const p = page(1123, 794);
  p.rect('bg-left', { x: 0, y: 0, w: 380, h: 794, fill: gradient(160, primary, shade(primary, 0.35)) });
  p.ornament('seal', 'sunburst', { x: 90, y: 230, w: 200, color: secondary, accent: shade(primary, 0.1) });
  p.text('rank', 'الفائز', { x: 90, y: 300, w: 200, size: 40, font: 'Cairo-Black', color: tint(secondary, 0.6) });
  p.ornament('border', 'border-stars', { x: 40, y: 700, w: 300, h: 26, color: tint(secondary, 0.3), accent: tint(secondary, 0.5) });
  p.brand('logo', 'logo', { x: 140, y: 60, w: 100 });
  p.text('title', 'شهادة فوز', { x: 420, y: 110, w: 640, size: 70, font: 'Cairo-Black', color: primary });
  p.field('program', 'programName', { x: 420, y: 210, w: 640, size: 28, font: 'Cairo-SemiBold', color: secondary, template: 'في {{programName}}' });
  p.field('lead', 'recipientTitle', { x: 420, y: 285, w: 640, size: 26, font: 'Amiri-Regular', color: INK, template: 'نبارك لـ{{recipientTitle}}' });
  p.field('student-name', 'studentName', { x: 420, y: 335, w: 640, size: 52, font: 'Cairo-Bold', color: primary });
  p.field('rank-text', 'calendar', { x: 420, y: 420, w: 640, size: 30, font: 'Cairo-Bold', color: secondary, template: '{{وحصوله|وحصولها}} على {{calendar}}' });
  p.text('body', 'سائلين الله {{له|لها}} مزيدًا من التفوّق والتميّز.', { x: 420, y: 480, w: 640, size: 24, font: 'Amiri-Regular', color: INK });
  p.date('date', { x: 420, y: 560, w: 640, color: MUTED });
  p.brand('signature', 'signature', { x: 820, y: 620, w: 150, h: 80 });
  p.brand('stamp', 'stamp', { x: 520, y: 610, w: 110 });
  return p.done({ background: { type: 'solid', color: '#FFFFFF', accentColor: primary, customLayout: true } });
}

/* ── 16. Competition, gold seal (portrait) ────────────────────────────────────── */

function competitionSeal({ primary, secondary, paper }) {
  const p = page(794, 1123);
  p.ornament('frame', 'frame-double', { x: 24, y: 24, w: 746, h: 1075, color: secondary, accent: primary });
  p.brand('logo', 'logo', { y: 80, w: 96 });
  p.text('title', 'مسابقة القرآن الكريم', { y: 200, w: 640, size: 48, font: 'Cairo-Black', color: primary });
  p.field('program', 'programName', { y: 275, w: 600, size: 26, font: 'Cairo-SemiBold', color: secondary });
  p.ornament('seal', 'medallion', { y: 345, w: 220, color: secondary, accent: primary });
  p.field('rank', 'calendar', { y: 420, w: 180, size: 30, font: 'Cairo-Black', color: tint(secondary, 0.75) });
  p.field('lead', 'recipientTitle', { y: 600, w: 600, size: 26, font: 'Amiri-Regular', color: INK, template: 'تُمنح هذه الشهادة إلى {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 650, w: 680, size: 48, font: 'Cairo-Bold', color: primary });
  p.field('surah', 'surahRange', { y: 735, w: 640, size: 24, font: 'Amiri-Regular', color: INK, template: 'في حفظ {{surahRange}}' });
  p.date('date', { y: 810, w: 340, color: MUTED });
  p.signatures('sign', { y: 900, labels: ['لجنة التحكيم', 'الإدارة'], color: MUTED, lineColor: tint(secondary, 0.4), w: 220 });
  return p.done({ detailLevel: 'detailed', background: { type: 'solid', color: paper, accentColor: primary, customLayout: true } });
}

/* ── 17. Teacher appreciation (landscape) ─────────────────────────────────────── */

function teacherAppreciation({ primary, secondary, paper }) {
  const p = page(1123, 794);
  p.ornament('frame', 'frame-ornate', { x: 18, y: 18, w: 1087, h: 758, color: primary, accent: secondary });
  p.brand('logo', 'logo', { y: 76, w: 96 });
  p.text('title', 'شهادة تقدير', { y: 175, w: 600, size: 64, font: 'alfont_com_ArefRuqaaswashesfixed-Bold', color: primary });
  p.text('lead', 'تتقدّم الإدارة بأسمى عبارات الشكر والتقدير إلى', { y: 275, w: 760, size: 27, font: 'Amiri-Regular', color: INK });
  p.field('student-name', 'studentName', { y: 325, w: 800, size: 54, font: 'Cairo-Bold', color: secondary, template: '{{الأستاذ|الأستاذة}} {{studentName}}' });
  p.text('body', 'تقديرًا {{لعطائه|لعطائها}} المتميّز {{وجهوده|وجهودها}} المخلصة في تعليم كتاب الله،\n«خيركم من تعلّم القرآن وعلّمه».', { y: 420, w: 800, size: 25, font: 'Amiri-Regular', color: INK, lineHeight: 1.8 });
  p.date('date', { y: 545, w: 320, color: MUTED });
  p.signatures('sign', { y: 610, labels: ['المشرف/ة العام/ة', 'المدير/ة'], color: MUTED, lineColor: tint(primary, 0.5), w: 220 });
  p.brand('stamp', 'stamp', { x: 500, y: 600, w: 116 });
  return p.done({ audienceType: 'adult', background: { type: 'solid', color: paper, accentColor: primary, customLayout: true } });
}

/* ── 18. Supervisor thanks (portrait formal) ──────────────────────────────────── */

function supervisorThanks({ primary, secondary }) {
  const p = page(794, 1123);
  p.rect('band', { x: 0, y: 0, w: 120, h: 1123, fill: primary });
  p.ornament('band-pattern', 'border-diamonds', { x: 88, y: 40, w: 1040, h: 56, color: tint(primary, 0.2), accent: secondary, rotation: 90 });
  p.brand('logo', 'logo', { x: 560, y: 80, w: 110 });
  p.text('title', 'شكر وتقدير', { x: 170, y: 240, w: 560, size: 62, font: 'Cairo-Black', color: primary, align: 'right' });
  p.line('title-line', { x: 610, y: 340, w: 120, color: secondary, width: 5 });
  p.text('lead', 'إلى المشرف/ة الفاضل/ة', { x: 170, y: 380, w: 560, size: 28, font: 'Cairo-Regular', color: MUTED, align: 'right' });
  p.field('student-name', 'studentName', { x: 170, y: 430, w: 560, size: 48, font: 'Cairo-Bold', color: secondary, align: 'right' });
  p.text('body', 'نشكر لكم إشرافكم المتقن ومتابعتكم الدؤوبة لحلقات التحفيظ، وما بذلتموه من جهد صادق في سبيل الارتقاء بطلاب القرآن الكريم.', { x: 170, y: 530, w: 560, size: 25, font: 'Amiri-Regular', color: INK, align: 'right', lineHeight: 1.85 });
  p.date('date', { x: 170, y: 770, w: 560, align: 'right', color: MUTED });
  p.brand('signature', 'signature', { x: 500, y: 860, w: 170, h: 90 });
  p.text('sign-label', 'المدير/ة', { x: 470, y: 960, w: 230, size: 20, font: 'Cairo-SemiBold', color: MUTED });
  p.brand('stamp', 'stamp', { x: 220, y: 850, w: 120 });
  return p.done({ audienceType: 'adult', background: { type: 'solid', color: '#FFFFFF', accentColor: primary, customLayout: true } });
}

/* ── 19. Ramadan program (landscape) ──────────────────────────────────────────── */

function ramadanProgram({ primary, secondary }) {
  const p = page(1123, 794);
  const night = shade(primary, 0.55);
  p.rect('sky', { x: 0, y: 0, w: 1123, h: 794, fill: gradient(180, night, shade(primary, 0.25)) });
  p.rect('card', { x: 160, y: 120, w: 803, h: 560, fill: '#FFFDF8', radius: 28 });
  p.shape('moon', 'crescent', { x: 60, y: 50, w: 120, h: 120, fill: tint(secondary, 0.35) });
  p.ornament('lantern-1', 'lantern', { x: 990, y: 0, w: 70, h: 140, color: secondary, accent: tint(secondary, 0.5) });
  p.ornament('lantern-2', 'lantern', { x: 910, y: 0, w: 52, h: 100, color: secondary, accent: tint(secondary, 0.5) });
  [[230, 60, 14], [330, 90, 10], [760, 50, 12], [860, 690, 14], [120, 720, 10]].forEach(([x, y, w], index) => p.star(`star-${index + 1}`, { x, y, w, points: 4, inner: 0.35, fill: tint(secondary, 0.4) }));
  p.brand('logo', 'logo', { y: 150, w: 84 });
  p.text('title', 'برنامج رمضان القرآني', { y: 240, w: 700, size: 52, font: 'Rakkas-Regular', color: primary });
  p.field('lead', 'recipientTitle', { y: 330, w: 660, size: 26, font: 'Amiri-Regular', color: INK, template: 'تُمنح هذه الشهادة إلى {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 378, w: 700, size: 50, font: 'Cairo-Bold', color: secondary });
  p.text('body', '{{لمشاركته|لمشاركتها}} في برنامج رمضان القرآني {{وحرصه|وحرصها}} على التلاوة والحفظ،\nتقبّل الله منّا ومنكم صالح الأعمال.', { y: 465, w: 700, size: 24, font: 'Amiri-Regular', color: INK, lineHeight: 1.8 });
  p.date('date', { y: 580, w: 320, color: MUTED });
  return p.done({ background: { type: 'solid', color: night, accentColor: primary, customLayout: true } });
}

/* ── 20. Tajweed course (landscape modern) ────────────────────────────────────── */

function tajweedCourse({ primary, secondary }) {
  const p = page(1123, 794);
  p.rect('header', { x: 0, y: 0, w: 1123, h: 150, fill: primary });
  p.ornament('header-band', 'border-scallops', { x: 0, y: 150, w: 1123, h: 30, color: primary, accent: secondary });
  p.brand('logo', 'logo', { x: 960, y: 30, w: 90 });
  p.text('title', 'شهادة إتمام دورة', { x: 160, y: 42, w: 760, size: 46, font: 'Cairo-Black', color: WHITE, align: 'right' });
  p.field('program', 'programName', { y: 225, w: 800, size: 40, font: 'Cairo-Bold', color: secondary, template: '«{{programName}}»' });
  p.field('lead', 'recipientTitle', { y: 305, w: 700, size: 26, font: 'Cairo-Regular', color: MUTED, template: 'نشهد بأنّ {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 350, w: 800, size: 54, font: 'Cairo-Bold', color: primary });
  p.text('body', 'قد {{أتمّ|أتمّت}} متطلبات الدورة بنجاح، {{واجتاز|واجتازت}} اختبارها النهائي،\nنسأل الله {{له|لها}} التوفيق والسداد.', { y: 445, w: 780, size: 25, font: 'Cairo-Regular', color: INK, lineHeight: 1.8 });
  p.field('grade', 'calendar', { y: 545, w: 400, size: 26, font: 'Cairo-SemiBold', color: secondary, template: 'التقدير: {{calendar}}' });
  p.signatures('sign', { y: 620, labels: ['مدرّب/ة الدورة', 'الإدارة'], color: MUTED, lineColor: tint(primary, 0.6), w: 220 });
  p.qr('verify', { x: 511, y: 612, w: 100, color: primary });
  p.text('verify-label', 'امسح للتحقق', { x: 486, y: 714, w: 150, size: 14, font: 'Cairo-Regular', color: MUTED });
  return p.done({ detailLevel: 'detailed', verification: { enabled: true }, background: { type: 'solid', color: '#FFFFFF', accentColor: primary, customLayout: true } });
}

/* ── 21. Memorization, open mushaf (portrait) ─────────────────────────────────── */

function memorizationMushaf({ primary, secondary, paper }) {
  const p = page(794, 1123);
  p.ornament('frame', 'frame-ornate', { x: 20, y: 20, w: 754, h: 1083, color: secondary, accent: primary });
  p.shape('book', 'book', { y: 110, w: 190, h: 126, fill: primary });
  p.ornament('book-star', 'star8', { y: 140, w: 44, color: tint(secondary, 0.5), accent: secondary });
  p.text('title', 'شهادة حفظ', { y: 270, w: 560, size: 60, font: 'alfont_com_ArefRuqaaswashesfixed-Bold', color: primary });
  p.field('surah', 'surahRange', { y: 365, w: 620, size: 30, font: 'Cairo-SemiBold', color: secondary });
  p.ornament('divider', 'divider-diamond', { y: 425, w: 360, h: 26, color: tint(primary, 0.3), accent: secondary });
  p.field('lead', 'recipientTitle', { y: 470, w: 600, size: 26, font: 'Amiri-Regular', color: INK, template: '{{أتمّ|أتمّت}} {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 518, w: 640, size: 48, font: 'Cairo-Bold', color: primary });
  p.field('recital', 'recitalType', { y: 605, w: 600, size: 24, font: 'Amiri-Regular', color: INK });
  p.field('teacher', 'teacherName', { y: 660, w: 600, size: 22, font: 'Cairo-Regular', color: MUTED, template: 'على يد المعلّم/ة: {{teacherName}}' });
  p.text('verse', '﴿ وَقُلْ رَبِّ زِدْنِي عِلْمًا ﴾', { y: 730, w: 500, size: 28, font: 'Amiri-Regular', color: secondary });
  p.date('date', { y: 820, w: 340, color: MUTED });
  p.signatures('sign', { y: 900, labels: ['المعلّم/ة', 'الإدارة'], color: MUTED, lineColor: tint(secondary, 0.4), w: 220 });
  return p.done({ detailLevel: 'detailed', background: { type: 'solid', color: paper, accentColor: primary, customLayout: true } });
}

/* ── 22. Little hafiz (landscape kids) ────────────────────────────────────────── */

function littleHafiz({ primary, secondary }) {
  const p = page(1123, 794);
  p.rect('card', { x: 26, y: 26, w: 1071, h: 742, fill: WHITE, stroke: tint(primary, 0.4), strokeWidth: 10, radius: 48 });
  p.ornament('scallops-top', 'border-scallops', { x: 70, y: 26, w: 983, h: 40, color: tint(primary, 0.75), accent: secondary, rotation: 0 });
  p.shape('book', 'book', { x: 80, y: 520, w: 210, h: 140, fill: primary });
  p.shape('cloud', 'cloud', { x: 850, y: 90, w: 170, h: 104, fill: tint(primary, 0.85) });
  p.star('star-a', { x: 300, y: 470, w: 50, fill: '#F2C14E', rotation: 15 });
  p.star('star-b', { x: 860, y: 540, w: 70, fill: '#F2C14E', rotation: -10 });
  p.brand('logo', 'logo', { y: 76, w: 84 });
  p.text('title', 'الحافظ الصغير', { y: 170, w: 640, size: 66, font: 'Marhey-VariableFont_wght', color: primary });
  p.field('lead', 'recipientTitle', { y: 285, w: 600, size: 28, font: 'Cairo-SemiBold', color: MUTED, template: 'مبارك يا {{recipientTitle}}' });
  p.field('student-name', 'studentName', { y: 335, w: 760, size: 56, font: 'Marhey-VariableFont_wght', color: secondary });
  p.field('surah', 'surahRange', { y: 430, w: 640, size: 28, font: 'Cairo-Regular', color: INK, template: '{{لقد حفظتَ|لقد حفظتِ}} {{surahRange}}' });
  p.text('body', '{{استمر يا بطل، فأنت|استمري يا بطلة، فأنتِ}} من أهل القرآن!', { y: 485, w: 600, size: 26, font: 'Cairo-SemiBold', color: primary });
  p.date('date', { y: 580, w: 320, color: MUTED });
  p.brand('signature', 'signature', { x: 480, y: 625, w: 160, h: 80 });
  return p.done({ detailLevel: 'detailed', background: { type: 'solid', color: tint(secondary, 0.9), accentColor: primary, customLayout: true } });
}

export const STARTERS = [
  { id: 'quran-achievement', name: 'شهادة إنجاز قرآنية (الطلاب)', category: 'memorization', style: 'islamic', featured: true, build: (palette) => quranAchievement(palette, 'student') },
  { id: 'quran-achievement-adults', name: 'شهادة إنجاز قرآنية (الدارسين)', category: 'memorization', style: 'islamic', featured: true, build: (palette) => quranAchievement(palette, 'adult') },
  { id: 'khatm-ornate', name: 'ختم القرآن — ذهبي مزخرف', category: 'khatm', style: 'ornate', build: khatmOrnate },
  { id: 'khatm-mihrab', name: 'ختم القرآن — المحراب', category: 'khatm', style: 'islamic', build: khatmMihrab },
  { id: 'hifz-juz', name: 'إتمام حفظ جزء', category: 'memorization', style: 'islamic', build: hifzJuz },
  { id: 'tasmee-modern', name: 'نتيجة التسميع', category: 'memorization', style: 'minimal', build: tasmeeModern },
  { id: 'memorization-mushaf', name: 'شهادة حفظ — المصحف', category: 'memorization', style: 'ornate', build: memorizationMushaf },
  { id: 'excellence-formal', name: 'تفوّق دراسي — رسمي', category: 'excellence', style: 'formal', build: excellenceFormal },
  { id: 'excellence-kids', name: 'أحسنت يا بطل', category: 'excellence', style: 'kids', build: excellenceKids },
  { id: 'little-hafiz', name: 'الحافظ الصغير', category: 'memorization', style: 'kids', build: littleHafiz },
  { id: 'attendance-ribbon', name: 'حضور ومواظبة — شريط', category: 'attendance', style: 'islamic', build: attendanceRibbon },
  { id: 'attendance-minimal', name: 'مواظبة — عصري', category: 'attendance', style: 'minimal', build: attendanceMinimal },
  { id: 'thanks-floral', name: 'شكر وتقدير — مزهر', category: 'thanks', style: 'floral', build: thanksFloral },
  { id: 'thanks-formal', name: 'شكر وعرفان — رسمي', category: 'thanks', style: 'formal', build: thanksFormal },
  { id: 'participation-modern', name: 'شهادة مشاركة — عصري', category: 'participation', style: 'minimal', build: participationModern },
  { id: 'participation-kids', name: 'شكرًا لمشاركتك', category: 'participation', style: 'kids', build: participationKids },
  { id: 'ramadan-program', name: 'برنامج رمضان القرآني', category: 'participation', style: 'islamic', build: ramadanProgram },
  { id: 'competition-winner', name: 'شهادة فوز', category: 'competitions', style: 'minimal', build: competitionWinner },
  { id: 'competition-seal', name: 'مسابقة القرآن — الوسام', category: 'competitions', style: 'ornate', build: competitionSeal },
  { id: 'tajweed-course', name: 'إتمام دورة', category: 'participation', style: 'minimal', build: tajweedCourse },
  { id: 'teacher-appreciation', name: 'تقدير معلّم', category: 'staff', style: 'ornate', build: teacherAppreciation },
  { id: 'supervisor-thanks', name: 'شكر مشرف', category: 'staff', style: 'formal', build: supervisorThanks },
];

/** Build a starter as a ready template (with its palette recorded for later colour swaps). */
export function buildStarter(id, paletteKey) {
  const starter = STARTERS.find((item) => item.id === id);
  if (!starter) return null;
  const palette = paletteKey ? paletteByKey(paletteKey) : DEFAULT_PALETTE;
  return {
    ...starter.build(palette),
    name: starter.name,
    category: starter.category,
    style: starter.style,
    starterId: starter.id,
    paletteKey: palette.key,
  };
}

export { PALETTES };

import { describeFontFile } from './fonts.js';

/**
 * Arabic display names for font files. The UI is Arabic only, so pickers show these instead of
 * file names. Unknown (uploaded) fonts fall back to their file name, which is the user's own text.
 */
const FAMILY_NAMES = [
  [/^alexandria/i, 'الإسكندرية'],
  [/^amiri/i, 'أميري'],
  [/^cairo/i, 'القاهرة'],
  [/^helveticaneue/i, 'هلفتيكا العربي'],
  [/^marhey/i, 'مرحي'],
  [/^rakkas/i, 'رقّاص'],
  [/^abdo_free/i, 'عبده الحر'],
  [/^abdo_joody/i, 'عبده جودي'],
  [/^abdomaster/i, 'عبده ماستر'],
  [/^abo2sadam/i, 'أبو صدام'],
  [/^abomsaab/i, 'أبو مصعب'],
  [/^abuhmeda/i, 'أبو حميدة'],
  [/^ad-rsail/i, 'رسائل'],
  [/^adobe_arabic_shin/i, 'شين'],
  [/^adobe_naskh/i, 'النسخ'],
  [/^ae_almothnna/i, 'المثنى'],
  [/^ae_alyermook/i, 'اليرموك'],
  [/^ae_dimnah/i, 'دمنة'],
  [/^ae_hor/i, 'حُرّ'],
  [/^ae_sharjah/i, 'الشارقة'],
  [/^aga_mashq/i, 'المشق'],
  [/azer/i, 'آزر'],
  [/arefruqaa/i, 'عارف رقعة'],
  [/bisbee/i, 'بيسبي'],
  [/formadjr/i, 'فورما'],
  [/leeka/i, 'ليكا'],
  [/madinet/i, 'مدينة البط'],
  [/mayson/i, 'ميسون'],
  [/milligram/i, 'ملليغرام'],
  [/panoramanaskh/i, 'بانوراما نسخ'],
  [/bushra/i, 'بشرى'],
  [/zain-tufuli/i, 'زين طفولي'],
  [/zainsans/i, 'زين'],
  [/arslan_wessam_a/i, 'أرسلان وسام (أ)'],
  [/arslan_wessam_b/i, 'أرسلان وسام (ب)'],
  [/^janna/i, 'جنّة'],
  [/^titr/i, 'تيتر'],
];

const WEIGHT_NAMES = {
  100: 'رفيع',
  200: 'خفيف جدًا',
  300: 'خفيف',
  400: '',
  500: 'متوسط',
  600: 'شبه عريض',
  700: 'عريض',
  800: 'عريض جدًا',
  900: 'أسود',
};

/** Arabic label for a font file name or key, e.g. "Cairo-SemiBold.ttf" → "القاهرة · شبه عريض". */
export function fontLabel(fileName) {
  const key = String(fileName).replace(/\.(ttf|otf)$/i, '');
  const hit = FAMILY_NAMES.find(([pattern]) => pattern.test(key));
  if (!hit) return key;
  const face = describeFontFile(fileName);
  const parts = [hit[1]];
  if (face.variable) parts.push('متغيّر');
  else if (WEIGHT_NAMES[face.weight]) parts.push(WEIGHT_NAMES[face.weight]);
  if (/\bbold\b|_bold/i.test(key) && face.weight < 700) parts.push('عريض');
  if (/-1$/.test(key)) parts.push('٢');
  return parts.join(' · ');
}

/** Family label without weight (for grouping in pickers). */
export function fontFamilyLabel(fileName) {
  const key = String(fileName).replace(/\.(ttf|otf)$/i, '');
  const hit = FAMILY_NAMES.find(([pattern]) => pattern.test(key));
  return hit ? hit[1] : describeFontFile(fileName).family;
}

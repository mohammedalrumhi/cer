import { useEffect, useMemo, useState } from 'react';
import { ISLAMIC_ICONS } from './islamicIcons';

/** Featured icons with Arabic keywords, shown before searching and matched by Arabic queries. */
export const FEATURED_ICONS = [
  ...ISLAMIC_ICONS,
  ['award', 'جائزة وسام'], ['trophy', 'كأس فوز بطولة'], ['medal', 'ميدالية'], ['star', 'نجمة'], ['crown', 'تاج'],
  ['book-open', 'كتاب مصحف قراءة'], ['book', 'كتاب'], ['notebook-pen', 'دفتر كتابة'], ['graduation-cap', 'تخرج قبعة'], ['school', 'مدرسة'],
  ['moon', 'هلال قمر'], ['moon-star', 'هلال نجمة رمضان'], ['sun', 'شمس'], ['sparkles', 'لمعان تألق'], ['heart', 'قلب حب'],
  ['hand-heart', 'عطاء يد قلب'], ['handshake', 'شكر مصافحة تعاون'], ['thumbs-up', 'إعجاب ممتاز'], ['badge-check', 'موثق شارة'], ['circle-check', 'تم صح'],
  ['shield-check', 'حماية موثوق'], ['gem', 'جوهرة'], ['flower', 'زهرة وردة'], ['leaf', 'ورقة شجر'], ['sprout', 'نبتة نمو'],
  ['tree-palm', 'نخلة'], ['mountain', 'جبل'], ['lamp', 'مصباح'], ['lightbulb', 'فكرة مصباح'], ['target', 'هدف'],
  ['rocket', 'صاروخ انطلاق'], ['flag', 'علم'], ['calendar', 'تقويم تاريخ'], ['clock', 'ساعة وقت'], ['users', 'طلاب مجموعة'],
  ['user', 'طالب شخص'], ['pen-tool', 'قلم توقيع'], ['feather', 'ريشة'], ['scroll', 'لفافة شهادة'], ['ribbon', 'شريط'],
  ['mic', 'ميكروفون تلاوة'], ['headphones', 'سماعة استماع'], ['music', 'صوت نغمة'], ['globe', 'عالم'], ['map-pin', 'موقع'],
  ['phone', 'هاتف'], ['mail', 'بريد'], ['message-circle', 'رسالة'], ['smile', 'ابتسامة'], ['party-popper', 'احتفال'],
  ['gift', 'هدية'], ['cake', 'كعكة'], ['balloon', 'بالون أطفال'], ['candy', 'حلوى'], ['palette', 'ألوان رسم'],
  ['brush', 'فرشاة'], ['calculator', 'حساب رياضيات'], ['microscope', 'علوم'], ['dumbbell', 'رياضة'], ['bike', 'دراجة'],
  ['book-marked', 'مصحف كتاب علامة'], ['book-open-check', 'إتمام ختم قراءة'], ['book-heart', 'كتاب محبوب'], ['book-check', 'كتاب مكتمل'], ['book-a', 'لغة عربية حروف'],
  ['library', 'مكتبة'], ['library-big', 'مكتبة كبيرة'], ['scroll-text', 'لفافة نص وثيقة'], ['notebook-text', 'دفتر ملاحظات'], ['pencil', 'قلم رصاص'],
  ['pen-line', 'قلم كتابة'], ['pencil-ruler', 'أدوات هندسة'], ['ruler', 'مسطرة'], ['backpack', 'حقيبة مدرسية'], ['presentation', 'عرض سبورة درس'],
  ['laptop', 'حاسوب'], ['languages', 'لغات ترجمة'], ['brain', 'عقل ذكاء حفظ'], ['puzzle', 'لغز تفكير'], ['atom', 'ذرة علوم'],
  ['flask-conical', 'مختبر تجربة'], ['sigma', 'رياضيات مجموع'], ['pi', 'باي رياضيات'], ['hourglass', 'ساعة رملية وقت'], ['badge', 'شارة'],
  ['circle-star', 'نجمة دائرة تميز'], ['star-half', 'نصف نجمة'], ['sparkle', 'بريق'], ['goal', 'هدف مرمى'],
  ['zap', 'طاقة'], ['flame', 'شعلة حماس'], ['shield', 'درع'], ['key', 'مفتاح'], ['bell', 'جرس'],
  ['megaphone', 'مكبر صوت إعلان'], ['hand-helping', 'مساعدة تطوع'], ['heart-handshake', 'تعاون محبة'], ['hand-coins', 'صدقة تبرع'], ['hand-platter', 'ضيافة تقديم'],
  ['heart-pulse', 'صحة'], ['user-check', 'حضور موثق'], ['users-round', 'فريق جماعة'], ['baby', 'طفل روضة'], ['footprints', 'خطوات تقدم'],
  ['sunrise', 'شروق فجر'], ['sunset', 'غروب مغرب'], ['sun-moon', 'ليل ونهار'], ['cloud-moon', 'ليلة قمر'], ['cloud', 'غيمة سحابة'],
  ['rainbow', 'قوس قزح'], ['droplet', 'قطرة ماء'], ['waves', 'موج بحر'], ['trees', 'أشجار حديقة'], ['tree-pine', 'شجرة'],
  ['flower-2', 'زهرة ربيع'], ['clover', 'برسيم حظ'], ['bird', 'طائر عصفور'], ['fish', 'سمكة'], ['shell', 'صدفة'],
  ['mountain-snow', 'جبل ثلج'], ['tent', 'خيمة رحلة'], ['compass', 'بوصلة اتجاه'], ['map', 'خريطة'], ['plane', 'طائرة سفر'],
  ['bus', 'حافلة رحلة مدرسية'], ['house', 'بيت منزل'], ['landmark', 'مبنى مؤسسة'], ['apple', 'تفاحة معلم'], ['volleyball', 'كرة رياضة'],
];

const ARABIC_NAMES = new Map(FEATURED_ICONS.map(([name, keywords]) => [name, keywords.split(' ')[0]]));

/** Arabic label for an icon (its first keyword), or a generic word for icons found by a Latin search. */
export function iconLabel(name) {
  return ARABIC_NAMES.get(name) || 'أيقونة';
}

let featuredPromise = null;
let libraryPromise = null;
const loadFeatured = () => {
  if (!featuredPromise) featuredPromise = import('./featuredIcons.js').then((m) => m.FEATURED_NODES);
  return featuredPromise;
};
// The full lucide set (thousands of icons) only loads when someone searches by Latin name.
const loadLibrary = () => {
  if (!libraryPromise) libraryPromise = import('./iconLibrary.js').then((m) => m.ICON_NODES);
  return libraryPromise;
};

export async function loadIconNodes(name) {
  const featured = await loadFeatured();
  return featured[name] || (await loadLibrary())[name] || null;
}

/** Icon names for a query: Arabic keywords match the featured list, Latin queries the full set. */
export function useIconSearch(query, limit = 60) {
  const [library, setLibrary] = useState(null);
  const wantsFull = /[a-z]/i.test(query);
  useEffect(() => {
    let alive = true;
    (wantsFull ? Promise.all([loadFeatured(), loadLibrary()]).then(([f, l]) => ({ ...l, ...f })) : loadFeatured())
      .then((lib) => { if (alive) setLibrary(lib); });
    return () => { alive = false; };
  }, [wantsFull]);
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { library, names: FEATURED_ICONS.map(([name]) => name) };
    const arabic = FEATURED_ICONS.filter(([name, keywords]) => keywords.includes(q) || name.includes(q)).map(([name]) => name);
    const latin = /[a-z]/.test(q) && library ? Object.keys(library).filter((name) => name.includes(q.replace(/\s+/g, '-'))) : [];
    return { library, names: [...new Set([...arabic, ...latin])].slice(0, limit) };
  }, [query, library, limit]);
}

import { useEffect, useMemo, useState } from 'react';

/** Featured icons with Arabic keywords, shown before searching and matched by Arabic queries. */
export const FEATURED_ICONS = [
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
];

let namesPromise = null;
const loadLibrary = () => {
  if (!namesPromise) namesPromise = import('./iconLibrary.js').then((m) => m.ICON_NODES);
  return namesPromise;
};

export async function loadIconNodes(name) {
  const library = await loadLibrary();
  return library[name] || null;
}

/** Icon names for a query: Arabic keywords match the featured list, Latin queries the full set. */
export function useIconSearch(query, limit = 60) {
  const [library, setLibrary] = useState(null);
  useEffect(() => {
    let alive = true;
    loadLibrary().then((lib) => { if (alive) setLibrary(lib); });
    return () => { alive = false; };
  }, []);
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { library, names: FEATURED_ICONS.map(([name]) => name) };
    const arabic = FEATURED_ICONS.filter(([name, keywords]) => keywords.includes(q) || name.includes(q)).map(([name]) => name);
    const latin = /[a-z]/.test(q) && library ? Object.keys(library).filter((name) => name.includes(q.replace(/\s+/g, '-'))) : [];
    return { library, names: [...new Set([...arabic, ...latin])].slice(0, limit) };
  }, [query, library, limit]);
}

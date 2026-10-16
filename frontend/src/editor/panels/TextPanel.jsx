import { createElement } from '@shared/model/index.js';
import { DraggableTile } from '../dnd/EditorDnd';

const GREEN = '#0F6B52';
const GOLD = '#9A7130';
const INK = '#1B2A23';

const text = (value, style = {}) => createElement('text', { text: value, width: 560, fontFamily: 'Amiri-Regular', fill: INK, align: 'center', ...style });

const STYLES = [
  { id: 'heading', label: 'عنوان رئيسي', className: 'text-xl font-bold', make: () => text('عنوان رئيسي', { fontSize: 56, fontFamily: 'Cairo-Bold', fill: GREEN }) },
  { id: 'subheading', label: 'عنوان فرعي', className: 'text-md font-semibold', make: () => text('عنوان فرعي', { fontSize: 34, fontFamily: 'Cairo-SemiBold', fill: INK }) },
  { id: 'body', label: 'نص الفقرة', className: 'text-sm', make: () => text('اكتب هنا نص الشهادة…', { fontSize: 24, fontFamily: 'Amiri-Regular', lineHeight: 1.7 }) },
  { id: 'caption', label: 'نص صغير', className: 'text-xs text-fg-muted', make: () => text('نص توضيحي صغير', { fontSize: 18, fontFamily: 'Cairo-Regular', fill: '#5F6D65' }) },
];

/** Ready combinations: several texts placed together and grouped. */
function combo(parts, gap = 12) {
  return () => {
    const groupId = `grp_${Math.random().toString(36).slice(2, 10)}`;
    let y = 0;
    return parts.map(([value, style]) => {
      const element = text(value, { ...style, groupId, y });
      y += (style.fontSize || 28) * (style.lineHeight || 1.4) + gap;
      return element;
    });
  };
}

const COMBOS = [
  {
    id: 'thanks',
    title: 'شهادة شكر وتقدير',
    sub: 'تُمنح هذه الشهادة إلى',
    make: combo([
      ['شهادة شكر وتقدير', { fontSize: 60, fontFamily: 'Rakkas-Regular', fill: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#9A7130' }, { offset: 0.5, color: '#D6B066' }, { offset: 1, color: '#9A7130' }] } }],
      ['تُمنح هذه الشهادة إلى', { fontSize: 28, fontFamily: 'Amiri-Regular' }],
    ]),
  },
  {
    id: 'achievement',
    title: 'شهادة إنجاز قرآنية',
    sub: 'تبارك مؤسسة دار الإتقان العالي',
    make: combo([
      ['شهادة إنجاز قرآنية', { fontSize: 56, fontFamily: 'Cairo-Black', fill: GREEN }],
      ['تبارك مؤسسة دار الإتقان العالي', { fontSize: 30, fontFamily: 'Cairo-SemiBold', fill: '#5F776F' }],
    ]),
  },
  {
    id: 'blessing-m',
    title: 'بارك الله فيه',
    sub: 'ونفع به الإسلام والمسلمين',
    make: combo([
      ['بارك الله فيه ونفع به الإسلام والمسلمين', { fontSize: 30, fontFamily: 'Amiri-Regular', fill: GOLD }],
    ]),
  },
  {
    id: 'blessing-f',
    title: 'بارك الله فيها',
    sub: 'ونفع بها الإسلام والمسلمين',
    make: combo([
      ['بارك الله فيها ونفع بها الإسلام والمسلمين', { fontSize: 30, fontFamily: 'Amiri-Regular', fill: GOLD }],
    ]),
  },
  {
    id: 'signatures',
    title: 'التوقيعات',
    sub: 'المعلم · المشرف · الإدارة',
    make: () => {
      const groupId = `grp_${Math.random().toString(36).slice(2, 10)}`;
      return ['اعتماد المعلّم/ة', 'اعتماد المشرف/ة', 'اعتماد الإدارة'].map((label, index) => text(label, { groupId, width: 240, x: (2 - index) * 270, y: 0, fontSize: 24, fontFamily: 'Cairo-Regular', fill: '#5F6D65' }));
    },
  },
];

const PHRASES = [
  '﴿ وَقُلْ رَبِّ زِدْنِي عِلْمًا ﴾',
  '﴿ إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ ﴾',
  '﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾',
  '«خيركم من تعلّم القرآن وعلّمه»',
  '«اقرؤوا القرآن فإنه يأتي يوم القيامة شفيعًا لأصحابه»',
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  'اللهم اجعل القرآن ربيع قلبه ونور صدره',
  'اللهم اجعلها من أهل القرآن الذين هم أهلك وخاصتك',
  'نسأل الله لك التوفيق والسداد',
  'هنيئًا لك الأجر والثواب',
];

const tile = 'flex w-full flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface-2 px-3 py-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm';

export default function TextPanel({ query }) {
  const match = (value) => !query || value.includes(query);
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-fg-subtle">أنماط النص</h3>
        {STYLES.filter((style) => match(style.label)).map((style) => (
          <DraggableTile key={style.id} id={`text-${style.id}`} testId={`text-${style.id}`} label={style.label} payload={{ make: style.make, preview: <span className={style.className}>{style.label}</span> }} className={tile}>
            <span className={style.className}>{style.label}</span>
          </DraggableTile>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-fg-subtle">مجموعات جاهزة</h3>
        {COMBOS.filter((item) => match(item.title) || match(item.sub)).map((item) => (
          <DraggableTile key={item.id} id={`combo-${item.id}`} label={item.title} payload={{ make: item.make, preview: <span className="text-sm font-bold text-primary">{item.title}</span> }} className={tile}>
            <span className="text-md font-bold text-primary">{item.title}</span>
            <span className="text-xs text-fg-muted">{item.sub}</span>
          </DraggableTile>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-fg-subtle">آيات وأحاديث وأدعية</h3>
        {PHRASES.filter(match).map((phrase) => (
          <DraggableTile key={phrase} id={`phrase-${phrase}`} label={phrase} payload={{ make: () => text(phrase, { fontSize: 30, fill: GOLD, width: 640 }), preview: <span className="text-xs">{phrase}</span> }} className={tile}>
            <span className="font-[Amiri,serif] text-sm leading-relaxed text-gold-600">{phrase}</span>
          </DraggableTile>
        ))}
      </section>
    </div>
  );
}

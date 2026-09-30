import { createElement } from '@shared/model/index.js';

export {
  cloneElement,
  createElement,
  isImageElement,
  isTextElement,
  migrateTemplate,
} from '@shared/model/index.js';

export const ELEMENT_LABELS = {
  text: 'نص ثابت',
  dynamicText: 'نص ديناميكي',
  rect: 'مستطيل',
  circle: 'دائرة',
  line: 'خط',
  dynamicImage: 'صورة ديناميكية',
  image: 'صورة',
};

export const DYNAMIC_TEXT_FIELDS = [
  { value: 'recipientAchievementSentence', label: 'جملة التهنئة' },
  { value: 'recipientTitle', label: 'اللقب التلقائي' },
  { value: 'studentName', label: 'اسم الطالب' },
  { value: 'date', label: 'التاريخ الهجري' },
  { value: 'dateLabel', label: 'تاريخ الإصدار (هجري)' },
  { value: 'issueDate', label: 'تاريخ الإصدار' },
  { value: 'issueDateLabel', label: 'سطر تاريخ الإصدار' },
  { value: 'recitalType', label: 'نوع الاستظهار' },
  { value: 'surahRange', label: 'نص السور (من إلى)' },
  { value: 'programName', label: 'اسم البرنامج' },
  { value: 'calendar', label: 'التقويم' },
  { value: 'mistakesCount', label: 'عدد الأخطاء' },
  { value: 'teacherName', label: 'المعلم' },
  { value: 'schoolName', label: 'اسم المدرسة' },
];

export const DYNAMIC_IMAGE_FIELDS = [
  { value: 'logo', label: 'الشعار' },
  { value: 'signature', label: 'التوقيع' },
  { value: 'stamp', label: 'الختم' },
];

/** Create an element centred on a document-space point. */
export function createElementAt(type, point, extra = {}) {
  const element = createElement(type, extra);
  const width = Number(element.width) || 0;
  const height = Number(element.height) || 0;
  return {
    ...element,
    x: Math.round((point?.x ?? 200) - (type === 'line' ? width / 2 : 0)),
    y: Math.round((point?.y ?? 200) - (type === 'line' ? 0 : height / 2)),
  };
}

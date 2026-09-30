import { buildFieldValues } from '@shared/model/index.js';
import {
  getRecipientAchievementSentenceForTemplate,
  getRecipientTitleForTemplate,
} from '../../utils/templateMetadata';

/**
 * Sample recipient shown in the editor. "Preview PDF" sends this same student, so the preview
 * prints exactly what the canvas shows.
 */
export const SAMPLE_STUDENT = Object.freeze({
  name: 'اسم الطالب',
  recitalType: 'نوع الاستظهار',
  surahRange: 'من سورة إلى سورة',
  programName: 'اسم البرنامج',
  calendar: 'التقويم',
  mistakesCount: 'عدد الأخطاء',
  teacherName: 'المعلم',
});

const RECIPIENT = {
  title: getRecipientTitleForTemplate,
  sentence: getRecipientAchievementSentenceForTemplate,
};

export function buildPreviewValues(template, branding, student = SAMPLE_STUDENT) {
  return buildFieldValues(student, branding || {}, template, RECIPIENT);
}

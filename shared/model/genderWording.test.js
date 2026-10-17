import { describe, expect, it } from 'vitest';
import { renderTextTemplate } from '../render/scene.js';
import { buildFieldValues } from './fields.js';
import { getRecipientAchievementSentenceForTemplate, getRecipientTitleForTemplate } from './templateMetadata.js';

const recipient = { title: getRecipientTitleForTemplate, sentence: getRecipientAchievementSentenceForTemplate };
const values = (name, audienceType, gender) => buildFieldValues({ name, gender }, {}, { audienceType }, recipient);

describe('gender and audience wording', () => {
  it('titles follow audience and gender', () => {
    expect(values('محمد سعيد', 'student').recipientTitle).toBe('الطالب');
    expect(values('فاطمة علي الكثيرية', 'student').recipientTitle).toBe('الطالبة');
    expect(values('محمد سعيد', 'adult').recipientTitle).toBe('الدارس');
    expect(values('فاطمة علي الكثيرية', 'adult').recipientTitle).toBe('الدارسة');
    expect(values('مريم أحمد', 'adult', 'female').recipientAchievementSentence).toContain('بنجاح الدارسة');
  });

  it('{{male|female}} picks by gender, with an explicit gender winning over the name', () => {
    const text = 'إلى {{recipientTitle}} {{المتميّز|المتميّزة}}';
    expect(renderTextTemplate(text, values('محمد سعيد', 'student'), null)).toBe('إلى الطالب المتميّز');
    expect(renderTextTemplate(text, values('فاطمة الكثيرية', 'student'), null)).toBe('إلى الطالبة المتميّزة');
    expect(renderTextTemplate(text, values('مريم أحمد', 'student', 'female'), null)).toBe('إلى الطالبة المتميّزة');
  });

  it('four forms pick by audience and gender', () => {
    const text = '{{الطالب|الطالبة|الدارس|الدارسة}}';
    expect(renderTextTemplate(text, values('مريم أحمد', 'adult', 'female'), null)).toBe('الدارسة');
    expect(renderTextTemplate(text, values('خالد', 'adult'), null)).toBe('الدارس');
    expect(renderTextTemplate(text, values('خالد', 'student'), null)).toBe('الطالب');
  });
});

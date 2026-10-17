import { describe, expect, it } from 'vitest';
import { autoMapHeaders, normalizeAudience, normalizeStudent, rowToStudent } from './studentFields.js';

describe('student group column', () => {
  it('maps a «الفئة» column and reads its words', () => {
    const mapping = autoMapHeaders(['الاسم', 'الفئة']);
    expect(mapping['الفئة']).toBe('audienceType');
    expect(rowToStudent({ الاسم: 'مريم أحمد', الفئة: 'دارسة' }, mapping)).toEqual({ name: 'مريم أحمد', audienceType: 'adult', gender: 'female' });
    expect(rowToStudent({ الاسم: 'علي', الفئة: 'طالب' }, mapping)).toEqual({ name: 'علي', audienceType: 'student', gender: 'male' });
    expect(rowToStudent({ الاسم: 'علي', الفئة: 'غير ذلك' }, mapping)).toEqual({ name: 'علي' });
  });

  it('normalizes the group on saved students and lets it be cleared', () => {
    expect(normalizeAudience('الدارسين')).toBe('adult');
    expect(normalizeStudent({ name: 'سعاد', audienceType: 'adult' })).toMatchObject({ audienceType: 'adult' });
    expect(normalizeStudent({ name: 'سعاد', الفئة: 'دارسة' })).toMatchObject({ audienceType: 'adult', gender: 'female' });
    expect(normalizeStudent({ audienceType: '' }, { name: 'سعاد', audienceType: 'adult' }).audienceType).toBeUndefined();
    expect(normalizeStudent({ name: 'سعاد', gender: 'male', الفئة: 'دارسة' }).gender).toBe('male');
  });
});

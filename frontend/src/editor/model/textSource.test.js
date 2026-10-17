import { describe, expect, it } from 'vitest';
import { buildFieldValues, getRecipientAchievementSentenceForTemplate, getRecipientTitleForTemplate } from '@shared/model/index.js';
import { renderTextTemplate } from '@shared/render/scene.js';
import { FIELD_EXPANSIONS, editableText } from './textSource';
import { fromDisplayTemplate, toDisplayTemplate } from './fieldTokens';

const recipient = { title: getRecipientTitleForTemplate, sentence: getRecipientAchievementSentenceForTemplate };

describe('editable composed fields', () => {
  it('each expansion prints exactly what its field prints', () => {
    for (const branding of [{}, { schoolName: 'دار النور' }]) {
      for (const audienceType of ['student', 'adult']) {
        for (const name of ['محمد سعيد', 'فاطمة الكثيرية']) {
          const values = buildFieldValues({ name }, branding, { audienceType }, recipient);
          for (const [field, expansion] of Object.entries(FIELD_EXPANSIONS)) {
            expect(renderTextTemplate(expansion, values, field)).toBe(values[field]);
          }
        }
      }
    }
  });

  it('opens the congratulation sentence as words with fields', () => {
    expect(editableText({ type: 'dynamicText', field: 'recipientAchievementSentence' }).value).toContain('بنجاح {{recipientTitle}}');
    expect(editableText({ type: 'dynamicText', field: 'studentName' }).value).toBe('{{studentName}}');
  });

  it('keeps {{male|female}} wording intact through the display round trip', () => {
    const text = '{{استمر يا بطل|استمري يا بطلة}} {{studentName}}';
    expect(fromDisplayTemplate(toDisplayTemplate(text))).toBe(text);
  });
});

/**
 * Composed fields opened as the words they print, so they can be reworded or re-broken across
 * lines. Each expansion renders exactly like the field it replaces (same gender/audience title).
 */
export const FIELD_EXPANSIONS = {
  recipientAchievementSentence: 'تبارك مؤسسة {{schoolName}}\nبنجاح {{recipientTitle}} :',
  dateLabel: 'تاريخ الإصدار: {{issueDate}}',
  issueDateLabel: 'تاريخ الإصدار: {{issueDate}}',
};

/** The editable source of a text element: its text, or its field template for bound text. */
export function editableText(element) {
  if (element.type === 'text') return { key: 'text', value: String(element.text ?? '') };
  if (element.type === 'dateField') return { key: 'dynamicTextTemplate', value: element.dynamicTextTemplate || '{{value}}' };
  const field = element.field || 'studentName';
  return { key: 'dynamicTextTemplate', value: element.dynamicTextTemplate || FIELD_EXPANSIONS[field] || `{{${field}}}` };
}


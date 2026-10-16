/** The editable source of a text element: its text, or its field template for bound text. */
export function editableText(element) {
  if (element.type === 'text') return { key: 'text', value: String(element.text ?? '') };
  if (element.type === 'dateField') return { key: 'dynamicTextTemplate', value: element.dynamicTextTemplate || '{{value}}' };
  return { key: 'dynamicTextTemplate', value: element.dynamicTextTemplate || `{{${element.field || 'studentName'}}}` };
}


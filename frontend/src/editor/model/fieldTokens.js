import { FIELD_LABELS } from '../../strings.ar';

/**
 * Templates store field placeholders by key ({{studentName}}); teachers see and type them by their
 * Arabic label ({{اسم الطالب}}). Unknown tokens (custom spreadsheet columns, already Arabic) pass through.
 */
const LABEL_TO_KEY = new Map(Object.entries(FIELD_LABELS).map(([key, label]) => [label, key]));
LABEL_TO_KEY.set('القيمة', 'value');

export function toDisplayTemplate(text) {
  return String(text ?? '').replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, token) => {
    if (token === 'value') return '{{القيمة}}';
    return FIELD_LABELS[token] ? `{{${FIELD_LABELS[token]}}}` : match;
  });
}

export function fromDisplayTemplate(text) {
  return String(text ?? '').replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, token) => {
    // {{مذكر|مؤنث}} wording is not a field; keep it as typed.
    if (token.includes('|')) return match;
    const key = LABEL_TO_KEY.get(token.trim());
    return key ? `{{${key}}}` : `{{${token.trim().replace(/\s+/g, '_')}}}`;
  });
}

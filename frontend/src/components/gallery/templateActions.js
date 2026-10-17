import { createTemplate, fetchTemplate, removeTemplate, updateTemplate } from '../../api/client';
import { buildStarter } from '@shared/templates/index.js';

/** Template library operations shared by the dashboard, the new-template page and the editor. */
export async function createFromStarter(starterId, paletteKey) {
  return createTemplate(buildStarter(starterId, paletteKey));
}

export async function duplicateTemplate(template, name) {
  const full = template.elements ? template : await fetchTemplate(template.id);
  const { id: _id, version: _v, availableBackgroundVariants: _a, createdAt: _c, updatedAt: _u, favorite: _f, ...rest } = full;
  return createTemplate({ ...rest, name: name || `${full.name} (نسخة)` });
}

export const renameTemplate = (template, name) => updateTemplate(template.id, { name });
export const setFavorite = (template, favorite) => updateTemplate(template.id, { favorite });
export const deleteTemplate = (template) => removeTemplate(template.id);

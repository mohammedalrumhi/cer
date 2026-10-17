/** Apply a managed background colour variant (same rule as backend/src/utils/templateVariants.js). */
export function withVariant(template, variantKey) {
  const variant = template?.availableBackgroundVariants?.find((item) => item.key === variantKey);
  if (!template || !variant) return template;
  return {
    ...template,
    background: { ...template.background, type: 'image', color: variant.color, accentColor: variant.accentColor, imagePath: variant.imagePath, customLayout: true },
  };
}

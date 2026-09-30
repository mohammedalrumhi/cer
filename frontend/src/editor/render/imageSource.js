import { buildAssetUrl } from '../../api/client';

// Same defaults the PDF renderer uses when branding assets are missing.
const DEFAULT_BRANDING_ASSETS = {
  logo: '/assets/logo.png',
  signature: '/assets/signture.png',
  stamp: '/assets/stamp.png',
};

export function imageSourceUrl(source, branding) {
  if (!source?.value) return '';
  if (source.type === 'field') {
    const key = `${source.value}Path`;
    return branding?.[key] ? buildAssetUrl(branding[key]) : DEFAULT_BRANDING_ASSETS[source.value] || '';
  }
  return buildAssetUrl(source.value);
}

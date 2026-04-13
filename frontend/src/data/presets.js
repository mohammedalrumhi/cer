export const colorThemes = [
  { id: 'theme-1', label: 'ذهبي هادئ', color: '#f8f4ea', accentColor: '#0f4a3c' },
  { id: 'theme-2', label: 'أبيض ونخبة', color: '#fbfaf7', accentColor: '#1f5f4b' },
  { id: 'theme-3', label: 'بيج ملكي', color: '#f2ecdd', accentColor: '#6f4e1f' },
];

export const defaultTemplatePayload = {
  name: 'قالب جديد',
  orientation: 'landscape',
  width: 1123,
  height: 794,
  background: {
    type: 'solid',
    color: '#f8f4ea',
    accentColor: '#0f4a3c',
  },
  elements: [
    {
      id: 'name-dynamic',
      type: 'dynamicText',
      field: 'studentName',
      x: 560,
      y: 360,
      width: 900,
      fontSize: 48,
      fontFamily: 'Amiri',
      fontWeight: '700',
      fill: '#0f4a3c',
      align: 'center',
    },
  ],
};

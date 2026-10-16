// A template that uses every studio element type and effect, so the fidelity suite covers them.
const award = [
  'm15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526',
  'M18 8A6 6 0 1 1 6 8a6 6 0 0 1 12 0Z',
];
const gold = { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#9a7130' }, { offset: 0.5, color: '#e6c77b' }, { offset: 1, color: '#9a7130' }] };

export const studioElementsTemplate = {
  name: 'اختبار عناصر الاستوديو',
  schemaVersion: 3,
  orientation: 'landscape',
  width: 1123,
  height: 794,
  digits: 'arabic',
  page: { margins: { top: 40, right: 40, bottom: 40, left: 40 }, bleed: 0 },
  background: { type: 'solid', color: '#fbf8f1', fill: { type: 'radial', stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#efe6d2' }] }, customLayout: true },
  elements: [
    { id: 'frame-orn', type: 'ornament', ornament: 'frame-ornate', x: 20, y: 20, width: 1083, height: 754, color: '#0f6b52', accentColor: '#b8893c', strokeWidth: 2 },
    { id: 'corner', type: 'ornament', ornament: 'corner-classic', x: 60, y: 60, width: 120, height: 120, color: '#b8893c', accentColor: '#0f6b52' },
    { id: 'border', type: 'ornament', ornament: 'border-stars', x: 200, y: 92, width: 720, height: 24, color: '#b8893c', accentColor: '#0f6b52' },
    { id: 'rosette', type: 'ornament', ornament: 'rosette12', x: 960, y: 60, width: 100, height: 100, color: '#0f6b52', accentColor: '#d6b066' },
    { id: 'laurel', type: 'ornament', ornament: 'laurel', x: 470, y: 520, width: 180, height: 150, color: '#0f6b52', strokeWidth: 2 },
    { id: 'divider', type: 'ornament', ornament: 'divider-flourish', x: 360, y: 300, width: 400, height: 30, color: '#b8893c', accentColor: '#0f6b52' },
    { id: 'title', type: 'text', text: 'شهادة شكر وتقدير', x: 262, y: 140, width: 600, fontSize: 64, fontFamily: 'Rakkas-Regular', fill: gold, align: 'center', effects: { shadow: { color: '#000000', opacity: 0.3, blur: 6, offsetX: 3, offsetY: 4 }, outline: { color: '#ffffff', width: 2 }, highlight: null } },
    { id: 'highlighted', type: 'text', text: 'تُمنح هذه الشهادة إلى', x: 362, y: 240, width: 400, fontSize: 28, fontFamily: 'Amiri-Regular', fill: '#1b2a23', align: 'center', effects: { shadow: null, outline: null, highlight: { color: '#f2e3c2', padding: 10, radius: 8, opacity: 1 } } },
    { id: 'kashida', type: 'dynamicText', field: 'studentName', x: 262, y: 340, width: 600, fontSize: 46, fontFamily: 'Amiri-Regular', fontStyle: 'bold', fill: '#0f6b52', align: 'center', kashida: 2, textDecoration: 'underline' },
    { id: 'justify', type: 'text', text: 'بارك الله فيه وجعله من أهل القرآن الذين هم أهل الله وخاصته، ونفع به الإسلام والمسلمين في كل مكان وزمان.', x: 262, y: 420, width: 600, fontSize: 22, fontFamily: 'Amiri-Regular', fill: '#3a4a43', align: 'justify', lineHeight: 1.6 },
    { id: 'strike', type: 'text', text: 'نص ١٢٣ مشطوب 456', x: 80, y: 700, width: 260, height: 70, verticalAlign: 'middle', fontSize: 20, fontFamily: 'Cairo-Regular', fill: '#c0392b', align: 'right', textDecoration: 'line-through' },
    { id: 'date', type: 'dateField', x: 760, y: 700, width: 300, fontSize: 20, fontFamily: 'Amiri-Regular', fill: '#1b2a23', align: 'center', date: { calendar: 'gregorian', style: 'long', source: 'issue' }, dynamicTextTemplate: 'حرر في {{value}}' },
    { id: 'poly', type: 'polygon', sides: 6, x: 90, y: 300, width: 90, height: 80, fill: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#0f6b52' }, { offset: 1, color: '#2fa37f' }] }, stroke: '#b8893c', strokeWidth: 3, cornerRadius: 6 },
    { id: 'star', type: 'star', points: 12, innerRadius: 0.8, x: 90, y: 400, width: 90, height: 90, fill: '#b8893c', stroke: null, strokeWidth: 0, rotation: 12 },
    { id: 'ribbon', type: 'shape', shape: 'ribbon', x: 60, y: 520, width: 260, height: 60, fill: '#0f6b52', stroke: '#b8893c', strokeWidth: 2, dash: [4, 2] },
    { id: 'arrow', type: 'line', x: 60, y: 620, width: 240, stroke: '#1b2a23', strokeWidth: 3, startHead: 'circle', endHead: 'triangle', dash: [6, 3], lineCap: 'round' },
    { id: 'icon', type: 'icon', iconName: 'award', paths: award, x: 990, y: 300, width: 80, height: 80, color: '#b8893c', strokeWidth: 2 },
    { id: 'qr', type: 'qrcode', value: '{{verifyUrl}}', x: 960, y: 420, width: 120, height: 120, color: '#0f6b52', background: '#ffffff' },
    { id: 'barcode', type: 'barcode', value: '{{serial}}', x: 760, y: 590, width: 300, height: 90, color: '#111111', background: null, showText: true },
    { id: 'framed', type: 'frame', shape: 'circle', src: 'uploads/itqan-logo.png', x: 820, y: 200, width: 110, height: 110, fit: 'cover', crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, flipX: true, filters: { brightness: 0.05, contrast: 0.2, saturation: -0.4, blur: 0, grayscale: false }, border: { color: '#b8893c', width: 3 } },
    { id: 'rounded-img', type: 'image', src: 'uploads/itqan-stamp.png', x: 200, y: 190, width: 90, height: 90, fit: 'contain', cornerRadius: 16, border: { color: '#0f6b52', width: 2 }, opacity: 0.85 },
  ],
};

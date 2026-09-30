/**
 * Font registry shared by the editor and the PDF renderer, so both resolve
 * `{ fontFamily, fontStyle }` to the *same font file* and the same synthetic styling.
 *
 * Templates store either a file basename (`Cairo-Bold`, `Amiri-Regular`, `janna_LT_bold`) or a
 * family name (`Cairo`, `Amiri`). Both are supported.
 */

export const DEFAULT_FONT_KEY = 'Amiri-Regular';
/** Tried, in order, for characters the chosen font cannot display. */
export const FALLBACK_FONT_KEYS = ['Amiri-Regular', 'Cairo-Regular', 'Alexandria-Regular'];

const WEIGHT_WORDS = [
  [/^(thin|hairline)$/, 100],
  [/^(extra|ultra)light$/, 200],
  [/^light$/, 300],
  [/^(regular|normal|book|roman|free|std)$/, 400],
  [/^medium$/, 500],
  [/^(semi|demi)bold$/, 600],
  [/^bold$/, 700],
  [/^(extra|ultra)bold$/, 800],
  [/^(black|heavy)$/, 900],
];

function parseStyleToken(token) {
  const clean = String(token || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return null;
  const italic = clean.endsWith('italic') || clean.endsWith('oblique');
  const base = clean.replace(/(italic|oblique)$/, '') || 'regular';
  for (const [pattern, weight] of WEIGHT_WORDS) {
    if (pattern.test(base)) return { weight, italic };
  }
  return null;
}

function normalizeToken(value) {
  return String(value || '').toLowerCase().replace(/\.(ttf|otf)$/i, '').replace(/[^a-z0-9؀-ۿ]+/g, '');
}

/**
 * Describe one font file: `Cairo-SemiBold.ttf` → { key: 'Cairo-SemiBold', family: 'Cairo', weight: 600 }.
 * @param {string} fileName
 */
export function describeFontFile(fileName) {
  const key = String(fileName).replace(/\.(ttf|otf)$/i, '');
  const variable = /variablefont|\[wght/i.test(key);

  if (variable) {
    return { key, family: key.split(/-VariableFont|\[/i)[0], weight: 400, italic: false, variable: true };
  }

  for (const separator of ['-', '_']) {
    const index = key.lastIndexOf(separator);
    if (index > 0) {
      const style = parseStyleToken(key.slice(index + 1));
      if (style) return { key, family: key.slice(0, index), ...style, variable: false };
    }
  }
  return { key, family: key, weight: 400, italic: false, variable: false };
}

/**
 * @param {Array<string | { fileName: string }>} files
 */
export function createFontRegistry(files) {
  const faces = files
    .map((file) => describeFontFile(typeof file === 'string' ? file : file.fileName || file.value))
    .sort((a, b) => a.key.localeCompare(b.key));
  const byKey = new Map(faces.map((face) => [face.key, face]));
  const byNormalizedKey = new Map(faces.map((face) => [normalizeToken(face.key), face]));

  function familyFaces(family) {
    const wanted = normalizeToken(family);
    return faces.filter((face) => normalizeToken(face.family) === wanted && !face.variable);
  }

  /** CSS-style weight matching: prefer the exact weight, then heavier for bold / lighter for normal. */
  function pickByWeight(candidates, weight, italic) {
    const sameSlope = candidates.filter((face) => face.italic === italic);
    const pool = sameSlope.length ? sameSlope : candidates;
    return [...pool].sort((a, b) => {
      const da = Math.abs(a.weight - weight) + (weight >= 600 ? (a.weight < weight ? 50 : 0) : (a.weight > weight ? 50 : 0));
      const db = Math.abs(b.weight - weight) + (weight >= 600 ? (b.weight < weight ? 50 : 0) : (b.weight > weight ? 50 : 0));
      return da - db;
    })[0];
  }

  /**
   * @param {string} fontFamily
   * @param {string} [fontStyle] 'normal' | 'bold' | 'italic' | 'bold italic'
   * @returns {{ key: string, syntheticBold: boolean, syntheticItalic: boolean }}
   */
  function resolve(fontFamily, fontStyle = 'normal') {
    const style = String(fontStyle || '').toLowerCase();
    const wantBold = style.includes('bold');
    const wantItalic = style.includes('italic') || style.includes('oblique');
    const targetWeight = wantBold ? 700 : 400;

    let face = byKey.get(fontFamily) || null;
    if (face) {
      // An explicit file was chosen; upgrade to a real bold/italic sibling when one exists.
      if ((wantBold && face.weight < 600) || (wantItalic && !face.italic)) {
        const sibling = pickByWeight(familyFaces(face.family), wantBold ? targetWeight : face.weight, wantItalic);
        if (sibling && (!wantBold || sibling.weight >= 600)) face = sibling;
      }
    } else {
      const candidates = familyFaces(fontFamily);
      face = candidates.length
        ? pickByWeight(candidates, targetWeight, wantItalic)
        : byNormalizedKey.get(normalizeToken(fontFamily)) || null;
    }

    if (!face) face = byKey.get(DEFAULT_FONT_KEY) || faces[0] || { key: DEFAULT_FONT_KEY, weight: 400, italic: false };

    return {
      key: face.key,
      syntheticBold: wantBold && face.weight < 600,
      syntheticItalic: wantItalic && !face.italic,
    };
  }

  return {
    faces,
    has: (key) => byKey.has(key),
    resolve,
    /** Keys of the fallback chain that actually exist, for glyph fallback. */
    fallbackKeys: () => FALLBACK_FONT_KEYS.filter((key) => byKey.has(key)),
  };
}

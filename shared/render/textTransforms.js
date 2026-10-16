import { joiningType } from './arabicJoining.js';

/**
 * Text transforms applied before layout, identically in the editor and the PDF.
 */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/**
 * Digits on certificates: 'arabic' → ٠١٢٣…, 'latin' → 0123…, 'keep' → as typed.
 * @param {string} text
 * @param {'arabic'|'latin'|'keep'} mode
 */
export function convertDigits(text, mode = 'keep') {
  const value = String(text ?? '');
  if (mode === 'arabic') return value.replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]).replace(/[۰-۹]/g, (d) => ARABIC_INDIC[d.charCodeAt(0) - 0x06f0]);
  if (mode === 'latin') {
    return value
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  }
  return value;
}

const TATWEEL = 'ـ';

/**
 * Kashida (tatweel) stretching: Arabic justification lengthens letter joins instead of adding
 * letter-spacing (which breaks the cursive joins). For every word of three or more letters, `level`
 * tatweels go into the last join before the final letter — the classic position in naskh (بسم → بسـم).
 * @param {string} text
 * @param {number} level 0 (off) … 4
 */
export function applyKashida(text, level = 0) {
  const count = Math.max(0, Math.min(4, Math.round(Number(level) || 0)));
  const value = String(text ?? '');
  if (!count) return value;
  return value.replace(/[ؠ-ي٠-ۿً-ٰٟ]+/g, (word) => {
    // Base letters with their index (marks stay attached to the letter before them).
    const bases = [];
    for (let i = 0; i < word.length; i += 1) {
      const type = joiningType(word.codePointAt(i));
      if (type !== 'T') bases.push({ index: i, type });
    }
    if (bases.length < 3 || word.includes(TATWEEL)) return word;
    for (let b = bases.length - 2; b >= 0; b -= 1) {
      const cur = bases[b];
      const next = bases[b + 1];
      const joins = (cur.type === 'D' || cur.type === 'C') && (next.type === 'D' || next.type === 'R');
      if (!joins) continue;
      // Insert after the letter and its marks, i.e. right before the next base letter.
      return word.slice(0, next.index) + TATWEEL.repeat(count) + word.slice(next.index);
    }
    return word;
  });
}

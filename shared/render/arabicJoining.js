/**
 * Unicode Arabic joining types (subset of ArabicShaping.txt covering Arabic, Arabic Supplement
 * and the common Extended-A letters). Used to keep letter-spacing from breaking cursive joins.
 *   D dual-joining · R right-joining · C join-causing · T transparent · U non-joining
 */
const RANGES = [
  [0x0621, 0x0621, 'U'], [0x0622, 0x0625, 'R'], [0x0626, 0x0626, 'D'], [0x0627, 0x0627, 'R'],
  [0x0628, 0x0628, 'D'], [0x0629, 0x0629, 'R'], [0x062a, 0x062e, 'D'], [0x062f, 0x0632, 'R'],
  [0x0633, 0x063f, 'D'], [0x0640, 0x0640, 'C'], [0x0641, 0x0647, 'D'], [0x0648, 0x0648, 'R'],
  [0x0649, 0x064a, 'D'], [0x064b, 0x065f, 'T'], [0x066e, 0x066f, 'D'], [0x0670, 0x0670, 'T'],
  [0x0671, 0x0673, 'R'], [0x0674, 0x0674, 'U'], [0x0675, 0x0677, 'R'], [0x0678, 0x0687, 'D'],
  [0x0688, 0x0699, 'R'], [0x069a, 0x06bf, 'D'], [0x06c0, 0x06c0, 'R'], [0x06c1, 0x06c2, 'D'],
  [0x06c3, 0x06cb, 'R'], [0x06cc, 0x06cc, 'D'], [0x06cd, 0x06cd, 'R'], [0x06ce, 0x06ce, 'D'],
  [0x06cf, 0x06cf, 'R'], [0x06d0, 0x06d1, 'D'], [0x06d2, 0x06d3, 'R'], [0x06d5, 0x06d5, 'R'],
  [0x06d6, 0x06dc, 'T'], [0x06df, 0x06e4, 'T'], [0x06e7, 0x06e8, 'T'], [0x06ea, 0x06ed, 'T'],
  [0x06ee, 0x06ef, 'R'], [0x06fa, 0x06fc, 'D'], [0x06ff, 0x06ff, 'D'],
  [0x0750, 0x0758, 'D'], [0x0759, 0x075b, 'R'], [0x075c, 0x076a, 'D'], [0x076b, 0x076c, 'R'],
  [0x076d, 0x0770, 'D'], [0x0771, 0x0771, 'R'], [0x0772, 0x0772, 'D'], [0x0773, 0x0774, 'R'],
  [0x0775, 0x0777, 'D'], [0x0778, 0x0779, 'R'], [0x077a, 0x077f, 'D'],
  [0x08a0, 0x08a9, 'D'], [0x08aa, 0x08ac, 'R'], [0x08d3, 0x08ff, 'T'],
  [0x200c, 0x200c, 'U'], [0x200d, 0x200d, 'C'],
];

const MARK = /\p{Mn}/u;

export function joiningType(codePoint) {
  for (const [start, end, type] of RANGES) {
    if (codePoint >= start && codePoint <= end) return type;
    if (codePoint < start) break;
  }
  return MARK.test(String.fromCodePoint(codePoint)) ? 'T' : 'U';
}

/**
 * For each UTF-16 index i of a base letter, true when it is cursively joined to the next base
 * letter (so letter-spacing must not insert a gap after it). Marks are always false.
 * @param {string} text
 * @returns {boolean[]}
 */
export function joinedAfter(text) {
  const result = new Array(text.length).fill(false);
  let prevIndex = -1;
  let prevType = 'U';

  for (let i = 0; i < text.length; i += 1) {
    const code = text.codePointAt(i);
    const type = joiningType(code);
    // Transparent marks are skipped: joining is decided between base letters.
    if (type !== 'T') {
      if (prevIndex >= 0 && (prevType === 'D' || prevType === 'C') && (type === 'D' || type === 'R' || type === 'C')) {
        result[prevIndex] = true;
      }
      prevIndex = i;
      prevType = type;
    }
    if (code > 0xffff) i += 1;
  }
  return result;
}

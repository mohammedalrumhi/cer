/**
 * Code 128 barcode encoder (pure, no DOM). Uses code set C for even runs of digits and code set B
 * otherwise, which covers certificate serials. Output: bar/space module widths.
 */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const CODE_C = 99;
const STOP = 106;

export { PATTERNS as CODE128_PATTERNS };

/** Symbol values for a string (ASCII 32–126; other characters become "?"). */
export function encodeCode128(text) {
  const value = String(text ?? '').replace(/[^\x20-\x7e]/g, '?');
  const codes = [];
  let set = null;
  let i = 0;
  const digitRun = (from) => {
    let n = 0;
    while (from + n < value.length && /\d/.test(value[from + n])) n += 1;
    return n;
  };
  while (i < value.length) {
    const run = digitRun(i);
    const useC = run >= 4 || (run >= 2 && run === value.length - i && set === 'C');
    if (useC && run >= 2) {
      if (set !== 'C') {
        codes.push(set === null ? START_C : CODE_C);
        set = 'C';
      }
      const pairs = Math.floor(run / 2);
      for (let p = 0; p < pairs; p += 1) {
        codes.push(Number(value.slice(i, i + 2)));
        i += 2;
      }
      continue;
    }
    if (set !== 'B') {
      codes.push(set === null ? START_B : CODE_B);
      set = 'B';
    }
    codes.push(value.charCodeAt(i) - 32);
    i += 1;
  }
  if (codes.length === 0) codes.push(START_B);
  let checksum = codes[0];
  for (let k = 1; k < codes.length; k += 1) checksum += codes[k] * k;
  codes.push(checksum % 103, STOP);
  return codes;
}

/** Module widths alternating bar, space, bar… (quiet zones excluded). */
export function code128Modules(text) {
  const widths = [];
  for (const code of encodeCode128(text)) for (const ch of PATTERNS[code]) widths.push(Number(ch));
  widths.push(2); // termination bar
  return widths;
}

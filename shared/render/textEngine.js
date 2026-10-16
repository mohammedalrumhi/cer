import { joinedAfter } from './arabicJoining.js';

/**
 * One text layout engine for editor and PDF.
 *
 * Pipeline per text box:
 *   paragraphs (\n) → bidi levels (UAX #9, bidi-js) → font fallback per character
 *   → items (same level + font) shaped by HarfBuzz with surrounding context
 *   → per-cluster advances → optional shrink-to-fit → greedy word wrap
 *   → each line re-shaped, runs reordered visually (UAX #9 L2) → positioned glyphs.
 *
 * Output coordinates are template px relative to the element's (x, y). Glyph outlines come from
 * `glyphPath()` in font units (y up); painters draw them with `scale(s, -s)` at (x, y).
 *
 * Vertical metrics reproduce Konva's text model so existing layouts keep their positions:
 *   baseline(line n) = (ascender + descender) / 2 · s + lineHeightPx · (n + ½)
 */

const COMBINING = /[\p{M}‌‍]/u;
const BREAK_SPACE = /[ \t  -  　]/;

function codePointsWithIndex(text) {
  const result = [];
  for (let i = 0; i < text.length; i += 1) {
    const cp = text.codePointAt(i);
    result.push([i, cp]);
    if (cp > 0xffff) i += 1;
  }
  return result;
}

/**
 * @param {{ hb: typeof import('harfbuzzjs'), bidi: ReturnType<typeof import('bidi-js').default> }} deps
 */
export function createTextEngine({ hb, bidi }) {
  const fonts = new Map();

  function registerFont(key, bytes) {
    if (fonts.has(key)) return fonts.get(key);
    const face = new hb.Face(new hb.Blob(bytes));
    const font = new hb.Font(face);
    const { ascender, descender } = font.hExtents();
    const entry = { key, font, upem: face.upem, ascender, descender, coverage: new Map(), paths: new Map() };
    fonts.set(key, entry);
    return entry;
  }

  function covers(entry, cp) {
    let hit = entry.coverage.get(cp);
    if (hit === undefined) {
      hit = Boolean(entry.font.nominalGlyph(cp));
      entry.coverage.set(cp, hit);
    }
    return hit;
  }

  function glyphPath(key, gid) {
    const entry = fonts.get(key);
    if (!entry) return '';
    let path = entry.paths.get(gid);
    if (path === undefined) {
      path = entry.font.glyphToPath(gid);
      entry.paths.set(gid, path);
    }
    return path;
  }

  /** Shape text[start, end) with full-paragraph context; glyphs come back in visual order. */
  function shape(entry, text, start, end, rtl) {
    const buffer = new hb.Buffer();
    buffer.addText(text, start, end - start);
    buffer.setDirection(rtl ? hb.Direction.RTL : hb.Direction.LTR);
    buffer.guessSegmentProperties();
    hb.shape(entry.font, buffer);
    const infos = buffer.getGlyphInfos();
    const positions = buffer.getGlyphPositions();
    return infos.map((info, index) => ({
      gid: info.codepoint,
      cluster: info.cluster,
      ax: positions[index].xAdvance,
      dx: positions[index].xOffset,
      dy: positions[index].yOffset,
    }));
  }

  /** Split [start, end) of a prepared paragraph into maximal runs of equal (level, font). */
  function itemize(para, start, end) {
    const items = [];
    for (let i = start; i < end; i += 1) {
      const level = para.levels[i];
      const entry = para.fontOf[i];
      const last = items[items.length - 1];
      if (last && last.level === level && last.entry === entry && last.end === i) last.end = i + 1;
      else items.push({ start: i, end: i + 1, level, entry });
    }
    return items;
  }

  function prepareParagraph(text, primary, fallbacks, direction, letterSpacing) {
    const length = text.length;
    const embedding = length ? bidi.getEmbeddingLevels(text, direction === 'rtl' || direction === 'ltr' ? direction : undefined) : null;
    const baseLevel = embedding?.paragraphs[0]?.level ?? (direction === 'rtl' ? 1 : 0);
    const levels = embedding ? embedding.levels : new Uint8Array(0);

    const fontOf = new Array(length);
    let previous = primary;
    for (const [index, cp] of codePointsWithIndex(text)) {
      let entry = primary;
      if (COMBINING.test(String.fromCodePoint(cp))) entry = previous;
      else if (!covers(primary, cp)) entry = fallbacks.find((candidate) => covers(candidate, cp)) || primary;
      fontOf[index] = entry;
      if (cp > 0xffff) fontOf[index + 1] = entry;
      previous = entry;
    }

    const para = { text, levels, baseLevel, fontOf };
    const advanceEm = new Float64Array(length);
    const clusterStart = new Uint8Array(length);
    for (const item of itemize(para, 0, length)) {
      for (const glyph of shape(item.entry, text, item.start, item.end, item.level % 2 === 1)) {
        advanceEm[glyph.cluster] += glyph.ax / item.entry.upem;
        clusterStart[glyph.cluster] = 1;
      }
    }

    // Letter spacing goes after each cluster except where Arabic letters join, and never at the end.
    const joined = joinedAfter(text);
    const gapAfter = new Uint8Array(length);
    let lastCluster = -1;
    for (let i = 0; i < length; i += 1) {
      if (!clusterStart[i]) continue;
      if (lastCluster >= 0 && letterSpacing && !joined[lastCluster]) gapAfter[lastCluster] = 1;
      lastCluster = i;
    }

    let totalEm = 0;
    let gapCount = 0;
    for (let i = 0; i < length; i += 1) {
      totalEm += advanceEm[i];
      gapCount += gapAfter[i];
    }

    return { ...para, advanceEm, clusterStart, gapAfter, totalEm, gapCount };
  }

  function lineBreaks(para, size, maxWidth, letterSpacing) {
    const { text, advanceEm, gapAfter, clusterStart } = para;
    const n = text.length;
    const prefix = new Float64Array(n + 1);
    for (let i = 0; i < n; i += 1) prefix[i + 1] = prefix[i] + advanceEm[i] * size + gapAfter[i] * letterSpacing;
    const lastClusterBefore = (end) => {
      for (let i = end - 1; i >= 0; i -= 1) if (clusterStart[i]) return i;
      return -1;
    };
    const widthOf = (a, b) => {
      if (b <= a) return 0;
      const last = lastClusterBefore(b);
      return prefix[b] - prefix[a] - (last >= a && gapAfter[last] ? letterSpacing : 0);
    };
    const trimEnd = (a, b) => {
      let end = b;
      while (end > a && BREAK_SPACE.test(text[end - 1])) end -= 1;
      return end;
    };

    // Words: [start, end) including trailing spaces.
    const words = [];
    let wordStart = 0;
    for (let i = 0; i < n; i += 1) {
      if (BREAK_SPACE.test(text[i]) && (i + 1 === n || !BREAK_SPACE.test(text[i + 1]))) {
        words.push([wordStart, i + 1]);
        wordStart = i + 1;
      }
    }
    if (wordStart < n) words.push([wordStart, n]);
    if (words.length === 0) return [[0, 0]];

    const lines = [];
    let lineStart = 0;
    let lineEnd = 0;
    const epsilon = 0.01;

    for (const [start, end] of words) {
      const candidate = widthOf(lineStart, trimEnd(lineStart, end));
      if (lineEnd > lineStart && candidate > maxWidth + epsilon) {
        lines.push([lineStart, trimEnd(lineStart, lineEnd)]);
        lineStart = start;
      }
      lineEnd = end;

      // A single word wider than the box is broken between clusters (as Konva does).
      while (widthOf(lineStart, trimEnd(lineStart, lineEnd)) > maxWidth + epsilon) {
        let cut = lineStart;
        for (let i = lineStart + 1; i <= trimEnd(lineStart, lineEnd); i += 1) {
          if (i < n && !clusterStart[i]) continue;
          if (widthOf(lineStart, i) > maxWidth + epsilon) break;
          cut = i;
        }
        if (cut <= lineStart) break;
        lines.push([lineStart, cut]);
        lineStart = cut;
      }
    }
    lines.push([lineStart, trimEnd(lineStart, lineEnd)]);
    return lines;
  }

  function positionLine(para, start, end, size, letterSpacing) {
    const items = itemize(para, start, end);
    const runs = items.map((item) => ({ ...item, glyphs: shape(item.entry, para.text, item.start, item.end, item.level % 2 === 1) }));

    // UAX #9 rule L2: reverse runs from the highest level down to the lowest odd level.
    const levels = runs.map((run) => run.level);
    if (runs.length > 1) {
      const maxLevel = Math.max(...levels);
      const minOdd = Math.min(...levels.filter((level) => level % 2 === 1), maxLevel + 1);
      for (let level = maxLevel; level >= minOdd; level -= 1) {
        for (let i = 0; i < runs.length;) {
          if (runs[i].level >= level) {
            let j = i;
            while (j < runs.length && runs[j].level >= level) j += 1;
            runs.splice(i, j - i, ...runs.slice(i, j).reverse());
            i = j;
          } else {
            i += 1;
          }
        }
      }
    }

    const glyphs = [];
    let pen = 0;
    let previousCluster = null;
    for (const run of runs) {
      const scale = size / run.entry.upem;
      for (const glyph of run.glyphs) {
        if (previousCluster !== null && glyph.cluster !== previousCluster && letterSpacing) {
          if (para.gapAfter[Math.min(previousCluster, glyph.cluster)]) pen += letterSpacing;
        }
        glyphs.push({ key: run.entry.key, gid: glyph.gid, x: pen + glyph.dx * scale, y: -glyph.dy * scale, s: scale, c: glyph.cluster });
        pen += glyph.ax * scale;
        previousCluster = glyph.cluster;
      }
    }
    return { glyphs, width: pen };
  }

  /** Spread the free space of a line over its inter-word spaces (visual order is kept). */
  function justifyLine(para, glyphs, width, maxWidth) {
    const isSpace = (glyph) => BREAK_SPACE.test(para.text[glyph.c] || '');
    const spaces = glyphs.filter(isSpace).length;
    if (!spaces) return { glyphs, width };
    const extra = (maxWidth - width) / spaces;
    let shift = 0;
    const out = glyphs.map((glyph) => {
      const moved = shift ? { ...glyph, x: glyph.x + shift } : glyph;
      if (isSpace(glyph)) shift += extra;
      return moved;
    });
    return { glyphs: out, width: maxWidth };
  }

  /**
   * @param {object} spec
   * @param {string} spec.text
   * @param {string} spec.fontKey          registered font key (see fonts.js resolve())
   * @param {string[]} [spec.fallbackKeys] registered keys tried for missing characters
   * @param {number} spec.fontSize
   * @param {number} spec.width            box width in px (wrapping and alignment)
   * @param {'left'|'center'|'right'|'justify'} [spec.align]
   * @param {number} [spec.lineHeight]     multiple of fontSize
   * @param {number} [spec.letterSpacing]  px
   * @param {'auto'|'rtl'|'ltr'} [spec.direction]
   * @param {{ mode: 'none'|'shrink', minScale?: number, minFontSize?: number }} [spec.autoFit]
   * @param {boolean} [spec.underline]
   * @param {boolean} [spec.strike]
   */
  function layoutText(spec) {
    const primary = fonts.get(spec.fontKey);
    if (!primary) throw new Error(`Font "${spec.fontKey}" is not registered`);
    const fallbacks = (spec.fallbackKeys || []).map((key) => fonts.get(key)).filter((entry) => entry && entry !== primary);

    const text = String(spec.text ?? '').replace(/\r\n?/g, '\n');
    const fontSize = Number(spec.fontSize) || 28;
    const maxWidth = Math.max(1, Number(spec.width) || 200);
    const lineHeight = Math.max(0.5, Number(spec.lineHeight) || 1.4);
    const letterSpacing = Number(spec.letterSpacing) || 0;
    const align = spec.align || 'center';
    const direction = spec.direction || 'auto';

    const paragraphs = text.split('\n').map((p) => prepareParagraph(p, primary, fallbacks, direction, letterSpacing));

    // Shrink-to-fit: the longest paragraph, unwrapped, must fit the box (integer px steps, like v1 PDFs).
    let size = fontSize;
    const autoFit = spec.autoFit;
    if (autoFit?.mode === 'shrink') {
      const minSize = Math.min(fontSize, Math.max(autoFit.minFontSize ?? 12, Math.round(fontSize * (autoFit.minScale ?? 0.72))));
      const widest = (s) => Math.max(0, ...paragraphs.map((p) => p.totalEm * s + p.gapCount * letterSpacing));
      while (widest(size) > maxWidth && size > minSize) size = Math.max(minSize, size - 1);
    }

    const lineHeightPx = lineHeight * size;
    const scale = size / primary.upem;
    const firstBaseline = ((primary.ascender + primary.descender) / 2) * scale + lineHeightPx / 2;

    const lines = [];
    let overflow = false;
    for (const para of paragraphs) {
      const breaks = lineBreaks(para, size, maxWidth, letterSpacing);
      breaks.forEach(([start, end], index) => {
        let { glyphs, width } = start < end ? positionLine(para, start, end, size, letterSpacing) : { glyphs: [], width: 0 };
        if (width > maxWidth + 0.5) overflow = true;
        const lastOfParagraph = index === breaks.length - 1;
        if (align === 'justify' && !lastOfParagraph && width < maxWidth) {
          ({ glyphs, width } = justifyLine(para, glyphs, width, maxWidth));
        }
        const x = align === 'right' ? maxWidth - width
          : align === 'left' ? 0
            : align === 'justify' ? (para.baseLevel % 2 ? maxWidth - width : 0)
              : (maxWidth - width) / 2;
        lines.push({ x, baseline: firstBaseline + lines.length * lineHeightPx, width, rtl: para.baseLevel % 2 === 1, glyphs });
      });
    }

    const decorations = [];
    for (const line of lines) {
      if (line.width <= 0) continue;
      if (spec.underline) decorations.push({ kind: 'underline', x: line.x, y: line.baseline + Math.round(size / 4), width: line.width, thickness: size / 15 });
      if (spec.strike) decorations.push({ kind: 'strike', x: line.x, y: line.baseline - size * 0.28, width: line.width, thickness: size / 15 });
    }

    return {
      fontSize: size,
      lineHeightPx,
      width: maxWidth,
      height: Math.max(1, lines.length) * lineHeightPx,
      lines,
      decorations,
      overflow,
    };
  }

  return {
    registerFont,
    hasFont: (key) => fonts.has(key),
    fontMetrics: (key) => {
      const entry = fonts.get(key);
      return entry && { upem: entry.upem, ascender: entry.ascender, descender: entry.descender };
    },
    glyphPath,
    layoutText,
  };
}

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import * as hb from 'harfbuzzjs';
import bidiFactory from 'bidi-js';
import { createTextEngine } from './textEngine.js';
import { createFontRegistry } from './fonts.js';

const fontsDir = fileURLToPath(new URL('../../backend/assets/fonts/', import.meta.url));
const files = readdirSync(fontsDir).filter((file) => /\.(ttf|otf)$/i.test(file));
const registry = createFontRegistry(files);
let engine;

function load(key) {
  const file = files.find((name) => name.replace(/\.(ttf|otf)$/i, '') === key);
  engine.registerFont(key, readFileSync(fontsDir + file));
}

beforeAll(() => {
  engine = createTextEngine({ hb, bidi: bidiFactory() });
  for (const key of ['Amiri-Regular', 'Cairo-Regular', 'Cairo-Bold', 'Alexandria-Regular']) load(key);
});

const spec = (overrides) => ({ fontKey: 'Amiri-Regular', fallbackKeys: registry.fallbackKeys(), fontSize: 40, width: 600, align: 'center', lineHeight: 1.4, ...overrides });

describe('text engine', () => {
  it('shapes Arabic with harakat into positioned glyphs on one line', () => {
    const layout = engine.layoutText(spec({ text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' }));
    expect(layout.lines).toHaveLength(1);
    const [line] = layout.lines;
    expect(line.rtl).toBe(true);
    expect(line.glyphs.length).toBeGreaterThan(20);
    // Marks are positioned off the baseline.
    expect(line.glyphs.some((glyph) => Math.abs(glyph.y) > 1)).toBe(true);
    // Centered.
    expect(line.x).toBeCloseTo((600 - line.width) / 2, 5);
  });

  it('reproduces the Konva baseline model', () => {
    const { ascender, descender, upem } = engine.fontMetrics('Amiri-Regular');
    const layout = engine.layoutText(spec({ text: 'سطر\nسطر', lineHeight: 2 }));
    const expected = ((ascender + descender) / 2) * (40 / upem) + 40;
    expect(layout.lines[0].baseline).toBeCloseTo(expected, 5);
    expect(layout.lines[1].baseline - layout.lines[0].baseline).toBeCloseTo(80, 5);
    expect(layout.height).toBeCloseTo(160, 5);
  });

  it('wraps words greedily within the box and aligns each line', () => {
    const layout = engine.layoutText(spec({ text: 'تبارك مؤسسة دار الإتقان العالي بنجاح الطالب المتميز في حفظ القرآن', width: 300, align: 'right' }));
    expect(layout.lines.length).toBeGreaterThan(1);
    for (const line of layout.lines) {
      expect(line.width).toBeLessThanOrEqual(300.01);
      expect(line.x + line.width).toBeCloseTo(300, 5);
    }
  });

  it('shrinks to fit like v1 PDFs: integer steps, bounded by minScale', () => {
    const long = 'عبدالرحمن بن عبدالعزيز بن محمد آل عبدالله الفلاني';
    const natural = engine.layoutText(spec({ text: long, width: 10000 })).lines[0].width;
    const fitted = engine.layoutText(spec({ text: long, width: natural * 0.85, autoFit: { mode: 'shrink', minScale: 0.72, minFontSize: 12 } }));
    expect(fitted.fontSize).toBe(34);
    expect(fitted.lines).toHaveLength(1);
    const floor = engine.layoutText(spec({ text: long, width: natural * 0.3, autoFit: { mode: 'shrink', minScale: 0.72, minFontSize: 12 } }));
    expect(floor.fontSize).toBe(29);
    expect(floor.lines.length).toBeGreaterThan(1);
  });

  it('orders mixed Arabic, digits and Latin visually (bidi)', () => {
    const layout = engine.layoutText(spec({ text: 'الحصة 12 من ABC', width: 2000 }));
    const [line] = layout.lines;
    // Visual order is left→right: glyph x must be non-decreasing.
    const xs = line.glyphs.map((glyph) => glyph.x);
    expect(xs.every((x, i) => i === 0 || x >= xs[i - 1] - 30)).toBe(true);
    expect(line.rtl).toBe(true);
  });

  it('falls back per character when the font lacks a glyph (ﷺ is not in Cairo)', () => {
    const { glyphs } = engine.layoutText(spec({ fontKey: 'Cairo-Bold', text: 'محمد ﷺ' })).lines[0];
    expect(glyphs.every((glyph) => glyph.gid !== 0)).toBe(true);
    expect(glyphs.filter((glyph) => glyph.key === 'Amiri-Regular')).toHaveLength(1);
    expect(glyphs.filter((glyph) => glyph.key === 'Cairo-Bold').length).toBeGreaterThan(2);
  });

  it('adds letter spacing without separating joined Arabic letters', () => {
    const plain = engine.layoutText(spec({ text: 'سلام', width: 2000 })).lines[0].width;
    const spaced = engine.layoutText(spec({ text: 'سلام', width: 2000, letterSpacing: 10 })).lines[0].width;
    // س-ل-ا join; ا does not join to م, so exactly one gap is inserted.
    expect(spaced - plain).toBeCloseTo(10, 5);
    const latin = engine.layoutText(spec({ text: 'ABCD', width: 2000, letterSpacing: 10 })).lines[0].width
      - engine.layoutText(spec({ text: 'ABCD', width: 2000 })).lines[0].width;
    expect(latin).toBeCloseTo(30, 5);
  });

  it('produces glyph outlines', () => {
    const [glyph] = engine.layoutText(spec({ text: 'ب' })).lines[0].glyphs;
    expect(engine.glyphPath(glyph.key, glyph.gid)).toMatch(/^M/);
  });
});

describe('font registry', () => {
  it('resolves file names, family names and bold siblings identically everywhere', () => {
    expect(registry.resolve('Amiri-Regular')).toEqual({ key: 'Amiri-Regular', syntheticBold: false, syntheticItalic: false });
    expect(registry.resolve('Cairo', 'bold').key).toBe('Cairo-Bold');
    expect(registry.resolve('Cairo', 'normal').key).toBe('Cairo-Regular');
    expect(registry.resolve('Cairo-Regular', 'bold').key).toBe('Cairo-Bold');
    expect(registry.resolve('Amiri', 'bold')).toEqual({ key: 'Amiri-Regular', syntheticBold: true, syntheticItalic: false });
    expect(registry.resolve('Alexandria-Bold', 'bold')).toEqual({ key: 'Alexandria-Bold', syntheticBold: false, syntheticItalic: false });
    expect(registry.resolve('janna_LT_bold', 'bold').syntheticBold).toBe(false);
    expect(registry.resolve('does-not-exist').key).toBe('Amiri-Regular');
  });
});

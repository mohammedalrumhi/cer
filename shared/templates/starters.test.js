import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { migrateTemplate, validateTemplate } from '../model/index.js';
import { createFontRegistry } from '../render/fonts.js';
import { CATEGORIES, PALETTES, STARTERS, applyPaletteOf, buildStarter, extractPalette } from './index.js';

const fonts = readdirSync(fileURLToPath(new URL('../../backend/assets/fonts/', import.meta.url))).filter((f) => /\.(ttf|otf)$/i.test(f));
const keys = new Set(fonts.map((f) => f.replace(/\.(ttf|otf)$/i, '')));
const registry = createFontRegistry(fonts);

describe('starter templates', () => {
  it('has at least 20 designs (plus the master structure) across every category', () => {
    expect(STARTERS.length).toBeGreaterThanOrEqual(22);
    for (const category of CATEGORIES) expect(STARTERS.some((s) => s.category === category.id), category.id).toBe(true);
  });

  for (const starter of STARTERS) {
    it(`${starter.id} builds a valid, editable v3 template in every palette`, () => {
      for (const palette of PALETTES) {
        const template = buildStarter(starter.id, palette.key);
        expect(validateTemplate(template)).toEqual([]);
        expect(migrateTemplate(template)).toEqual(template); // already current
        expect(new Set(template.elements.map((el) => el.id)).size).toBe(template.elements.length);
        for (const el of template.elements) {
          if (el.fontFamily) expect(keys.has(el.fontFamily) || registry.resolve(el.fontFamily).key === el.fontFamily, `${starter.id} › ${el.id} font ${el.fontFamily}`).toBe(true);
          // Only editor elements: no flat images except brand fields (logo, signature, stamp).
          expect(el.type, `${starter.id} › ${el.id}`).not.toBe('image');
        }
      }
    });
  }

  it('changes colour between palettes', () => {
    const a = JSON.stringify(buildStarter('khatm-ornate', 'emerald'));
    const b = JSON.stringify(buildStarter('khatm-ornate', 'burgundy'));
    expect(a).not.toBe(b);
  });

  it('maps a design onto another palette ("apply colours only")', () => {
    const target = buildStarter('thanks-formal', 'emerald');
    const source = buildStarter('thanks-formal', 'navy');
    const recolored = applyPaletteOf(target, source);
    expect(extractPalette(recolored)[0]).toBe(extractPalette(source)[0]);
  });
});

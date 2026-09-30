import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, migrateTemplate, needsMigration } from './migrations.js';
import { createElement, validateTemplate } from './elements.js';

const v1 = () => ({
  id: 't1',
  name: 'قالب',
  width: 1123,
  height: 794,
  background: { type: 'solid', color: '#fff', accentColor: '#123456', customLayout: true },
  elements: [
    { id: 'a', type: 'rect', x: 10, y: 10, width: 50, height: 20, fill: null, stroke: '#000' },
    { id: 'b', type: 'text', text: 'مرحبا', x: '5', y: 6 },
    { id: 'c', type: 'dynamicText', field: 'studentName', x: 0, y: 0, fontFamily: 'Cairo', fontStyle: 'bold', customProp: 42 },
    { id: 'a', type: 'line', x: 0, y: 0 },
    { id: 'd', type: 'dynamicImage', field: 'signature', x: 0, y: 0 },
  ],
});

describe('migrateTemplate v1 → v2', () => {
  it('stamps the current schema version', () => {
    const migrated = migrateTemplate(v1());
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(needsMigration(v1())).toBe(true);
    expect(needsMigration(migrated)).toBe(false);
  });

  it('does not mutate its input', () => {
    const input = v1();
    const snapshot = JSON.stringify(input);
    migrateTemplate(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('is idempotent', () => {
    const once = migrateTemplate(v1());
    expect(migrateTemplate(once)).toEqual(once);
  });

  it('makes shape paint explicit the way the PDF printed it', () => {
    const [rect] = migrateTemplate(v1()).elements;
    expect(rect.fill).toBeNull();
    expect(rect.stroke).toBe('#000');
    expect(rect.strokeWidth).toBe(0);
  });

  it('applies editor text defaults and explicit shrink-to-fit', () => {
    const text = migrateTemplate(v1()).elements[1];
    expect(text).toMatchObject({ x: 5, width: 200, fontSize: 28, lineHeight: 1.4, align: 'center', fontFamily: 'Amiri-Regular' });
    expect(text.autoFit).toEqual({ mode: 'shrink', minScale: 0.72, minFontSize: 12 });
  });

  it('keeps unknown properties and user values', () => {
    const dynamic = migrateTemplate(v1()).elements[2];
    expect(dynamic.customProp).toBe(42);
    expect(dynamic.fontFamily).toBe('Cairo');
    expect(dynamic.fontStyle).toBe('bold');
  });

  it('renames duplicate ids instead of dropping elements', () => {
    const { elements } = migrateTemplate(v1());
    expect(elements).toHaveLength(5);
    expect(elements.map((el) => el.id)).toEqual(['a', 'b', 'c', 'a-2', 'd']);
  });

  it('fills dynamic image sizes per field', () => {
    const signature = migrateTemplate(v1()).elements[4];
    expect(signature).toMatchObject({ width: 113, height: 60 });
  });

  it('materialises legacy background decoration when customLayout is not set', () => {
    const input = v1();
    delete input.background.customLayout;
    const migrated = migrateTemplate(input);
    expect(migrated.background.customLayout).toBe(true);
    expect(migrated.elements).toHaveLength(10);
    expect(migrated.elements[0]).toMatchObject({ id: 'legacy-decor-header', type: 'rect', width: 1123, height: 96, fill: '#123456' });
    expect(migrated.elements[1]).toMatchObject({ fill: null, stroke: '#123456', strokeWidth: 2, width: 1075, height: 746 });
  });

  it('leaves templates from a newer schema untouched', () => {
    const future = { ...v1(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    expect(migrateTemplate(future)).toEqual(future);
  });

  it('produces templates that pass validation', () => {
    expect(validateTemplate(migrateTemplate(v1()))).toEqual([]);
  });
});

describe('createElement', () => {
  it('creates unique ids and type defaults', () => {
    const a = createElement('text');
    const b = createElement('text');
    expect(a.id).not.toBe(b.id);
    expect(a).toMatchObject({ type: 'text', fontSize: 28, visible: true, locked: false, autoFit: { mode: 'none' } });
  });

  it('sizes dynamic images by field unless overridden', () => {
    expect(createElement('dynamicImage', { field: 'signature' })).toMatchObject({ width: 113, height: 60 });
    expect(createElement('dynamicImage', { field: 'stamp', width: 50 })).toMatchObject({ width: 50, height: 113 });
  });

  it('rejects unknown types', () => {
    expect(() => createElement('video')).toThrow();
  });
});

describe('validateTemplate', () => {
  it('reports duplicate ids and bad sizes', () => {
    const errors = validateTemplate({ width: 0, height: 10, elements: [{ id: 'x', type: 'rect', x: 0, y: 0 }, { id: 'x', type: 'blob', x: 0, y: 'a' }] });
    expect(errors).toEqual(expect.arrayContaining([
      'width must be a number between 1 and 20000',
      'elements[1].type "blob" is not supported',
      'elements[1].id "x" is duplicated',
      'elements[1].y must be a finite number',
    ]));
  });
});

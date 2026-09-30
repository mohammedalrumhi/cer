import { beforeEach, describe, expect, it } from 'vitest';
import { createElement } from '@shared/model/index.js';
import {
  createEditorStore,
  selectCanRedo,
  selectCanUndo,
  selectIsDirty,
} from './editorStore.js';
import { HISTORY_LIMIT } from './history.js';

function template() {
  return {
    id: 't',
    name: 'قالب',
    schemaVersion: 2,
    width: 1000,
    height: 500,
    background: { type: 'solid', color: '#fff', customLayout: true },
    elements: [
      createElement('rect', { id: 'a', x: 0, y: 0 }),
      createElement('text', { id: 'b', x: 10, y: 10 }),
      createElement('circle', { id: 'c', x: 20, y: 20 }),
    ],
  };
}

function setup() {
  let clock = 0;
  const store = createEditorStore(template(), { now: () => clock });
  return { store, s: () => store.getState(), tick: (ms) => { clock += ms; } };
}

const ids = (state) => state.document.elements.map((el) => el.id);

describe('editor store: history', () => {
  it('undoes and redoes element changes, restoring selection', () => {
    const { s } = setup();
    s().select(['a']);
    s().updateElement('a', { x: 50 });
    s().select([]);
    expect(s().document.elements[0].x).toBe(50);

    s().undo();
    expect(s().document.elements[0].x).toBe(0);
    expect(s().selection.ids).toEqual(['a']);

    s().redo();
    expect(s().document.elements[0].x).toBe(50);
  });

  it('keeps structural sharing so unchanged elements keep identity', () => {
    const { s } = setup();
    const [, before] = s().document.elements;
    s().updateElement('a', { x: 5 });
    expect(s().document.elements[1]).toBe(before);
  });

  it('ignores no-op updates', () => {
    const { s } = setup();
    s().updateElement('a', { x: 0 });
    expect(selectCanUndo(s())).toBe(false);
  });

  it('coalesces rapid changes with the same key (typing) into one step', () => {
    const { s, tick } = setup();
    for (const size of [3, 30, 300]) {
      s().updateElement('b', { fontSize: size }, { coalesceKey: 'b:fontSize' });
      tick(200);
    }
    expect(s().history.past).toHaveLength(1);
    s().undo();
    expect(s().document.elements[1].fontSize).toBe(28);
  });

  it('starts a new step after the coalesce window, a different key, or a seal', () => {
    const { s, tick } = setup();
    s().updateElement('b', { fontSize: 10 }, { coalesceKey: 'k' });
    tick(5000);
    s().updateElement('b', { fontSize: 11 }, { coalesceKey: 'k' });
    s().updateElement('b', { fill: '#f00' }, { coalesceKey: 'other' });
    s().sealHistory();
    s().updateElement('b', { fill: '#0f0' }, { coalesceKey: 'other' });
    expect(s().history.past).toHaveLength(4);
  });

  it('drops a coalesced run that returns to its start', () => {
    const { s } = setup();
    s().updateElement('b', { fontSize: 40 }, { coalesceKey: 'k' });
    s().updateElement('b', { fontSize: 28 }, { coalesceKey: 'k' });
    expect(selectCanUndo(s())).toBe(false);
    expect(selectIsDirty(s())).toBe(false);
  });

  it('records a drag transaction as a single undo step', () => {
    const { s } = setup();
    s().beginTransaction('تحريك');
    for (let x = 1; x <= 60; x += 1) s().updateElement('a', { x });
    s().commitTransaction();
    expect(s().history.past).toHaveLength(1);
    expect(s().document.elements[0].x).toBe(60);
    s().undo();
    expect(s().document.elements[0].x).toBe(0);
  });

  it('cancels a transaction back to its start', () => {
    const { s } = setup();
    s().beginTransaction('تحريك');
    s().updateElement('a', { x: 99 });
    s().cancelTransaction();
    expect(s().document.elements[0].x).toBe(0);
    expect(selectCanUndo(s())).toBe(false);
  });

  it(`keeps at most ${HISTORY_LIMIT} steps`, () => {
    const { s } = setup();
    for (let i = 1; i <= HISTORY_LIMIT + 25; i += 1) s().updateElement('a', { x: i });
    expect(s().history.past).toHaveLength(HISTORY_LIMIT);
  });

  it('clears redo after a new change', () => {
    const { s } = setup();
    s().updateElement('a', { x: 1 });
    s().undo();
    expect(selectCanRedo(s())).toBe(true);
    s().updateElement('a', { x: 2 });
    expect(selectCanRedo(s())).toBe(false);
  });

  it('tracks dirty state by document identity, so undo back to saved is clean', () => {
    const { s } = setup();
    expect(selectIsDirty(s())).toBe(false);
    s().updateElement('a', { x: 1 });
    expect(selectIsDirty(s())).toBe(true);
    s().undo();
    expect(selectIsDirty(s())).toBe(false);
    s().redo();
    s().markSaved();
    expect(selectIsDirty(s())).toBe(false);
  });
});

describe('editor store: elements', () => {
  it('adds, selects, removes and prunes selection', () => {
    const { s } = setup();
    const el = createElement('line', { id: 'd' });
    s().addElements([el]);
    expect(s().selection.ids).toEqual(['d']);
    s().removeElements(['d']);
    expect(ids(s())).toEqual(['a', 'b', 'c']);
    expect(s().selection.ids).toEqual([]);
  });

  it('duplicates every selected element with fresh ids and an offset', () => {
    const { s } = setup();
    s().select(['a', 'c']);
    const copies = s().duplicateElements();
    expect(copies).toHaveLength(2);
    expect(new Set(ids(s())).size).toBe(5);
    expect(s().selection.ids).toEqual(copies.map((el) => el.id));
    expect(copies[1]).toMatchObject({ type: 'circle', x: 40, y: 40 });
  });

  it('reorders groups of elements', () => {
    const { s } = setup();
    s().reorderElements(['a'], 'bringToFront');
    expect(ids(s())).toEqual(['b', 'c', 'a']);
    s().reorderElements(['a'], 'sendBackward');
    expect(ids(s())).toEqual(['b', 'a', 'c']);
    s().reorderElements(['b', 'a'], 'bringForward');
    expect(ids(s())).toEqual(['c', 'b', 'a']);
    s().reorderElements(['a', 'b'], 'sendToBack');
    expect(ids(s())).toEqual(['b', 'a', 'c']);
    s().reorderElements(['b'], 'sendBackward');
    expect(ids(s())).toEqual(['b', 'a', 'c']);
  });

  it('nudges unlocked elements and coalesces repeated arrow presses', () => {
    const { s } = setup();
    s().updateElement('c', { locked: true });
    s().nudge(['a', 'c'], 1, 0);
    s().nudge(['a', 'c'], 1, 0);
    s().nudge(['a', 'c'], 0, 10);
    expect(s().document.elements[0]).toMatchObject({ x: 2, y: 10 });
    expect(s().document.elements[2]).toMatchObject({ x: 20, y: 20 });
    expect(s().history.past).toHaveLength(2);
  });

  it('copies and pastes with cascading offsets', () => {
    const { s } = setup();
    s().copy(['a']);
    const first = s().paste();
    const second = s().paste();
    expect(first[0]).toMatchObject({ x: 20, y: 20 });
    expect(second[0]).toMatchObject({ x: 40, y: 40 });
    expect(first[0].id).not.toBe('a');
  });

  it('migrates legacy templates on load', () => {
    const { s } = setup();
    s().loadDocument({ id: 'old', width: 100, height: 100, background: { customLayout: true }, elements: [{ id: 'r', type: 'rect', x: 0, y: 0 }] });
    expect(s().document.schemaVersion).toBe(2);
    expect(s().document.elements[0].fill).toBeNull();
    expect(selectCanUndo(s())).toBe(false);
  });
});

describe('editor store: viewport', () => {
  let s;
  beforeEach(() => {
    ({ s } = setup());
    s().setViewport({ width: 800, height: 600 });
  });

  it('fits the page with padding and centres it', () => {
    s().zoomToFit();
    const { zoom, x, y } = s().viewport;
    expect(zoom).toBeCloseTo((800 - 64) / 1000);
    expect(x).toBeCloseTo(32);
    expect(y).toBeCloseTo((600 - 500 * zoom) / 2);
  });

  it('zooms around a focus point', () => {
    s().setViewport({ zoom: 1, x: 0, y: 0 });
    s().zoomTo(2, { x: 100, y: 100 });
    expect(s().viewport).toMatchObject({ zoom: 2, x: -100, y: -100 });
  });

  it('clamps zoom', () => {
    s().zoomTo(100);
    expect(s().viewport.zoom).toBe(5);
  });
});

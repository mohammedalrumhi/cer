import { describe, expect, it } from 'vitest';
import { createElement } from '@shared/model/index.js';
import { createEditorStore, nextZoomStep } from './editorStore.js';

function setup() {
  const store = createEditorStore({
    id: 't',
    name: 'قالب',
    width: 1000,
    height: 500,
    background: { type: 'solid', color: '#fff', customLayout: true },
    elements: [
      createElement('rect', { id: 'a', x: 0, y: 0, width: 100, height: 50 }),
      createElement('rect', { id: 'b', x: 300, y: 100, width: 100, height: 50 }),
      createElement('rect', { id: 'c', x: 700, y: 200, width: 50, height: 50 }),
    ],
  });
  const s = () => store.getState();
  s().setBoxes(new Map(s().document.elements.map((el) => [el.id, { x: el.x, y: el.y, width: el.width, height: el.height }])));
  const el = (id) => s().document.elements.find((item) => item.id === id);
  return { s, el };
}

describe('studio editor actions', () => {
  it('groups select together and duplicate into a fresh group', () => {
    const { s, el } = setup();
    s().select(['a', 'b']);
    s().groupSelection();
    expect(el('a').groupId).toBeTruthy();
    expect(el('a').groupId).toBe(el('b').groupId);
    s().selectExpanded(['a']);
    expect(s().selection.ids.sort()).toEqual(['a', 'b']);
    const copies = s().duplicateElements();
    expect(copies[0].groupId).toBe(copies[1].groupId);
    expect(copies[0].groupId).not.toBe(el('a').groupId);
    s().select(['a', 'b']);
    s().ungroupSelection();
    expect(el('a').groupId).toBeUndefined();
  });

  it('aligns several elements to their bounds and one element to the page, in one undo step', () => {
    const { s, el } = setup();
    s().select(['a', 'b', 'c']);
    s().alignSelection('left');
    expect([el('a').x, el('b').x, el('c').x]).toEqual([0, 0, 0]);
    expect(s().history.past).toHaveLength(1);
    s().undo();
    s().select(['c']);
    s().alignSelection('right');
    expect(el('c').x).toBe(950);
  });

  it('distributes three or more elements with equal gaps', () => {
    const { s, el } = setup();
    s().select(['a', 'b', 'c']);
    s().distributeSelection('horizontal');
    // span 0…750, widths 250 → gap 250: b goes to 350.
    expect(el('b').x).toBe(350);
  });

  it('moves a layer to an index, locks, hides, and replaces the document undoably', () => {
    const { s } = setup();
    s().moveElementTo('a', 2);
    expect(s().document.elements.map((e) => e.id)).toEqual(['b', 'c', 'a']);
    s().toggleLocked(['b']);
    expect(s().document.elements[0].locked).toBe(true);
    s().toggleHidden(['b']);
    expect(s().document.elements[0].visible).toBe(false);
    s().replaceDocument({ schemaVersion: 3, width: 800, height: 600, elements: [] });
    expect(s().document.elements).toHaveLength(0);
    expect(s().document.id).toBe('t');
    s().undo();
    expect(s().document.elements).toHaveLength(3);
  });

  it('steps zoom through the preset levels within 10–400 %', () => {
    expect(nextZoomStep(1, 1)).toBe(1.25);
    expect(nextZoomStep(1, -1)).toBe(0.9);
    expect(nextZoomStep(4, 1)).toBe(4);
    expect(nextZoomStep(0.1, -1)).toBe(0.1);
  });
});

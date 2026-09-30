/** Apply a context-menu / toolbar action to the current selection. */
export function runElementAction(store, action) {
  const state = store.getState();
  const ids = state.selection.ids;
  switch (action) {
    case 'copy': state.copy(ids); break;
    case 'paste': state.paste(); break;
    case 'duplicate': state.duplicateElements(ids); break;
    case 'delete': state.removeElements(ids); break;
    case 'lock': {
      const lock = !state.document.elements.filter((el) => ids.includes(el.id)).every((el) => el.locked);
      state.updateElements(ids, (el) => ({ ...el, locked: lock }), { label: lock ? 'قفل' : 'فتح القفل' });
      break;
    }
    default: state.reorderElements(ids, action);
  }
}

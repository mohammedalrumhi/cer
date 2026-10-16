/** Page coordinates for a client point (drops from panels and files). */
export function clientToDocument(store, container, clientX, clientY) {
  const rect = container.getBoundingClientRect();
  const { zoom, x, y } = store.getState().viewport;
  return { x: (clientX - rect.left - x) / zoom, y: (clientY - rect.top - y) / zoom };
}

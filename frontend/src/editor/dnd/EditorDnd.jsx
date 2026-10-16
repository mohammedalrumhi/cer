import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core';
import { cx } from '../../ui/cx';
import { useEditorStoreApi } from '../store/EditorStoreContext';
import { clientToDocument } from '../canvas/coords';
import { dropPayload } from './drop';

/**
 * Drag & drop from the side panels onto the page (dnd-kit). A click adds the item at the centre
 * of the view; a drag drops it where it is released.
 */
export function EditorDnd({ children }) {
  const store = useEditorStoreApi();
  const [active, setActive] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  return (
    <DndContext
      sensors={sensors}
      autoScroll={false}
      onDragStart={(event) => setActive(event.active.data.current || null)}
      onDragCancel={() => setActive(null)}
      onDragEnd={(event) => {
        setActive(null);
        const payload = event.active.data.current;
        const start = event.activatorEvent;
        if (!payload || event.over?.id !== 'editor-canvas' || !('clientX' in start)) return;
        const container = document.querySelector('[data-testid=editor-canvas]');
        const point = clientToDocument(store, container, start.clientX + event.delta.x, start.clientY + event.delta.y);
        dropPayload(store, payload, point);
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className="pointer-events-none grid size-20 cursor-grabbing place-items-center rounded-md border border-primary/40 bg-surface/90 shadow-lg backdrop-blur">
            {active.preview}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** Panel tile: click to add at the centre, or drag onto the page. */
export function DraggableTile({ id, payload, label, className, children, testId }) {
  const store = useEditorStoreApi();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: payload });
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={label}
      title={label}
      data-testid={testId}
      onClick={() => dropPayload(store, payload)}
      {...attributes}
      {...listeners}
      className={cx(className, 'touch-none', isDragging && 'opacity-40')}
    >
      {children}
    </button>
  );
}

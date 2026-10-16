import { useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar, Circle, Eye, EyeOff, Frame, Hexagon, Image as ImageIcon, Layers, Lock, LockOpen, Minus, QrCode, ScanBarcode, Shapes, Sparkles, Square, Star, Type, Variable,
} from 'lucide-react';
import { S } from '../../strings.ar';
import { cx } from '../../ui/cx';
import { EmptyState } from '../../ui/States';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

const ICONS = {
  text: Type, dynamicText: Variable, dateField: Calendar, image: ImageIcon, dynamicImage: ImageIcon, frame: Frame,
  rect: Square, circle: Circle, polygon: Hexagon, star: Star, line: Minus, shape: Shapes, ornament: Sparkles, icon: Star,
  qrcode: QrCode, barcode: ScanBarcode,
};
const GROUP_COLORS = ['#0F6B52', '#B8893C', '#2C6AA0', '#B64A5D', '#7A5AC8'];

function layerLabel(el) {
  if (el.name) return el.name;
  if (el.type === 'text' && String(el.text || '').trim()) return String(el.text).trim().split('\n')[0].slice(0, 40);
  return S.editor.types[el.type] || el.type;
}

function LayerRow({ el, selected, groupColor, onSelect }) {
  const store = useEditorStoreApi();
  const [renaming, setRenaming] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: el.id });
  const Icon = ICONS[el.type] || Square;
  const label = layerLabel(el);
  const hidden = el.visible === false;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      {...attributes}
      {...listeners}
      data-testid={`layer-${el.id}`}
      onClick={(event) => onSelect(el.id, event.shiftKey)}
      className={cx('group flex h-10 items-center gap-2 rounded-sm border px-2 text-sm transition-colors', selected ? 'border-primary/40 bg-primary-50' : 'border-transparent hover:bg-surface-2', hidden && 'opacity-50', isDragging && 'shadow-md')}
    >
      <span className="h-5 w-1 shrink-0 rounded-full" style={{ background: groupColor || 'transparent' }} />
      <Icon size={15} className="shrink-0 text-fg-muted" aria-hidden />
      {renaming ? (
        <input
          autoFocus
          defaultValue={el.name || ''}
          placeholder={label}
          maxLength={80}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setRenaming(false);
          }}
          onBlur={(e) => {
            store.getState().updateElement(el.id, { name: e.target.value.trim() }, { label: 'إعادة تسمية' });
            setRenaming(false);
          }}
          className="field field-sm h-7 min-w-0 flex-1"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate font-medium" onDoubleClick={() => setRenaming(true)} title="انقر مرتين لإعادة التسمية">{label}</span>
      )}
      <button
        type="button"
        aria-label={el.locked ? S.editor.menu.unlock : S.editor.menu.lock}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); store.getState().toggleLocked([el.id]); }}
        className={cx('grid size-7 place-items-center rounded text-fg-muted hover:bg-surface hover:text-fg', !el.locked && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
      >
        {el.locked ? <Lock size={13} /> : <LockOpen size={13} />}
      </button>
      <button
        type="button"
        aria-label={hidden ? S.editor.menu.show : S.editor.menu.hide}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); store.getState().toggleHidden([el.id]); }}
        className={cx('grid size-7 place-items-center rounded text-fg-muted hover:bg-surface hover:text-fg', !hidden && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
      >
        {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

/** Layers, top-most first. Drag to restack, double-click to rename, lock/hide per row. */
export default function LayersPanel({ query }) {
  const store = useEditorStoreApi();
  const elements = useEditor((state) => state.document.elements);
  const selectedIds = useEditor((state) => state.selection.ids);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  if (!elements.length) return <EmptyState compact icon={Layers} title="لا توجد طبقات" body={S.editor.empty} />;
  const topFirst = [...elements].reverse();
  const groups = [...new Set(elements.map((el) => el.groupId).filter(Boolean))];
  const shown = topFirst.filter((el) => !query || layerLabel(el).includes(query));
  const select = (id, additive) => {
    const state = store.getState();
    if (additive) state.toggleSelect(id);
    else state.selectExpanded([id]);
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const to = topFirst.findIndex((el) => el.id === over.id);
        store.getState().moveElementTo(String(active.id), elements.length - 1 - to);
      }}
    >
      <SortableContext items={shown.map((el) => el.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1">
          {shown.map((el) => (
            <LayerRow key={el.id} el={el} selected={selectedIds.includes(el.id)} groupColor={el.groupId ? GROUP_COLORS[groups.indexOf(el.groupId) % GROUP_COLORS.length] : undefined} onSelect={select} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

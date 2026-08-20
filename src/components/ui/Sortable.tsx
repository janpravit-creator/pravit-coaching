import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconGrip } from '../icons';

/**
 * Sortierbare Liste per Ziehen.
 *
 * Der Zeigersensor löst erst nach 8 px Bewegung aus und der Berührungssensor
 * erst nach 220 ms Halten. Ohne diese Schwellen würde jeder Scrollversuch in
 * der Liste ein Ziehen starten – der häufigste Fehler bei Drag & Drop auf
 * dem Handy.
 */

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, handle: ReactNode, isDragging: boolean) => ReactNode;
  className?: string;
}

export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  className,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => getId(item) === active.id);
    const newIndex = items.findIndex((item) => getId(item) === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(getId)} strategy={verticalListSortingStrategy}>
        <div className={cn('relative', className)}>
          {items.map((item) => (
            <SortableRow key={getId(item)} id={getId(item)}>
              {(handle, isDragging) => renderItem(item, handle, isDragging)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: ReactNode, isDragging: boolean) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Nur der Griff startet das Ziehen – der Rest der Zeile bleibt antippbar.
  const handle = (
    <button
      ref={setActivatorNodeRef}
      aria-label="Zum Verschieben ziehen"
      className="flex h-10 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-subtle active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <IconGrip size={20} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        // Das gezogene Element schwebt über den anderen.
        zIndex: isDragging ? 20 : undefined,
        position: isDragging ? 'relative' : undefined,
      }}
      className={isDragging ? 'opacity-95' : undefined}
    >
      {children(handle, isDragging)}
    </div>
  );
}

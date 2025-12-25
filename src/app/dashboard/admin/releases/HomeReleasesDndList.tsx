"use client";

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  isValidElement,
  cloneElement,
} from "react";

export default function HomeReleasesDndList({
  moduleId,
  initialOrder,
  children,
}: {
  moduleId: string;
  initialOrder: string[]; // home_module_items.id in aktueller Reihenfolge
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const childArray = useMemo(() => {
    return Array.isArray(children) ? children : [children];
  }, [children]);

  // Map: id -> child element
  const childById = useMemo(() => {
    const map = new Map<string, ReactNode>();
    for (const child of childArray) {
      const anyChild = child as any;
      const id = anyChild?.props?.id as string | undefined;
      if (id) map.set(id, child);
    }
    return map;
  }, [childArray]);

  const [order, setOrder] = useState<string[]>(initialOrder);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  async function persist(nextOrder: string[]) {
    try {
      await fetch("/dashboard/admin/releases/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, orderedIds: nextOrder }),
      });
    } catch {
      // bewusst still — UI bleibt responsive
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    setOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;

      const next = arrayMove(prev, oldIndex, newIndex);
      void persist(next);
      return next;
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {order.map((id, idx) => {
            const child = childById.get(id) ?? null;

            if (child && isValidElement(child)) {
              return (
                <div key={id}>
                  {cloneElement(child as any, { positionIndex: idx + 1 })}
                </div>
              );
            }

            return <div key={id}>{child}</div>;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}


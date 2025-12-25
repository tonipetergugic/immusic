"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";
import { GripVertical } from "lucide-react";

export default function HomePlaylistsDndItem({
  id,
  children,
  positionIndex,
}: {
  id: string; // home_module_items.id
  children: ReactNode;
  positionIndex?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="w-full">
      <div className="flex items-stretch gap-2">
        <div className="w-8 flex items-center justify-end pr-1 text-xs text-white/60 tabular-nums">
          {positionIndex ?? ""}
        </div>

        <button
          type="button"
          aria-label="Drag to reorder"
          className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 flex items-center justify-center hover:bg-white/10"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-white/70" />
        </button>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}


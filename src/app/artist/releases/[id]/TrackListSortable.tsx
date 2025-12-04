"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dispatch, SetStateAction } from "react";
import { reorderReleaseTracksAction, removeTrackFromReleaseAction } from "./actions";

type Track = { track_id: string; track_title: string; position: number; release_id: string };

function SortableTrackItem({
  track,
  setTracks,
}: {
  track: Track;
  setTracks: Dispatch<SetStateAction<Track[]>>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: track.track_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded border border-[#27272A] bg-[#18181B] p-3 text-sm flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="cursor-grab text-gray-400 select-none" {...attributes} {...listeners}>
          |||
        </div>
        <div className="flex flex-col">
          <p className="font-medium">{track.track_title}</p>
          <p className="text-xs text-gray-500">Position: {track.position}</p>
        </div>
      </div>
      <form
        action={removeTrackFromReleaseAction.bind(null, track.release_id, track.track_id)}
        onSubmit={() => {
          setTracks((prev) =>
            prev
              .filter((t) => t.track_id !== track.track_id)
              .map((t, index) => ({ ...t, position: index + 1 })),
          );
        }}
      >
        <button type="submit" className="text-red-400 hover:text-red-300 text-xs ml-4">
          Remove
        </button>
      </form>
    </li>
  );
}

type TrackListSortableProps = {
  releaseId: string;
  tracks: Track[];
  setTracks: Dispatch<SetStateAction<Track[]>>;
};

export default function TrackListSortable({ releaseId, tracks, setTracks }: TrackListSortableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    let reorderedResult: Track[] = [];

    setTracks((prev) => {
      const oldIndex = prev.findIndex((t) => t.track_id === active.id);
      const newIndex = prev.findIndex((t) => t.track_id === over.id);
      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }

      const newList = arrayMove(prev, oldIndex, newIndex);

      const reordered = newList.map((t, index) => ({
        ...t,
        position: index + 1,
      }));

      reorderedResult = reordered;

      return reordered;
    });

    if (reorderedResult.length > 0) {
      reorderReleaseTracksAction(
        releaseId,
        reorderedResult.map((t) => ({ track_id: t.track_id, position: t.position })),
      );
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tracks.map((t) => t.track_id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {tracks.map((track) => (
            <SortableTrackItem key={track.track_id} track={track} setTracks={setTracks} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}


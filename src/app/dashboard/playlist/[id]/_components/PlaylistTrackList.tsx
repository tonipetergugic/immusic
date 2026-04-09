"use client";

import type { User } from "@supabase/supabase-js";
import type {
  DragEndEvent,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import PlaylistRow from "@/components/PlaylistRow";
import type { PlayerTrack } from "@/types/playerTrack";

export default function PlaylistTrackList({
  isOwner,
  user,
  tracks,
  onDragEnd,
  onDeleteTrack,
}: {
  isOwner: boolean;
  user: User | null;
  tracks: PlayerTrack[];
  onDragEnd: (e: DragEndEvent) => void;
  onDeleteTrack: (trackId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  function SortablePlaylistRow({
    track,
    tracks,
    user,
    onDelete,
  }: {
    track: PlayerTrack;
    tracks: PlayerTrack[];
    user: User | null;
    onDelete?: () => void;
  }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform } = useSortable({
      id: track.id,
    });

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition: undefined,
    };

    const safeListeners: DraggableSyntheticListeners = listeners;

    return (
      <div ref={setNodeRef} style={style} className="w-full" {...attributes}>
        <PlaylistRow
          track={track}
          tracks={tracks}
          user={user}
          onDelete={onDelete}
          dragHandleProps={{ listeners: safeListeners, setActivatorNodeRef }}
        />
      </div>
    );
  }

  return (
    <div className="mt-3">
        <div
          className="
            hidden lg:grid
            lg:grid-cols-[40px_80px_1fr_56px_56px_180px_80px]
            items-center
            gap-x-3
            text-xs text-white/35 uppercase tracking-wide
            px-4 py-1.5
            border-b border-white/10
          "
        >
          <span>#</span>
          <span>Cover</span>
          <span>Title</span>

          <span className="hidden lg:block text-right">BPM</span>
          <span className="hidden lg:block text-right">Key</span>
          <span className="hidden lg:block text-center">Genre</span>

          <span className="text-right">Actions</span>
        </div>

      {tracks.length ? (
        isOwner ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={tracks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col divide-y divide-white/10">
                {tracks.map((track) => (
                  <SortablePlaylistRow
                    key={track.id}
                    track={track}
                    tracks={tracks}
                    user={user}
                    onDelete={() => onDeleteTrack(track.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col divide-y divide-white/10">
            {tracks.map((track) => (
              <PlaylistRow
                key={track.id}
                track={track}
                tracks={tracks}
                user={user}
              />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

"use client";

import type { DragEndEvent } from "@dnd-kit/core";
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
  user: any | null;
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
    user: any | null;
    onDelete?: () => void;
  }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform } = useSortable({
      id: track.id,
    });

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition: undefined,
    };

    const safeListeners = (listeners ?? {}) as Record<string, any>;

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
    <div className="mt-6">
        <div
          className="
            grid
            grid-cols-[16px_56px_1fr_36px]
            lg:grid-cols-[40px_80px_1fr_56px_56px_180px_80px]
            items-center
            gap-x-2 md:gap-x-3
            text-xs text-white/50 uppercase tracking-wide
            px-3 sm:px-4 py-2
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
                onDelete={() => onDeleteTrack(track.id)}
              />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

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
    const { attributes, listeners, setNodeRef, transform } = useSortable({
      id: track.id,
    });

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition: undefined,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full"
        {...attributes}
        {...listeners}
      >
        <PlaylistRow track={track} tracks={tracks} user={user} onDelete={onDelete} />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div
        className="
          grid grid-cols-[24px_64px_1fr_36px]
          md:grid-cols-[40px_80px_1fr_70px_70px_80px]
          items-center
          gap-x-4 md:gap-x-3
          text-xs text-white/50 uppercase tracking-wide
          px-4 py-2
          border-b border-white/10
        "
      >
        <span>#</span>
        <span>Cover</span>
        <span>Title</span>

        <span className="hidden md:block">BPM</span>
        <span className="hidden md:block">Key</span>

        <span>Actions</span>
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

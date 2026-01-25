"use client";

import DeletePlaylistModal from "@/components/DeletePlaylistModal";
import PlaylistDetailsModal from "@/components/PlaylistDetailsModal";
import PlaylistAddTrackModal from "@/components/PlaylistAddTrackModal";
import type { Playlist } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";

export default function PlaylistModals({
  isOwner,

  deleteOpen,
  setDeleteOpen,
  onDeletePlaylist,

  detailsOpen,
  setDetailsOpen,
  playlist,
  onUpdated,

  addOpen,
  setAddOpen,
  existingTrackIds,
  onTrackAdded,
}: {
  isOwner: boolean;

  deleteOpen: boolean;
  setDeleteOpen: (v: boolean) => void;
  onDeletePlaylist: () => Promise<void>;

  detailsOpen: boolean;
  setDetailsOpen: (v: boolean) => void;
  playlist: Playlist;
  onUpdated: (updated: Partial<Playlist>) => void;

  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
  existingTrackIds: string[];
  onTrackAdded: (track: PlayerTrack) => void;
}) {
  if (!isOwner) return null;

  return (
    <>
      <DeletePlaylistModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await onDeletePlaylist();
        }}
      />

      <PlaylistDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        playlist={playlist}
        onUpdated={onUpdated}
      />

      <PlaylistAddTrackModal
        playlistId={playlist.id}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingTrackIds={existingTrackIds}
        onTrackAdded={onTrackAdded}
      />
    </>
  );
}

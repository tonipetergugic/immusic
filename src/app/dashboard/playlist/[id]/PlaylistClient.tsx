"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import PlaylistHeaderClient from "./PlaylistHeaderClient";
import { reorderPlaylistTracksAction } from "./actions";
import PlaylistActionsBar from "./_components/PlaylistActionsBar";
import PlaylistTrackList from "./_components/PlaylistTrackList";
import PlaylistEmptyState from "./_components/PlaylistEmptyState";
import PlaylistModals from "./_components/PlaylistModals";
import { usePlaylistLibrarySave } from "./_hooks/usePlaylistLibrarySave";
import { usePlaylistDnD } from "./_hooks/usePlaylistDnD";

import type { Playlist } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";

/**
 * ⚠️ ARCHITECTURE GUARD – READ BEFORE CHANGING ⚠️
 *
 * This component MUST NOT use `usePlayer()` or subscribe to player-related state
 * (e.g. isPlaying, currentTrack, queue, time updates).
 *
 * Reason:
 * - Player state updates very frequently
 * - Subscribing here causes the entire PlaylistClient to re-render
 * - This triggers re-measurements inside DndContext / SortableContext
 * - Result: visible flickering in owner playlists with Drag & Drop enabled
 *
 * Player-related logic MUST live inside:
 * - PlaylistRow
 * - TrackRowBase
 * - PlayOverlayButton
 *
 * Keep PlaylistClient data-only (playlist, tracks, DnD wiring).
 */

export default function PlaylistClient({
  playlist,
  initialPlayerTracks,
  user,
  initialSaved,
}: {
  playlist: Playlist;
  initialPlayerTracks: PlayerTrack[];
  user: any | null;
  initialSaved: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [localPlaylist, setLocalPlaylist] = useState(playlist);
  const [playerTracks, setPlayerTracks] = useState<PlayerTrack[]>(initialPlayerTracks);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const isOwner = !!user?.id && user.id === localPlaylist.created_by;

  const playlistCoverPublicUrl = useMemo(() => {
    const rel = localPlaylist.cover_url;
    if (!rel) return null;

    // If some legacy value is a full URL, keep it (defensive).
    if (/^https?:\/\//i.test(rel)) return rel;

    return (
      supabase.storage.from("playlist-covers").getPublicUrl(rel).data.publicUrl ??
      null
    );
  }, [supabase, localPlaylist.cover_url]);

  const { onDragEnd } = usePlaylistDnD({
    isOwner,
    playlistId: localPlaylist.id,
    playerTracks,
    setPlayerTracks,
    reorderPlaylistTracksAction,
  });

  const { isSavedToLibrary, saveBusy, toggleSaveToLibrary } =
    usePlaylistLibrarySave({
      supabase,
      userId: user?.id ?? null,
      isOwner,
      playlistId: localPlaylist.id,
      initialSaved,
    });

  useEffect(() => {
    setIsClient(true);
  }, []);

  async function togglePublic() {
    if (!isOwner) return;

    const newValue = !localPlaylist.is_public;

    const { error } = await supabase
      .from("playlists")
      .update({ is_public: newValue })
      .eq("id", localPlaylist.id);

    if (error) {
      console.error("Public update error:", error);
      return;
    }

    setLocalPlaylist((prev) => ({ ...prev, is_public: newValue }));
  }

  function onEditDetails() {
    if (!isOwner) return;
    setDetailsOpen(true);
  }

  async function onDeletePlaylist() {
    if (!isOwner) return;

    const { data: fresh } = await supabase
      .from("playlists")
      .select("cover_url")
      .eq("id", localPlaylist.id)
      .single();

    if (fresh?.cover_url || localPlaylist.cover_url) {
      try {
        const bucketName = "playlist-covers";
        const publicUrl = fresh?.cover_url ?? localPlaylist.cover_url;

        let relativePath = publicUrl?.split("/object/public/playlist-covers/")[1];

        if (!relativePath) {
          relativePath = publicUrl ?? null;
        }

        if (relativePath && relativePath.includes("?")) {
          relativePath = relativePath.split("?")[0];
        }

        if (relativePath) {
          const { error } = await supabase.storage
            .from(bucketName)
            .remove([relativePath]);

          if (error) {
            console.error("Storage delete error:", error);
          }
        }
      } catch (err) {
        console.error("Error parsing cover delete:", err);
      }
    }

    await supabase.from("playlists").update({ cover_url: null }).eq("id", localPlaylist.id);

    const { error } = await supabase.from("playlists").delete().eq("id", localPlaylist.id);

    if (error) {
      console.error("Error deleting playlist:", error);
      return;
    }

    window.location.href = "/dashboard/library?tab=playlists";
  }

  async function onDeleteTrack(trackId: string) {
    if (!isOwner) return;

    const { error } = await supabase
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", localPlaylist.id)
      .eq("track_id", trackId);

    if (error) {
      console.error("Delete error:", error);
      return;
    }

    setPlayerTracks((prev) => prev.filter((t) => t.id !== trackId));
  }

  async function handleTrackAdded(newPlayerTrack: PlayerTrack) {
    if (!isOwner) return;

    const { data: rt, error: rtError } = await supabase
      .from("release_tracks")
      .select(
        `
      id,
      rating_avg,
      rating_count,
      stream_count,
      releases!inner(status)
    `
      )
      .eq("track_id", newPlayerTrack.id)
      .eq("releases.status", "published")
      .maybeSingle<{
        id: string;
        rating_avg: number | null;
        rating_count: number | null;
        stream_count: number | null;
        releases: { status: string };
      }>();

    if (rtError) {
      console.error("Failed to load release_track for added track:", rtError);
      setPlayerTracks((prev) => [...prev, newPlayerTrack]);
      return;
    }

    const enriched: PlayerTrack = {
      ...newPlayerTrack,
      release_track_id: rt?.id ?? null,
      rating_avg: rt?.rating_avg ?? null,
      rating_count: rt?.rating_count ?? 0,
      ...(rt?.stream_count !== null && rt?.stream_count !== undefined
        ? { stream_count: rt.stream_count }
        : {}),
    };

    setPlayerTracks((prev) => [...prev, enriched]);
  }

  if (!isClient) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PlaylistHeaderClient
        playlist={{ ...localPlaylist, cover_url: playlistCoverPublicUrl }}
        playerTracks={playerTracks}
        onEditCover={() => {
          // Cover click should NOT open the details modal anymore.
          // Title/description editing stays in the actions bar modal.
        }}
        onCoverUpdated={(newRelPathOrNull) => {
          setLocalPlaylist((prev) => ({
            ...prev,
            cover_url: newRelPathOrNull,
          }));
        }}
        isOwner={isOwner}
      />

      <PlaylistActionsBar
        isOwner={isOwner}
        playlist={localPlaylist}
        user={user}
        isSavedToLibrary={isSavedToLibrary}
        saveBusy={saveBusy}
        onPlay={() => {}}
        onAddTrack={() => setAddOpen(true)}
        onToggleSaveToLibrary={toggleSaveToLibrary}
        onTogglePublic={async () => {
          await togglePublic();
        }}
        onDeletePlaylist={() => setDeleteOpen(true)}
        onEditDetails={onEditDetails}
      />

      {playerTracks.length ? (
        <PlaylistTrackList
          isOwner={isOwner}
          user={user}
          tracks={playerTracks}
          onDragEnd={onDragEnd}
          onDeleteTrack={(trackId) => {
            if (!isOwner) return;
            void onDeleteTrack(trackId);
          }}
        />
      ) : (
        <PlaylistEmptyState
          isOwner={isOwner}
          onAddTrack={() => setAddOpen(true)}
        />
      )}

      <PlaylistModals
        isOwner={isOwner}
        deleteOpen={deleteOpen}
        setDeleteOpen={setDeleteOpen}
        onDeletePlaylist={async () => {
          await onDeletePlaylist();
        }}
        detailsOpen={detailsOpen}
        setDetailsOpen={setDetailsOpen}
        playlist={localPlaylist}
        onUpdated={(updated) => {
          setLocalPlaylist((prev) => ({
            ...prev,
            ...updated,
            cover_url: updated.cover_url ?? null,
          }));
        }}
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        existingTrackIds={playerTracks.map((t) => t.id)}
        onTrackAdded={handleTrackAdded}
      />
    </div>
  );
}

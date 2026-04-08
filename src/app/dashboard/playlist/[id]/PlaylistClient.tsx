"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import PlaylistHeaderClient from "./PlaylistHeaderClient";
import { reorderPlaylistTracksAction } from "./actions";
import PlaylistActionsBar from "./_components/PlaylistActionsBar";
import PlaylistSuggestedTracks from "./_components/PlaylistSuggestedTracks";
import PlaylistTrackList from "./_components/PlaylistTrackList";
import PlaylistEmptyState from "./_components/PlaylistEmptyState";
import PlaylistModals from "./_components/PlaylistModals";
import { usePlaylistLibrarySave } from "./_hooks/usePlaylistLibrarySave";
import { usePlaylistDnD } from "./_hooks/usePlaylistDnD";

import type { Playlist } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";

type PlaylistClientTrack = PlayerTrack & {
  stream_count?: number | null;
};

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
  initialPlayerTracks: PlaylistClientTrack[];
  user: User | null;
  initialSaved: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [localPlaylist, setLocalPlaylist] = useState(playlist);
  const [playerTracks, setPlayerTracks] = useState<PlaylistClientTrack[]>(initialPlayerTracks);

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

  async function handleTrackAdded(newPlayerTrack: PlaylistClientTrack) {
    if (!isOwner) return;

    const [trackMetaResult, lifetimeResult, ratingsResponse] =
      await Promise.all([
        supabase
          .from("tracks")
          .select("id, version, rating_avg, rating_count")
          .eq("id", newPlayerTrack.id)
          .maybeSingle(),
        supabase
          .from("analytics_track_lifetime")
          .select("track_id, streams_lifetime")
          .eq("track_id", newPlayerTrack.id)
          .maybeSingle(),
        fetch(`/api/ratings?trackId=${encodeURIComponent(newPlayerTrack.id)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
      ]);

    if (trackMetaResult.error) {
      console.error("Failed to load track ratings for added track:", trackMetaResult.error);
    }

    if (lifetimeResult.error) {
      console.error("Failed to load lifetime streams for added track:", lifetimeResult.error);
    }

    if (!ratingsResponse.ok && ratingsResponse.status !== 401) {
      console.error("Failed to load rating state for added track:", {
        status: ratingsResponse.status,
      });
    }

    const trackMeta = (trackMetaResult.data ?? null) as {
      id: string;
    version: string | null;
      rating_avg: number | null;
      rating_count: number | null;
    } | null;

    const lifetimeRow = (lifetimeResult.data ?? null) as {
      track_id: string;
      streams_lifetime: number | null;
    } | null;

    const ratingsJson = ratingsResponse.ok
      ? ((await ratingsResponse.json()) as
          | { ok: true; my_stars: number | null }
          | { ok: false; error: string; code?: string })
      : null;

    const nextMyStars =
      ratingsJson && "ok" in ratingsJson && ratingsJson.ok === true
        ? ratingsJson.my_stars ?? null
        : newPlayerTrack.my_stars ?? null;

    const fallbackStreamCount =
      typeof newPlayerTrack.stream_count === "number"
        ? newPlayerTrack.stream_count
        : 0;

    const enriched: PlayerTrack = {
      ...newPlayerTrack,
      version: trackMeta?.version ?? newPlayerTrack.version ?? null,
      release_id: newPlayerTrack.release_id ?? null,
      rating_avg:
        typeof trackMeta?.rating_avg === "number"
          ? trackMeta.rating_avg
          : newPlayerTrack.rating_avg ?? null,
      rating_count:
        typeof trackMeta?.rating_count === "number"
          ? trackMeta.rating_count
          : newPlayerTrack.rating_count ?? 0,
      my_stars: nextMyStars,
      ...(typeof lifetimeRow?.streams_lifetime === "number"
        ? { stream_count: lifetimeRow.streams_lifetime }
        : { stream_count: fallbackStreamCount }),
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
        tracks={playerTracks}
        startIndex={0}
        onAddTrack={() => setAddOpen(true)}
        onToggleSaveToLibrary={toggleSaveToLibrary}
        onTogglePublic={async () => {
          await togglePublic();
        }}
        onDeletePlaylist={() => setDeleteOpen(true)}
        onEditDetails={onEditDetails}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_450px] xl:items-start">
        <div className="min-w-0">
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
        </div>

        <div className="min-w-0 xl:sticky xl:top-4">
          <PlaylistSuggestedTracks
            playlistId={localPlaylist.id}
            existingTrackIds={playerTracks.map((track) => track.id)}
            isOwner={isOwner}
            onTrackAdded={handleTrackAdded}
          />
        </div>
      </div>

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

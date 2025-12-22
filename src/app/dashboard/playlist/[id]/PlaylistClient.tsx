"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { createBrowserClient } from "@supabase/ssr";
import PlaylistSettingsTrigger from "@/components/PlaylistSettingsTrigger";
import PlaylistRow from "@/components/PlaylistRow";
import DeletePlaylistModal from "@/components/DeletePlaylistModal";
import PlaylistDetailsModal from "@/components/PlaylistDetailsModal";
import PlaylistAddTrackModal from "@/components/PlaylistAddTrackModal";
import PlaylistHeaderClient from "./PlaylistHeaderClient";

import { Playlist, PlaylistTrack } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";

export default function PlaylistClient({
  playlist,
  playlistTracks,
  initialPlayerTracks,
  user,
}: {
  playlist: Playlist;
  playlistTracks: PlaylistTrack[];
  initialPlayerTracks: PlayerTrack[];
  user: any | null;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [localPlaylist, setLocalPlaylist] = useState(playlist);
  const [localTracks, setLocalTracks] = useState<PlaylistTrack[]>(playlistTracks);
  const [playerTracks, setPlayerTracks] = useState<PlayerTrack[]>(initialPlayerTracks);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const isOwner = !!user?.id && user.id === (localPlaylist as any).created_by;

  const [isSavedToLibrary, setIsSavedToLibrary] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load saved state for non-owner
  useEffect(() => {
    let cancelled = false;

    async function loadSaved() {
      if (!user?.id) return;
      if (isOwner) return;

      const { data, error } = await supabase
        .from("library_playlists")
        .select("playlist_id")
        .eq("user_id", user.id)
        .eq("playlist_id", localPlaylist.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Failed to read library_playlists:", error);
        setIsSavedToLibrary(false);
        return;
      }

      setIsSavedToLibrary(!!data);
    }

    void loadSaved();

    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id, isOwner, localPlaylist.id]);

  async function toggleSaveToLibrary() {
    if (!user?.id) return;
    if (isOwner) return;
    if (saveBusy) return;

    setSaveBusy(true);

    if (isSavedToLibrary) {
      const { error } = await supabase
        .from("library_playlists")
        .delete()
        .eq("user_id", user.id)
        .eq("playlist_id", localPlaylist.id);

      if (error) {
        console.error("Failed to remove from library_playlists:", error);
        setSaveBusy(false);
        return;
      }

      setIsSavedToLibrary(false);
      setSaveBusy(false);
      return;
    }

    const { error } = await supabase.from("library_playlists").insert({
      user_id: user.id,
      playlist_id: localPlaylist.id,
    });

    if (error) {
      console.error("Failed to insert into library_playlists:", error);
      setSaveBusy(false);
      return;
    }

    setIsSavedToLibrary(true);
    setSaveBusy(false);
  }

  // Toggle public/private (owner only)
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

  // Delete playlist (owner only)
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

  // Delete track from playlist (owner only)
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

    setLocalTracks((prev) => prev.filter((t) => t.tracks.id !== trackId));
    setPlayerTracks((prev) => prev.filter((t) => t.id !== trackId));
  }

  async function handleTrackAdded(newPlayerTrack: PlayerTrack) {
    if (!isOwner) return;

    setPlayerTracks((prev) => [...prev, newPlayerTrack]);

    const { data, error } = await supabase
      .from("playlist_tracks")
      .select(
        `
        position,
        tracks (
          *,
          releases:releases!tracks_release_id_fkey (
            status,
            cover_path
          ),
          artist:profiles!tracks_artist_id_fkey (
            display_name
          )
        )
      `
      )
      .eq("playlist_id", localPlaylist.id)
      .eq("track_id", newPlayerTrack.id)
      .maybeSingle<PlaylistTrack>();

    if (error) {
      console.error("Failed to fetch newly added playlist track:", error);
    }

    if (data) {
      setLocalTracks((prev) => [...prev, data]);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  if (!isClient) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PlaylistHeaderClient
        playlist={localPlaylist}
        playerTracks={playerTracks}
        onEditCover={() => {
          if (!isOwner) return;
          setDetailsOpen(true);
        }}
        isOwner={isOwner}
      />

      {/* ACTION BAR (below header) */}
      <div className="flex flex-wrap items-center gap-3">
        {isOwner ? (
          <>
            <button
              onClick={() => setAddOpen(true)}
              className="
                flex items-center gap-2
                px-4 h-10 rounded-md
                bg-[#1A1A1C]/80 border border-[#2A2A2D]
                text-white/80 text-sm
                hover:bg-[#2A2A2D]
                hover:text-white
                hover:border-[#00FFC622]
                hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
                backdrop-blur-lg transition
              "
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14m7-7H5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Add Track
            </button>

            <PlaylistSettingsTrigger
              playlist={localPlaylist}
              isOwner={true}
              onTogglePublic={togglePublic}
              onDeletePlaylist={() => setDeleteOpen(true)}
              onEditDetails={onEditDetails}
            />
          </>
        ) : (
          <button
            onClick={toggleSaveToLibrary}
            disabled={saveBusy}
            className="
              flex items-center gap-2
              px-4 h-10 rounded-md
              bg-[#1A1A1C]/80 border border-[#2A2A2D]
              text-white/80 text-sm
              hover:bg-[#2A2A2D]
              hover:text-white
              hover:border-[#00FFC622]
              hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
              backdrop-blur-lg transition
              disabled:opacity-60 disabled:cursor-wait
            "
          >
            {isSavedToLibrary ? "Remove from Library" : "Save to Library"}
          </button>
        )}
      </div>

      {/* Tracks */}
      <div className="space-y-3 rounded-xl bg-neutral-950/40 border border-neutral-900 p-4">
        <div
          className="
            grid grid-cols-[40px_60px_1fr_70px_70px_80px]
            text-xs text-white/50 uppercase tracking-wide
            px-4 py-2
          "
        >
          <span>#</span>
          <span>Cover</span>
          <span>Title</span>
          <span>BPM</span>
          <span>Key</span>
          <span>Actions</span>
        </div>

        {playerTracks.length ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={async ({ active, over }) => {
              if (!isOwner) return;
              if (!over || active.id === over.id) return;

              const oldIndex = playerTracks.findIndex((t) => t.id === active.id);
              const newIndex = playerTracks.findIndex((t) => t.id === over.id);

              const newPlayerTracks = arrayMove(playerTracks, oldIndex, newIndex);
              const newLocalTracks = arrayMove(
                localTracks,
                localTracks.findIndex((t) => t.tracks.id === active.id),
                localTracks.findIndex((t) => t.tracks.id === over.id)
              );

              setPlayerTracks(newPlayerTracks);
              setLocalTracks(newLocalTracks);

              const updates = newLocalTracks.map((item, index) => ({
                playlist_id: localPlaylist.id,
                track_id: item.tracks.id,
                position: index + 1,
              }));

              for (const row of updates) {
                const { error } = await supabase
                  .from("playlist_tracks")
                  .update({ position: row.position })
                  .eq("playlist_id", row.playlist_id)
                  .eq("track_id", row.track_id);

                if (error) {
                  console.error("Position update error:", error);
                  break;
                }
              }
            }}
          >
            <SortableContext
              items={playerTracks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {playerTracks.map((track, index) => (
                  <PlaylistRow
                    key={track.id}
                    track={track}
                    tracks={playerTracks}
                    user={user}
                    onDelete={isOwner ? () => onDeleteTrack(track.id) : undefined}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-white/50">No tracks in this playlist yet.</p>
        )}
      </div>

      {isOwner ? (
        <>
          <DeletePlaylistModal
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={onDeletePlaylist}
          />
          <PlaylistDetailsModal
            isOpen={detailsOpen}
            onClose={() => setDetailsOpen(false)}
            playlist={localPlaylist}
            onUpdated={(updated) => {
              setLocalPlaylist((prev) => ({ ...prev, ...updated }));
            }}
          />
          <PlaylistAddTrackModal
            playlistId={localPlaylist.id}
            open={addOpen}
            onClose={() => setAddOpen(false)}
            existingTrackIds={playerTracks.map((t) => t.id)}
            onTrackAdded={handleTrackAdded}
          />
        </>
      ) : null}
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Play, Pause, Music } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
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
      createSupabaseBrowserClient(),
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

    // 1) Nach Insert: Playlist-Row nachladen (für localTracks UI)
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
      // Fallback: Track trotzdem in Player-Liste aufnehmen (ohne release_track_id)
      setPlayerTracks((prev) => [...prev, newPlayerTrack]);
      return;
    }

    if (data) {
      setLocalTracks((prev) => [...prev, data]);
    }

    // 2) Kritisch: release_track_id + Aggregates aus release_tracks nachladen,
    // damit Rating/Realtime ohne Browser-Refresh korrekt funktioniert.
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
      // stream_count ist optional in PlayerTrack – falls vorhanden, übernehmen
      ...(rt?.stream_count !== null && rt?.stream_count !== undefined
        ? { stream_count: rt.stream_count }
        : {}),
    };

    setPlayerTracks((prev) => [...prev, enriched]);
  }

  const { playQueue, togglePlay, isPlaying, currentTrack, queue } = usePlayer();
  const isThisPlaylistQueueActive =
    !!currentTrack &&
    queue.length === playerTracks.length &&
    queue.every((t, i) => t.id === playerTracks[i]?.id);
  const showPause = isThisPlaylistQueueActive && isPlaying;

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* LEFT: Primary actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Primary: Play (slot) */}
          <button
            type="button"
            className="
              inline-flex items-center justify-center gap-2
              h-11 px-5 rounded-full
              bg-[#0E0E10] border border-[#00FFC633]
              text-[#00FFC6] text-sm font-semibold
              hover:border-[#00FFC666]
              hover:bg-[#00FFC60F]
              transition
              w-full sm:w-auto
              min-w-[132px]
            "
            // TODO: wire this to your global player "play playlist" action
            onClick={() => {
              if (!playerTracks.length) return;

              const sameQueue =
                queue.length === playerTracks.length &&
                queue.every((t, i) => t.id === playerTracks[i]?.id);

              if (sameQueue && currentTrack) {
                togglePlay();
                return;
              }

              playQueue(playerTracks, 0);
            }}
          >
            <span className="inline-flex w-4 items-center justify-center">
              {showPause ? <Pause size={18} /> : <Play size={18} />}
            </span>

            <span className="inline-block w-[52px] text-left">
              {showPause ? "Pause" : "Play"}
            </span>
          </button>

          {/* Primary: Add Track (owner only) */}
          {isOwner ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="
                inline-flex items-center justify-center gap-2
                h-11 px-5 rounded-full
                bg-[#0E0E10] border border-[#00FFC633]
                text-[#00FFC6] text-sm font-semibold
                hover:border-[#00FFC666]
                hover:bg-[#00FFC60F]
                transition
                w-full sm:w-auto
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
          ) : null}
        </div>

        {/* RIGHT: Secondary actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
          {!isOwner ? (
            <button
              type="button"
              onClick={toggleSaveToLibrary}
              disabled={saveBusy}
              className="
                inline-flex items-center justify-center
                h-10 px-4 rounded-full
                bg-transparent border border-[#2A2A2D]
                text-[#B3B3B3] text-sm font-medium
                hover:text-white hover:border-[#3A3A3D]
                transition
                disabled:opacity-60 disabled:cursor-wait
                w-full sm:w-auto
              "
            >
              {isSavedToLibrary ? "Remove from library" : "Save to library"}
            </button>
          ) : null}

          {isOwner ? (
            <div className="w-full sm:w-auto">
              <PlaylistSettingsTrigger
                playlist={localPlaylist}
                isOwner={true}
                onTogglePublic={togglePublic}
                onDeletePlaylist={() => setDeleteOpen(true)}
                onEditDetails={onEditDetails}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-3 rounded-xl bg-neutral-950/40 border border-neutral-900 p-3 md:p-4 -mx-3 md:mx-0">
        <div
          className="
            grid grid-cols-[24px_64px_1fr_36px]
            md:grid-cols-[40px_80px_1fr_70px_70px_80px]
            items-center
            gap-x-4 md:gap-x-3
            text-xs text-white/50 uppercase tracking-wide
            px-4 py-2
          "
        >
          <span>#</span>
          <span>Cover</span>
          <span>Title</span>

          <span className="hidden md:block">BPM</span>
          <span className="hidden md:block">Key</span>

          <span>Actions</span>
        </div>

        {playerTracks.length ? (
          <div className="space-y-2">
            {playerTracks.map((track) => (
              <PlaylistRow
                key={track.id}
                track={track}
                tracks={playerTracks}
                user={user}
                onDelete={() => {
                  if (!isOwner) return;
                  void onDeleteTrack(track.id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-900 bg-neutral-950/30 p-8">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00FFC633] bg-[#00FFC60A]">
                <Music size={22} className="text-[#00FFC6]" />
              </div>

              <h3 className="text-lg font-semibold text-white">
                {isOwner ? "This playlist is empty" : "No tracks yet"}
              </h3>

              <p className="text-sm text-white/60 max-w-md">
                {isOwner
                  ? "Add your first track to get started."
                  : "This playlist doesn’t have any tracks yet."}
              </p>

              {isOwner ? (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="
                    mt-2 inline-flex items-center justify-center gap-2
                    h-11 px-5 rounded-full
                    bg-[#0E0E10] border border-[#00FFC633]
                    text-[#00FFC6] text-sm font-semibold
                    hover:border-[#00FFC666]
                    hover:bg-[#00FFC60F]
                    transition
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
                  Add your first track
                </button>
              ) : null}
            </div>
          </div>
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


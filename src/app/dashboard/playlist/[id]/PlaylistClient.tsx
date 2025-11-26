"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import AddTrackModal from "@/components/AddTrackModal";
import PlaylistSettingsTrigger from "@/components/PlaylistSettingsTrigger";
import PlaylistRow from "@/components/PlaylistRow";
import DeletePlaylistModal from "@/components/DeletePlaylistModal";
import PlaylistDetailsModal from "@/components/PlaylistDetailsModal";
import PlaylistHeaderClient from "./PlaylistHeaderClient";

import { Playlist, PlaylistTrack, Track } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";
import { toPlayerTrack } from "@/lib/playerTrack";

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
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [localPlaylist, setLocalPlaylist] = useState(playlist);
  const [localTracks, setLocalTracks] = useState<PlaylistTrack[]>(playlistTracks);
  const [playerTracks, setPlayerTracks] = useState<PlayerTrack[]>(initialPlayerTracks);

  const [userTracks, setUserTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load all tracks from this user
  useEffect(() => {
    if (!open || !user) return;

    async function load() {
      setLoading(true);

      const { data } = await supabase
        .from("tracks")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false });

      setUserTracks(data ?? []);
      setLoading(false);
    }

    load();
  }, [open, user]);

  // Toggle public/private
  async function togglePublic() {
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
    setDetailsOpen(true);
  }

  // Delete playlist (with cover cleanup)
  async function onDeletePlaylist() {
    const { data: fresh, error: freshError } = await supabase
      .from("playlists")
      .select("cover_url")
      .eq("id", localPlaylist.id)
      .single();

    // 1) Cover löschen (falls vorhanden)
    if (fresh?.cover_url || localPlaylist.cover_url) {
      try {
        const bucketName = "playlist-covers";
        const publicUrl = fresh?.cover_url ?? localPlaylist.cover_url;

        let relativePath = publicUrl?.split("/object/public/playlist-covers/")[1];

        if (!relativePath) {
          console.error("❌ Could not extract relative path");
        } else {
          if (relativePath.includes("?")) {
            relativePath = relativePath.split("?")[0];
          }

          console.log("Deleting cover (playlist delete):", relativePath);

          const { data, error } = await supabase.storage
            .from(bucketName)
            .remove([relativePath]);

          if (error) {
            console.error("❌ Storage delete error:", error);
          } else {
            console.log("✅ Deleted from storage (playlist delete):", data);
          }
        }
      } catch (err) {
        console.error("❌ Error parsing cover delete:", err);
      }
    }

    // 2) cover_url in DB auf NULL setzen
    await supabase
      .from("playlists")
      .update({ cover_url: null })
      .eq("id", localPlaylist.id);

    // 3) Playlist löschen
    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", localPlaylist.id);

    if (error) {
      console.error("Error deleting playlist:", error);
      return;
    }

    // Redirect
    window.location.href = "/dashboard/library";
  }

  // Add Track
  async function onSelectTrack(track: Track) {
    const nextPosition =
      localTracks.length === 0
        ? 1
        : Math.max(...localTracks.map((t) => t.position)) + 1;

    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: localPlaylist.id,
      track_id: track.id,
      position: nextPosition,
    });

    if (error) {
      console.error("Insert error:", error);
      return;
    }

    setLocalTracks((prev) => [
      ...prev,
      { position: nextPosition, tracks: track },
    ]);

    setPlayerTracks((prev) => [...prev, toPlayerTrack(track)]);
    setOpen(false);
  }

  // Delete track from playlist
  async function onDeleteTrack(trackId: string) {
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

  return (
    <div className="space-y-8">
      <PlaylistHeaderClient
        playlist={localPlaylist}
        playerTracks={playerTracks}
        onAddTrack={() => setOpen(true)}
        actions={
          <PlaylistSettingsTrigger
            playlist={localPlaylist}
            isOwner={user?.id === localPlaylist.created_by}
            onTogglePublic={togglePublic}
            onDeletePlaylist={() => setDeleteOpen(true)}
            onEditDetails={onEditDetails}
          />
        }
      />

      <AddTrackModal open={open} onClose={() => setOpen(false)}>
        {loading ? (
          <p className="text-white/60">Loading your tracks…</p>
        ) : (
          <div className="space-y-3">
            {userTracks.map((track) => {
              const alreadyAdded = localTracks.some((t) => t.tracks.id === track.id);

              return (
                <button
                  key={track.id}
                  onClick={() => !alreadyAdded && onSelectTrack(track)}
                  disabled={alreadyAdded}
                  className={`w-full p-3 rounded-md border text-left transition ${
                    alreadyAdded
                      ? "bg-neutral-700/40 border-neutral-600 text-white/30 cursor-not-allowed"
                      : "bg-neutral-800/60 border-neutral-700 hover:bg-neutral-700/60"
                  }`}
                >
                  <span className="font-semibold">{track.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </AddTrackModal>

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
          <div className="space-y-2">
            {playerTracks.map((track, index) => (
              <PlaylistRow
                key={track.id}
                index={index + 1}
                track={track}
                tracks={playerTracks}
                onDelete={() => onDeleteTrack(track.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-white/50">No tracks in this playlist yet.</p>
        )}
      </div>

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
    </div>
  );
}

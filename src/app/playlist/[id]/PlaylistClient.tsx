"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import AddTrackButton from "@/components/AddTrackButton";
import AddTrackModal from "@/components/AddTrackModal";
import PlaylistRow from "@/components/PlaylistRow";
import { Playlist, PlaylistTrack, Track } from "@/types/database";

export default function PlaylistClient({
  playlist,
  playlistTracks,
}: {
  playlist: Playlist;
  playlistTracks: PlaylistTrack[];
}) {
  const [open, setOpen] = useState(false);
  const [userTracks, setUserTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [localTracks, setLocalTracks] = useState<PlaylistTrack[]>(playlistTracks);

  // Tracks des Users laden, sobald Modal geöffnet wird
  useEffect(() => {
    if (!open) return;

    async function loadTracks() {
      setLoading(true);

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserTracks([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("tracks")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false });

      setUserTracks((data as Track[]) || []);
      setLoading(false);
    }

    loadTracks();
  }, [open]);

  // Track zur Playlist hinzufügen
  async function onSelectTrack(track: Track) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const nextPosition =
      localTracks.length === 0
        ? 1
        : Math.max(...localTracks.map((t) => t.position)) + 1;

    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: playlist.id,
      track_id: track.id,
      position: nextPosition,
    });

    if (error) {
      console.error("Insert error:", error);
      return;
    }

    // UI direkt updaten
    setLocalTracks((prev) => [
      ...prev,
      { position: nextPosition, tracks: track },
    ]);

    setOpen(false);
  }

  async function onDeleteTrack(trackId: string) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Delete row in playlist_tracks
    const { error } = await supabase
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", playlist.id)
      .eq("track_id", trackId);

    if (error) {
      console.error("Delete error:", error);
      return;
    }

    // Optimistic UI update
    setLocalTracks((prev) => prev.filter((t) => t.tracks.id !== trackId));
  }

  return (
    <div className="space-y-8">
      {/* Add Track Button + Modal */}
      <AddTrackButton onClick={() => setOpen(true)} />

      <AddTrackModal open={open} onClose={() => setOpen(false)}>
        {loading ? (
          <p className="text-white/60">Loading your tracks…</p>
        ) : userTracks.length === 0 ? (
          <p className="text-white/60">You have no tracks yet.</p>
        ) : (
          <div className="space-y-3">
            {userTracks.map((track) => {
              const alreadyAdded = localTracks.some(
                (t) => t.tracks.id === track.id
              );

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
                  <p className="text-xs text-white/40">BPM: {track.bpm ?? "?"}</p>
                  {alreadyAdded && (
                    <p className="text-xs text-[#00FFC6]/60 mt-1">
                      Already in playlist
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </AddTrackModal>

      {/* TRACKS TABLE — immer aus localTracks */}
      <div className="space-y-3 rounded-xl bg-neutral-950/40 border border-neutral-900 p-4">
        {/* Header Row */}
        <div
          className="
            grid grid-cols-[40px_60px_1fr_70px_70px_80px]
            items-center
            gap-4
            px-4 py-2
            text-xs
            text-white/50
            uppercase
            tracking-wide
          "
        >
          <span>#</span>
          <span>Cover</span>
          <span>Title</span>
          <span>BPM</span>
          <span>Key</span>
          <span>Actions</span>
        </div>

        {/* Tracks */}
        {localTracks.length > 0 ? (
          <div className="space-y-2">
            {localTracks.map((pt, index) => (
              <PlaylistRow
                key={pt.tracks.id}
                index={index + 1}
                track={pt.tracks}
                onDelete={() => onDeleteTrack(pt.tracks.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-white/60 col-span-full">
            No tracks in this playlist yet.
          </p>
        )}
      </div>
    </div>
  );
}

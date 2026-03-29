"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PlayerTrack } from "@/types/playerTrack";

function showNotice(message: string) {
  window.dispatchEvent(
    new CustomEvent("immusic:notice", { detail: { message } })
  );
}

type PlaylistRow = {
  id: string;
  title: string | null;
  description: string | null;
  cover_url: string | null;
  created_at: string | null;
  cover_public_url?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  track: PlayerTrack;
};

export default function AddToPlaylistModal({
  open,
  onClose,
  track,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const trackId = (track as any)?.id as string | undefined;

  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (loadedOnce) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        setLoading(false);
        showNotice("You must be logged in.");
        onClose();
        return;
      }

      const { data, error } = await supabase
        .from("playlists")
        .select("id,title,description,cover_url,created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Failed to load playlists:", error);
        setPlaylists([]);
      } else {
        const mapped = (data as PlaylistRow[]).map((pl) => {
          let coverPublicUrl: string | null = null;

          if (pl.cover_url) {
            const { data: pub } = supabase
              .storage
              .from("playlist-covers")
              .getPublicUrl(pl.cover_url);

            coverPublicUrl = pub?.publicUrl ?? null;
          }

          return {
            ...pl,
            cover_public_url: coverPublicUrl,
          };
        });

        setPlaylists(mapped);
      }

      setLoadedOnce(true);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, loadedOnce, onClose, supabase]);

  const addToPlaylist = async (playlistId: string) => {
    if (!trackId) {
      showNotice("Track could not be added.");
      return;
    }
    if (busyId) return;

    setBusyId(playlistId);

    const { data: existing } = await supabase
      .from("playlist_tracks")
      .select("id")
      .eq("playlist_id", playlistId)
      .eq("track_id", trackId)
      .maybeSingle();

    if (existing) {
      showNotice("Track is already in this playlist.");
      setBusyId(null);
      return;
    }

    let nextPosition = 1;
    const { data: lastRow } = await supabase
      .from("playlist_tracks")
      .select("position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRow?.position) {
      nextPosition = Number(lastRow.position) + 1;
    }

    const { error: insertErr } = await supabase.from("playlist_tracks").insert({
      playlist_id: playlistId,
      track_id: trackId,
      position: nextPosition,
    });

    if (insertErr) {
      console.error("Failed to add track to playlist:", insertErr);
      showNotice("Could not add track to playlist.");
      setBusyId(null);
      return;
    }

    showNotice("Added to playlist.");
    setBusyId(null);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.55)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-white">
              Add to <span className="text-[#00FFC6]">playlist</span>
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Choose a playlist for{" "}
              <span className="text-white/80">{track?.title ?? "this track"}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition cursor-pointer hover:bg-white/[0.06] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          >
            Close
          </button>
        </div>

        <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
          {loading && <p className="text-sm text白/60">Loading playlists…</p>}

          {!loading && playlists.length === 0 && (
            <p className="text-sm text白/50">
              No playlists found. Create one first in your Library.
            </p>
          )}

          {!loading &&
            playlists.map((pl) => {
              const isBusy = busyId === pl.id;

              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => void addToPlaylist(pl.id)}
                  disabled={!!busyId}
                  className={`group w-full text-left flex items-center gap-3 rounded-xl border border白/10 bg白/[0.03] px-4 py-3 transition ${
                    isBusy
                      ? "opacity-60 cursor-wait"
                      : "hover:bg白/[0.06] hover:border-[#00FFC6]/60 cursor-pointer"
                  }`}
                >
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border白/10 bg白/[0.03]">
                    {pl.cover_public_url ? (
                      <img
                        src={pl.cover_public_url}
                        alt={pl.title ?? "Playlist cover"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg白/[0.04]" />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col min-w-0">
                    <span className="text-[15px] font-semibold text白 truncate">
                      {pl.title ?? "Untitled playlist"}
                    </span>
                    {pl.description && (
                      <span className="text-xs text白/60 line-clamp-1">
                        {pl.description}
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-semibold text-[#00FFC6] opacity-0 group-hover:opacity-100 transition">
                    {isBusy ? "Adding…" : "Add"}
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </div>,
    document.body
  );
}

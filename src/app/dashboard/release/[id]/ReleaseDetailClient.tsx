"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ReleaseTrackRowClient from "./ReleaseTrackRowClient";
import type { PlayerTrack } from "@/types/playerTrack";

type Artist = {
  id: string;
  display_name: string;
};

type ReleaseDetailTrack = {
  releaseTrackId: string;
  trackId: string;
  positionLabel: string;
  title: string | null;
  lyrics: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  version: string | null;
  status: string | null;
  is_explicit: boolean;
  duration: string | null;
  ratingAvg: number | null;
  ratingCount: number | null;
  streamCount: number;
  artists: Artist[];
};

export default function ReleaseDetailClient({
  releaseId,
  releaseCoverUrl,
  playerQueue,
  tracks,
  canSaveRelease,
  currentUserId,
  initialSaved,
}: {
  releaseId: string;
  releaseCoverUrl: string | null;
  playerQueue: PlayerTrack[];
  tracks: ReleaseDetailTrack[];
  canSaveRelease: boolean;
  currentUserId: string | null;
  initialSaved: boolean;
}) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tracks[0]?.trackId ?? "");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isSavedToLibrary, setIsSavedToLibrary] = useState(initialSaved);
  const [saveBusy, setSaveBusy] = useState(false);

  async function toggleSaveToLibrary() {
    if (!canSaveRelease || !currentUserId || saveBusy) return;

    setSaveBusy(true);

    if (isSavedToLibrary) {
      const { error } = await supabase
        .from("library_releases")
        .delete()
        .eq("user_id", currentUserId)
        .eq("release_id", releaseId);

      if (error) {
        console.error("Failed to remove release from library:", error);
        setSaveBusy(false);
        return;
      }

      setIsSavedToLibrary(false);
      setSaveBusy(false);
      return;
    }

    const { error } = await supabase.from("library_releases").insert({
      user_id: currentUserId,
      release_id: releaseId,
    });

    if (error) {
      console.error("Failed to save release to library:", error);
      setSaveBusy(false);
      return;
    }

    setIsSavedToLibrary(true);
    setSaveBusy(false);
  }

  const selectedTrack = useMemo(() => {
    return tracks.find((track) => track.trackId === selectedTrackId) ?? tracks[0] ?? null;
  }, [tracks, selectedTrackId]);

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Tracks</h2>

        {canSaveRelease ? (
          <button
            type="button"
            onClick={() => {
              void toggleSaveToLibrary();
            }}
            disabled={saveBusy}
            className={`inline-flex min-w-[148px] justify-center items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              isSavedToLibrary
                ? "border-white/12 bg-white/[0.04] text-white/78"
                : "border-white/10 bg-transparent text-white/60 hover:border-white/15 hover:text-white/82"
            } ${saveBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            {isSavedToLibrary ? "Saved to Library" : "Save to Library"}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-16 items-start">
      <div>
        {tracks.length ? (
          <div className="divide-y divide-white/10">
            {tracks.map((row, index) => (
              <ReleaseTrackRowClient
                key={row.releaseTrackId}
                releaseTrackId={row.releaseTrackId}
                releaseId={releaseId}
                startIndex={index}
                playerQueue={playerQueue}
                positionLabel={row.positionLabel}
                track={{
                  id: row.trackId,
                  title: row.title,
                  bpm: row.bpm,
                  key: row.key,
                  genre: row.genre,
                  version: row.version,
                  status: row.status,
                is_explicit: row.is_explicit,
                }}
                artists={row.artists}
                ratingAvg={row.ratingAvg}
                ratingCount={row.ratingCount}
                streamCount={row.streamCount}
                duration={row.duration}
                releaseCoverUrl={releaseCoverUrl}
                isActive={row.trackId === selectedTrack?.trackId}
                onSelect={() => setSelectedTrackId(row.trackId)}
              />
            ))}
          </div>
        ) : (
          <div className="text-neutral-400">No tracks found.</div>
        )}
      </div>

      <aside className="xl:sticky xl:top-6 pt-1 xl:border-l xl:border-white/10 xl:pl-8">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          Lyrics
        </h2>

        {selectedTrack ? (
          <>
            <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
              {selectedTrack.lyrics?.trim() ? (
                <div className="mt-4 max-w-[60ch] whitespace-pre-wrap text-[15px] leading-8 text-white/78">
                  {selectedTrack.lyrics}
                </div>
              ) : (
                <div className="text-sm text-white/45">
                  No lyrics available for this track.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 text-sm text-white/45">
            No track selected.
          </div>
        )}
      </aside>
    </div>
  </div>
  );
}

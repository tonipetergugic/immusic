"use client";

import { useMemo, useState } from "react";
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
}: {
  releaseId: string;
  releaseCoverUrl: string | null;
  playerQueue: PlayerTrack[];
  tracks: ReleaseDetailTrack[];
}) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tracks[0]?.trackId ?? "");

  const selectedTrack = useMemo(() => {
    return tracks.find((track) => track.trackId === selectedTrackId) ?? tracks[0] ?? null;
  }, [tracks, selectedTrackId]);

  return (
    <div className="mt-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
      <div>
        <h2 className="text-lg font-semibold mb-3">Tracks</h2>

        {tracks.length ? (
          <div className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10 bg-black/20">
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

      <aside className="xl:sticky xl:top-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-5">
        <div className="text-sm font-medium text-white/55 uppercase tracking-[0.18em]">
          Lyrics
        </div>

        {selectedTrack ? (
          <>
            <h3 className="mt-3 text-lg font-semibold text-white">
              {selectedTrack.title ?? "Untitled"}
            </h3>

            <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
              {selectedTrack.lyrics?.trim() ? (
                <div className="whitespace-pre-wrap text-sm leading-7 text-white/78">
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
  );
}

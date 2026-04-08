"use client";

import { useMemo, useState } from "react";
import TrackRowBase from "@/components/TrackRowBase";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRatingInline from "@/components/TrackRatingInline";
import LibraryTrackArtists from "@/components/LibraryTrackArtists";
import type { PlayerTrack } from "@/types/playerTrack";
import { usePlayer } from "@/context/PlayerContext";

export type LibraryV2TracksPayload = {
  tracks: PlayerTrack[];
  ratingByTrackId: Record<string, { avg: number | null; count: number; streams: number }>;
  myStarsByTrackId: Record<string, number | null>;
  eligibilityByTrackId: Record<string, { can_rate: boolean | null; listened_seconds: number | null }>;
  windowOpenByTrackId: Record<string, boolean | null>;
};

export function TracksSection({ payload }: { payload: LibraryV2TracksPayload }) {
  const [trackData, setTrackData] = useState<PlayerTrack[]>(payload.tracks);
  const { isTrackPlaybackBlocked } = usePlayer();
  const ratingByTrackId = payload.ratingByTrackId;
  const myStarsByTrackId = payload.myStarsByTrackId;
  const eligibilityByTrackId = payload.eligibilityByTrackId;
  const windowOpenByTrackId = payload.windowOpenByTrackId;

  const summary = useMemo(() => {
    const artistCount = new Set(
      trackData
        .map((track) => String(track.artist_id ?? ""))
        .filter(Boolean)
    ).size;

    const genreCount = new Set(
      trackData
        .map((track) =>
          typeof track.genre === "string" ? track.genre.trim() : ""
        )
        .filter(Boolean)
    ).size;

    return {
      tracks: trackData.length,
      artists: artistCount,
      genres: genreCount,
    };
  }, [trackData]);

  return (
    <div className="pt-4 pb-10">
      {trackData.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 flex flex-col">
            {trackData.map((track, index) => {
              const isBlocked = isTrackPlaybackBlocked(track);
              return (
                <TrackRowBase
                  key={`library-trackrow:${track.id}`}
                  track={track}
                  index={index}
                  tracks={trackData}
                  coverSize="sm"
                  leadingSlot={<span className="text-white/50 text-[11px] tabular-nums">{index + 1}</span>}
                  subtitleSlot={
                    <LibraryTrackArtists
                      artists={track.artists}
                      fallbackArtistId={track.artist_id ?? null}
                      fallbackDisplayName={track.profiles?.display_name ?? "Unknown Artist"}
                      isBlocked={isBlocked}
                      disableLinks={isBlocked}
                    />
                  }
                  metaSlot={(() => {
                    const trackId = String(track.id);
                    const summary = ratingByTrackId[trackId] ?? { avg: null, count: 0, streams: 0 };
                    const myStars = myStarsByTrackId[trackId] ?? null;
                    const elig = eligibilityByTrackId[trackId] ?? { can_rate: null, listened_seconds: null };

                    return (
                      <TrackRatingInline
                        trackId={trackId}
                        initialAvg={summary.avg}
                        initialCount={summary.count}
                        initialStreams={summary.streams}
                        initialMyStars={myStars}
                        readOnly={isBlocked}
                        initialEligibility={{
                          window_open: windowOpenByTrackId[trackId] ?? null,
                          can_rate: elig.can_rate,
                          listened_seconds: elig.listened_seconds,
                        }}
                      />
                    );
                  })()}
                  bpmSlot={
                    <span className="tabular-nums">
                      {track.bpm ?? "—"}
                    </span>
                  }
                  keySlot={
                    <span>
                      {track.key ?? "—"}
                    </span>
                  }
                  genreSlot={
                    <span className="truncate">
                      {track.genre ?? "—"}
                    </span>
                  }
                  actionsSlot={
                    <div onClick={(e) => e.stopPropagation()}>
                      <TrackOptionsTrigger
                        track={track}
                        onLibraryRemoved={() => {
                          setTrackData((prev) => prev.filter((item) => String(item.id) !== String(track.id)));
                        }}
                      />
                    </div>
                  }
                />
              );
            })}
          </div>

          <div className="min-w-0 xl:sticky xl:top-4 xl:border-l xl:border-white/10 xl:pl-6">
            <div>
              <h3 className="text-2xl font-semibold text-white">
                Library <span className="text-[#00FFC6]">Summary</span>
              </h3>

              <p className="mt-1 text-sm text-white/50">
                A quick overview of your saved tracks.
              </p>

              <div className="mt-6 space-y-6">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                    Tracks
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-white">
                    {summary.tracks}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                    Artists
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-white">
                    {summary.artists}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                    Genres
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-white">
                    {summary.genres}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-neutral-400">No tracks found.</p>
      )}
    </div>
  );
}

"use client";

import TrackRowBase from "@/components/TrackRowBase";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRatingInline from "@/components/TrackRatingInline";
import HomeArtistSpotlightCard from "@/app/dashboard/_components/HomeArtistSpotlightCard";
import type { PlayerTrack } from "@/types/playerTrack";

export type LibraryV2TracksPayload = {
  tracks: PlayerTrack[];
  releaseTrackIdByTrackId: Record<string, string>;
  ratingByReleaseTrackId: Record<string, { avg: number | null; count: number; streams: number }>;
  myStarsByReleaseTrackId: Record<string, number | null>;
  eligibilityByTrackId: Record<string, { can_rate: boolean | null; listened_seconds: number | null }>;
  windowOpenByTrackId: Record<string, boolean | null>;
};

export function TracksSection({ payload }: { payload: LibraryV2TracksPayload }) {
  const trackData = payload.tracks;
  const releaseTrackIdByTrackId = payload.releaseTrackIdByTrackId;
  const ratingByReleaseTrackId = payload.ratingByReleaseTrackId;
  const myStarsByReleaseTrackId = payload.myStarsByReleaseTrackId;
  const eligibilityByTrackId = payload.eligibilityByTrackId;
  const windowOpenByTrackId = payload.windowOpenByTrackId;

  return (
    <div className="pt-4 pb-10">
      {trackData.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 flex flex-col">
            {trackData.map((track, index) => {
              const releaseTrackId = releaseTrackIdByTrackId[String(track.id)];
              return (
                <TrackRowBase
                  key={`library-trackrow:${track.id}`}
                  track={track}
                  index={index}
                  tracks={trackData}
                  coverSize="sm"
                  leadingSlot={<span className="text-white/50 text-[11px] tabular-nums">{index + 1}</span>}
                  subtitleSlot={
                    (track as any)?.artist_id ? (
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() =>
                          window.location.assign(`/dashboard/artist/${String((track as any).artist_id)}`)
                        }
                        className="mt-1 text-left text-xs text-white/60 truncate hover:text-[#00FFC6] hover:underline underline-offset-2 transition-colors cursor-pointer focus:outline-none"
                        title={String((track as any)?.profiles?.display_name ?? "Unknown Artist")}
                      >
                        {(track as any)?.profiles?.display_name ?? "Unknown Artist"}
                      </button>
                    ) : (
                      <div className="mt-1 text-left text-xs text-white/60 truncate">
                        {(track as any)?.profiles?.display_name ?? "Unknown Artist"}
                      </div>
                    )
                  }
                  metaSlot={
                    releaseTrackIdByTrackId[String(track.id)] ? (() => {
                      const rid = releaseTrackIdByTrackId[String(track.id)];
                      const summary = ratingByReleaseTrackId[rid] ?? { avg: null, count: 0, streams: 0 };
                      const myStars = myStarsByReleaseTrackId[rid] ?? null;
                      const elig = eligibilityByTrackId[String(track.id)] ?? { can_rate: null, listened_seconds: null };

                      return (
                        <TrackRatingInline
                          releaseTrackId={rid}
                          trackId={String(track.id)}
                          initialAvg={summary.avg}
                          initialCount={summary.count}
                          initialStreams={summary.streams}
                          initialMyStars={myStars}
                          initialEligibility={{
                            window_open: windowOpenByTrackId[String(track.id)] ?? null,
                            can_rate: elig.can_rate,
                            listened_seconds: elig.listened_seconds,
                          }}
                        />
                      );
                    })() : null
                  }
                  actionsSlot={
                    <div onClick={(e) => e.stopPropagation()}>
                      <TrackOptionsTrigger track={track as any} />
                    </div>
                  }
                />
              );
            })}
          </div>

          <div className="min-w-0 xl:sticky xl:top-4">
            <HomeArtistSpotlightCard tracks={trackData} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-neutral-400">No tracks found.</p>
      )}
    </div>
  );
}

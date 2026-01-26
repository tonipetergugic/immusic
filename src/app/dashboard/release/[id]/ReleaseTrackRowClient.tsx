"use client";

import { useRouter } from "next/navigation";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRowBase from "@/components/TrackRowBase";
import TrackRatingInline from "@/components/TrackRatingInline";
import type { PlayerTrack } from "@/types/playerTrack";
import { formatTrackTitle } from "@/lib/formatTrackTitle";

export default function ReleaseTrackRowClient({
  releaseTrackId,
  releaseId,
  startIndex,
  playerQueue,
  positionLabel,
  track,
  artists,
  ratingAvg,
  ratingCount,
  duration,
  streamCount,
  releaseCoverUrl,
}: {
  releaseTrackId: string;
  releaseId: string;
  startIndex: number;
  playerQueue: PlayerTrack[];
  positionLabel: string;
  track: { id: string; title: string | null; bpm: number | null; key: string | null; genre: string | null; version: string | null };
  artists: { id: string; display_name: string }[];
  ratingAvg: number | null;
  ratingCount: number | null;
  duration: string | null;
  streamCount: number;
  releaseCoverUrl: string | null;
}) {
  const router = useRouter();

  return (
    <div className="cursor-default">
      <TrackRowBase
        track={
          {
            id: track.id,
            title: track.title ?? null,
            artist_id: (artists?.[0]?.id ?? null) as any,
            release_id: releaseId,
            bpm: track.bpm ?? null,
            key: track.key ?? null,
            cover_url: releaseCoverUrl ?? null,
          } as any
        }
        index={startIndex}
        tracks={playerQueue}
        coverSize="md"
        leadingSlot={
          <span className="text-white/50 text-[11px] tabular-nums">
            {positionLabel}
          </span>
        }
        titleSlot={
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/track/${track.id}`);
            }}
            className="
            text-left text-[13px] font-semibold text-white truncate
            hover:text-[#00FFC6] transition-colors
            focus:outline-none
          "
            title={formatTrackTitle(track.title, (track as any).version)}
          >
            {formatTrackTitle(track.title, (track as any).version)}
          </button>
        }
        subtitleSlot={
          Array.isArray(artists) && artists.length > 0 ? (
            <div className="mt-1 text-left text-xs text-white/60 truncate">
              {artists.map((a, idx) => (
                <span key={a.id}>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/dashboard/artist/${a.id}`);
                    }}
                    className="
                      hover:text-[#00FFC6] hover:underline underline-offset-2
                      transition-colors
                      focus:outline-none
                    "
                    title={a.display_name}
                  >
                    {a.display_name}
                  </button>
                  {idx < artists.length - 1 ? ", " : null}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-xs text-white/40 truncate">Unknown artist</div>
          )
        }
        metaSlot={
          <TrackRatingInline
            releaseTrackId={releaseTrackId}
            initialAvg={ratingAvg ?? null}
            initialCount={ratingCount ?? 0}
            initialStreams={streamCount ?? 0}
            initialMyStars={(null as any)}
            showStreamsOnDesktopOnly={true}
          />
        }
        bpmSlot={<span>{track.bpm ?? "—"}</span>}
        keySlot={<span>{track.key ?? "—"}</span>}
        genreSlot={<span>{track.genre ?? "—"}</span>}
        actionsSlot={
          <div onClick={(e) => e.stopPropagation()}>
            <TrackOptionsTrigger
              track={{
                ...(track as any),
                id: track.id,
                artist_id: (artists?.[0]?.id ?? null),
              }}
              showGoToRelease={false}
            />
          </div>
        }
      />
    </div>
  );
}


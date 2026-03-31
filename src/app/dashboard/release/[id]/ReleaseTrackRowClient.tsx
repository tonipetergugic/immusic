"use client";

import { useRouter } from "next/navigation";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRowBase from "@/components/TrackRowBase";
import TrackRatingInline from "@/components/TrackRatingInline";
import type { PlayerTrack } from "@/types/playerTrack";
import { formatTrackTitle } from "@/lib/formatTrackTitle";
import ExplicitBadge from "@/components/ExplicitBadge";

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
  isActive,
  onSelect,
}: {
  releaseTrackId: string;
  releaseId: string;
  startIndex: number;
  playerQueue: PlayerTrack[];
  positionLabel: string;
  track: {
    id: string;
    title: string | null;
    bpm: number | null;
    key: string | null;
    genre: string | null;
    version: string | null;
    status: string | null;
    is_explicit: boolean;
  };
  artists: { id: string; display_name: string }[];
  ratingAvg: number | null;
  ratingCount: number | null;
  duration: number | null;
  streamCount: number;
  releaseCoverUrl: string | null;
  isActive: boolean;
  onSelect: () => void;
}) {
  const router = useRouter();
  const rowTrack: PlayerTrack = {
    id: track.id,
    title: track.title ?? "Untitled",
    version: track.version ?? null,
    artist_id: artists?.[0]?.id ?? "",
    status: track.status ?? null,
    is_explicit: track.is_explicit,
    cover_url: releaseCoverUrl ?? null,
    audio_url: "",
    bpm: track.bpm ?? null,
    key: track.key ?? null,
    genre: track.genre ?? null,
    release_id: releaseId,
    profiles: artists?.[0]?.display_name
      ? { display_name: artists[0].display_name }
      : undefined,
  };

  return (
    <div
      onClick={onSelect}
      className="cursor-pointer hover:bg-white/[0.04] transition-colors"
    >
      <TrackRowBase
        track={rowTrack}
        index={startIndex}
        tracks={playerQueue}
        coverSize="md"
        leadingSlot={
          <span className="text-white/50 text-[11px] tabular-nums">
            {positionLabel}
          </span>
        }
        titleSlot={
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className={`min-w-0 flex-1 text-left text-[13px] font-semibold truncate transition-colors focus:outline-none cursor-pointer ${
                track.status === "performance"
                  ? "text-[#00FFC6] hover:text-[#00E0B0]"
                  : "text-white hover:text-[#00FFC6]"
              }`}
              title={formatTrackTitle(track.title, track.version)}
            >
              {formatTrackTitle(track.title, track.version)}
            </button>

            {track.is_explicit ? <ExplicitBadge /> : null}
          </div>
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
                      focus:outline-none cursor-pointer
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
            trackId={track.id}
            initialAvg={ratingAvg ?? null}
            initialCount={ratingCount ?? 0}
            initialStreams={streamCount ?? 0}
            initialMyStars={null}
            showStreamsOnDesktopOnly={true}
          />
        }
        bpmSlot={<span>{track.bpm ?? "—"}</span>}
        keySlot={<span>{track.key ?? "—"}</span>}
        genreSlot={<span>{track.genre ?? "—"}</span>}
        actionsSlot={
          <div onClick={(e) => e.stopPropagation()}>
            <TrackOptionsTrigger
              track={rowTrack}
              releaseId={releaseId}
              showGoToRelease={false}
            />
          </div>
        }
      />
    </div>
  );
}


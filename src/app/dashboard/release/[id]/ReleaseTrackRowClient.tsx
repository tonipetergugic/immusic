"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/context/PlayerContext";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRowBase from "@/components/TrackRowBase";
import TrackRatingInline from "@/components/TrackRatingInline";
import { getReleaseQueueAction } from "./actions";
import type { PlayerTrack } from "@/types/playerTrack";

const queueCache = new Map<string, PlayerTrack[]>();
const inflight = new Map<string, Promise<PlayerTrack[]>>();

async function loadQueue(releaseId: string): Promise<PlayerTrack[]> {
  if (queueCache.has(releaseId)) return queueCache.get(releaseId)!;
  if (inflight.has(releaseId)) return inflight.get(releaseId)!;

  const p = (async () => {
    const q = (await getReleaseQueueAction(releaseId)) as PlayerTrack[];
    queueCache.set(releaseId, q);
    inflight.delete(releaseId);
    return q;
  })();

  inflight.set(releaseId, p);
  return p;
}

export default function ReleaseTrackRowClient({
  releaseTrackId,
  releaseId,
  startIndex,
  positionLabel,
  track,
  artistId,
  artistName,
  ratingAvg,
  ratingCount,
  duration,
  streamCount,
  releaseCoverUrl,
}: {
  releaseTrackId: string;
  releaseId: string;
  startIndex: number;
  positionLabel: string;
  track: { id: string; title: string | null; bpm: number | null; key: string | null; genre: string | null };
  artistId: string;
  artistName: string;
  ratingAvg: number | null;
  ratingCount: number | null;
  duration: string | null;
  streamCount: number;
  releaseCoverUrl: string | null;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<PlayerTrack[]>([]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const q = await loadQueue(releaseId);
      if (!mounted) return;
      setQueue(q ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, [releaseId]);

  return (
    <div className="cursor-default">
      <TrackRowBase
        track={
          {
            id: track.id,
            title: track.title ?? null,
            artist_id: artistId ?? null,
            release_id: releaseId,
            bpm: track.bpm ?? null,
            key: track.key ?? null,
            cover_url: releaseCoverUrl ?? null,
          } as any
        }
        index={startIndex}
        tracks={queue}
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
            title={track.title ?? ""}
          >
            {track.title ?? "—"}
          </button>
        }
        subtitleSlot={
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/artist/${artistId}`);
            }}
            className="
              mt-1 text-left text-xs text-white/60 truncate
              hover:text-[#00FFC6] hover:underline underline-offset-2
              transition-colors
              focus:outline-none
            "
            title={artistName}
          >
            {artistName}
          </button>
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
                artist_id: artistId,
              }}
            />
          </div>
        }
      />
    </div>
  );
}


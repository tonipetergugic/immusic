"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import PlayReleaseTrackButton from "./PlayReleaseTrackButton";
import { getReleaseQueueAction } from "./actions";
import type { PlayerTrack } from "@/types/playerTrack";
import { rateReleaseTrackAction } from "@/app/dashboard/playlist/[id]/actions";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

function StarRating({
  avg,
  count,
  releaseTrackId,
  submitting,
  onRate,
}: {
  avg: number | null;
  count: number | null;
  releaseTrackId: string;
  submitting: boolean;
  onRate: (value: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const effective = hover ?? avg ?? 0;

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={submitting}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onRate(n);
            }}
            className={`transition-colors ${
              submitting ? "opacity-60 cursor-not-allowed" : "hover:text-[#00FFC6]"
            } ${effective >= n ? "text-[#00FFC6]" : "text-neutral-600"}`}
          >
            ★
          </button>
        ))}
      </div>

      {count && count > 0 ? (
        <span className="tabular-nums">
          {Number(avg ?? 0).toFixed(1)} ({count})
        </span>
      ) : (
        <span className="text-neutral-600">No ratings</span>
      )}
    </div>
  );
}

export default function ReleaseTrackRowClient({
  releaseTrackId,
  releaseId,
  startIndex,
  positionLabel,
  track,
  artistId,
  ratingAvg,
  ratingCount,
  duration,
  streamCount,
}: {
  releaseTrackId: string;
  releaseId: string;
  startIndex: number;
  positionLabel: string;
  track: { id: string; title: string | null; bpm: number | null; key: string | null };
  artistId: string;
  ratingAvg: number | null;
  ratingCount: number | null;
  duration: string | null;
  streamCount: number;
}) {
  const { currentTrack, isPlaying, playQueue, pause, seek } = usePlayer();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [submitting, setSubmitting] = useState(false);
  const [agg, setAgg] = useState<{
    rating_avg: number | null;
    rating_count: number;
    stream_count: number;
  }>({
    rating_avg: ratingAvg ?? null,
    rating_count: ratingCount ?? 0,
    stream_count: streamCount ?? 0,
  });
  const isCurrent = isPlaying && currentTrack?.id === track.id;

  function showNotice(message: string) {
    window.dispatchEvent(new CustomEvent("immusic:notice", { detail: { message } }));
  }

  function mapNotice(raw: string) {
    const m = (raw ?? "").toLowerCase();
    if (m.includes("30 second")) return "Please listen at least 30 seconds to rate this track.";
    if (m.includes("listener")) return "Only listeners can rate tracks.";
    return "Rating failed. Please try again.";
  }

  async function handleRate(value: number) {
    if (submitting) return;
    if (!releaseTrackId) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.set("releaseTrackId", releaseTrackId);
      formData.set("stars", String(value));

      const result = await rateReleaseTrackAction(formData);

      if (!result?.ok) {
        showNotice(mapNotice(result?.error ?? ""));
        return;
      }

      router.refresh();
      showNotice("Saved rating");
      // optimistic: keep agg in sync until refresh resolves
      setAgg((prev) => ({
        ...prev,
        rating_count: (prev.rating_count ?? 0) + 1,
        rating_avg: value, // temporary; realtime will correct
      }));
    } catch (err) {
      console.error("RATE ERROR (release detail)", err);
      const raw = err instanceof Error ? err.message : "";
      showNotice(mapNotice(raw));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRowClick() {
    // Toggle Pause wenn derselbe Track aktiv ist
    if (isCurrent) {
      pause();
      return;
    }

    const queue = await loadQueue(releaseId);
    if (!queue.length) return;

    const safeIndex = Math.min(Math.max(startIndex, 0), queue.length - 1);
    playQueue(queue, safeIndex);
  }

  useEffect(() => {
    if (!releaseTrackId) return;

    const channel = supabase
      .channel(`rt:${releaseTrackId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "release_tracks",
          filter: `id=eq.${releaseTrackId}`,
        },
        (payload) => {
          const newRow = payload.new as {
            rating_avg?: number | null;
            rating_count?: number | null;
            stream_count?: number | null;
          };

          setAgg((prev) => ({
            rating_avg: newRow.rating_avg ?? prev.rating_avg,
            rating_count: newRow.rating_count ?? prev.rating_count,
            stream_count: newRow.stream_count ?? prev.stream_count,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, releaseTrackId]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleRowClick();
        }
      }}
      className={[
        "flex items-center gap-4 px-4 py-3 cursor-pointer",
        "border border-neutral-800 rounded-xl",
        "hover:bg-neutral-900/60 transition",
        isCurrent ? "bg-[#00FFC6]/10 border-[#00FFC6]" : "bg-neutral-950/40",
      ].join(" ")}
    >
      {/* Play Button (stoppt Event Propagation) */}
      <div onClick={(e) => e.stopPropagation()}>
        <PlayReleaseTrackButton releaseId={releaseId} startIndex={startIndex} />
      </div>

      <div className="w-6 text-sm text-neutral-400 tabular-nums">
        {positionLabel}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="truncate hover:text-[#00FFC6] transition cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/track/${track.id}`);
          }}
        >
          {track.title ?? "—"}
        </div>

        <div className="text-xs text-neutral-500 mt-0.5">
          <StarRating
            avg={agg.rating_avg}
            count={agg.rating_count}
            releaseTrackId={releaseTrackId}
            submitting={submitting}
            onRate={handleRate}
          />
        </div>
      </div>

      <div className="w-16 text-sm text-neutral-300 tabular-nums text-right">
        {track.bpm ?? ""}
      </div>

      <div className="w-16 text-sm text-neutral-300 tabular-nums text-right">
        {track.key ?? ""}
      </div>

      <div className="hidden md:block w-24 text-xs text-white/50 text-right tabular-nums whitespace-nowrap">
        {agg.stream_count ?? 0} streams
      </div>

      <div className="text-sm text-neutral-400 tabular-nums text-right w-16">
        {duration ?? ""}
      </div>

      {/* Options Menu (stoppt Event Propagation) */}
      <div onClick={(e) => e.stopPropagation()}>
        <TrackOptionsTrigger
          track={{
            ...(track as any),
            id: track.id,
            artist_id: artistId,
          }}
        />
      </div>
    </div>
  );
}


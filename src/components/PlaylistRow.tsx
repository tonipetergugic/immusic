"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { PlayerTrack } from "@/types/playerTrack";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import { rateReleaseTrackAction } from "@/app/dashboard/playlist/[id]/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function PlaylistRow({
  track,
  onDelete,
  tracks,
  user,
}: {
  track: PlayerTrack;
  tracks: PlayerTrack[];
  onDelete: () => void;
  user: any | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [agg, setAgg] = useState<{
    rating_avg: number | null;
    rating_count: number;
  }>({
    rating_avg: track.rating_avg ?? null,
    rating_count: track.rating_count ?? 0,
  });
  const [myStars, setMyStars] = useState<number | null>(track.my_stars ?? null);
  const supabase = createSupabaseBrowserClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: active,
  } = useSortable({ id: track.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition:
      transition ||
      "transform 120ms cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 150ms ease",
    zIndex: active ? 200 : 1,
    position: "relative",
    opacity: active ? 0.96 : 1,
    boxShadow: active
      ? "0 10px 28px rgba(0, 0, 0, 0.5)"
      : "0 2px 6px rgba(0, 0, 0, 0.15)",
    borderRadius: "8px",
    backgroundColor: active ? "rgba(65, 65, 65, 0.65)" : "",
    scale: active ? "1.025" : "1.00",
    top: active ? "-2px" : "0px",
  };

  const currentIndex = tracks.findIndex((t) => t.id === track.id);
  const displayStars = myStars ?? Math.floor(agg.rating_avg ?? 0);

  useEffect(() => {
    setAgg({
      rating_avg: track.rating_avg ?? null,
      rating_count: track.rating_count ?? 0,
    });
  }, [track.release_track_id, track.rating_avg, track.rating_count]);

  async function refreshAgg() {
    if (!track.release_track_id) return;

    const { data, error } = await supabase
      .from("release_tracks")
      .select("rating_avg,rating_count")
      .eq("id", track.release_track_id)
      .single();

    if (error || !data) {
      console.error("refreshAgg error", error ?? new Error("No data"));
      return;
    }

    setAgg({
      rating_avg: data.rating_avg,
      rating_count: data.rating_count,
    });
  }

  async function handleRate(stars: number) {
    if (submitting) return;
    if (!track.release_track_id) return;

    try {
      setSubmitting(true);
      setMyStars(stars);
      const formData = new FormData();
      formData.set("releaseTrackId", track.release_track_id);
      formData.set("stars", String(stars));

      await rateReleaseTrackAction(formData);
      await refreshAgg();
    } catch (err) {
      console.error("RATE ERROR", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="
        group 
        grid grid-cols-[40px_60px_1fr_70px_70px_80px] 
        items-center 
        gap-3 
        px-4 py-2 
        rounded-lg 
        bg-neutral-900/40 
        hover:bg-neutral-800/50 
        border border-neutral-800 
        transition-all
        cursor-grab active:cursor-grabbing
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)]
        hover:border-neutral-700
      "
    >
      {/* Index */}
      <p className="text-white/50 text-xs">{currentIndex + 1}</p>

      {/* Cover + Play Overlay */}
      <div className="w-12 h-12 rounded-md overflow-hidden relative group bg-neutral-700">
        <img
          src={track.cover_url || "/placeholder.png"}
          alt={track.title}
          className="w-full h-full object-cover"
        />

        <PlayOverlayButton
          track={track}
          index={Math.max(currentIndex, 0)}
          tracks={tracks}
        />
      </div>

      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-white">{track.title}</span>
        {track.profiles?.display_name && (
          <span className="text-xs text-white/50">
            · {track.profiles.display_name}
          </span>
        )}
        {user && track.release_track_id ? (
          <div className="flex items-center gap-1 text-xs text-white/80">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleRate(n)}
                disabled={submitting}
                className={`transition-colors ${
                  submitting ? "opacity-60 cursor-not-allowed" : "hover:text-[#00FFC6]"
                }`}
              >
                {displayStars >= n ? "★" : "☆"}
              </button>
            ))}
            <span className="text-white/50">
              {agg.rating_avg?.toFixed(1) ?? "—"} ({agg.rating_count})
            </span>
          </div>
        ) : null}
      </div>

      {/* BPM */}
      <p className="text-white/50 text-sm">{track.bpm ?? "—"}</p>

      {/* Key */}
      <p className="text-white/50 text-sm">{track.key ?? "—"}</p>

      {/* Options */}
      <TrackOptionsTrigger track={track} onRemove={onDelete} tracks={tracks} />
    </div>
  );
}

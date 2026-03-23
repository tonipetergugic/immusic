"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dispatch, SetStateAction, useState } from "react";
import { useRouter } from "next/navigation";
import { reorderReleaseTracksAction, removeTrackFromReleaseAction } from "./actions";
import { CheckCircle2, XCircle } from "lucide-react";
import Tooltip from "@/components/Tooltip";
import { formatTrackTitle } from "@/lib/formatTrackTitle";

type Track = {
  track_id: string;
  track_title: string;
  track_version?: string | null;
  position: number;
  release_id: string;
};

function SortableTrackItem({
  track,
  setTracks,
  onReleaseModified,
  eligibilityByTrackId,
  onRefresh,
  initialBoostEnabled,
  releaseStatus,
  releasePublished,
  reorderPending,
}: {
  track: Track;
  setTracks: Dispatch<SetStateAction<Track[]>>;
  onReleaseModified?: () => void;
  eligibilityByTrackId?: Record<
    string,
    { is_development: boolean; exposure_completed: boolean; rating_count: number }
  >;
  onRefresh?: () => void;
  initialBoostEnabled: boolean;
  releaseStatus: "draft" | "published";
  releasePublished: boolean;
  reorderPending: boolean;
}) {
  const router = useRouter();
  const boostEnabled = initialBoostEnabled;
  const [removePending, setRemovePending] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: track.track_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const e = eligibilityByTrackId?.[track.track_id];
  const isDevOk = !!e?.is_development;
  const isExposureOk = !!e?.exposure_completed;
  const ratingCount = typeof e?.rating_count === "number" ? e.rating_count : 0;

  const isEligible = isDevOk && isExposureOk && ratingCount >= 3;

  const exposureTooltipText =
    "Exposure missing: At least 20 listeners must hear this track to complete Exposure.";

  const devLabel = isDevOk ? "Development ✓" : "Development ✕";
  const exposureLabel = isExposureOk ? "Exposure ✓" : "Exposure ✕";
  const ratingsLabel = `Ratings ${ratingCount}/3`;

  const nextStep =
    isEligible
      ? null
      : !isDevOk
      ? (releasePublished ? { label: "Enable Development", href: null } : null)
      : !isExposureOk
      ? { label: "Check Guaranteed Exposure", href: "/artist/dashboard" }
      : ratingCount < 3
      ? { label: "Collect more ratings (Development)", href: "/artist/dashboard" }
      : null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded border p-3 text-sm flex items-center justify-between transition ${
        releaseStatus === "draft" ? "cursor-pointer" : "cursor-default"
      }
  ${isEligible
    ? "border-[#00FFC6]/35 bg-[#00FFC6]/[0.06] shadow-[0_0_0_1px_rgba(0,255,198,0.18),0_20px_60px_rgba(0,255,198,0.10)]"
    : "border-[#27272A] bg-[#18181B]"
  }
`}
      role={releaseStatus === "draft" ? "button" : undefined}
      tabIndex={releaseStatus === "draft" ? 0 : undefined}
      onClick={() => {
        if (releaseStatus !== "draft") return;
        router.push(`/artist/my-tracks/${track.track_id}/edit`);
      }}
      onKeyDown={(e) => {
        if (releaseStatus !== "draft") return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/artist/my-tracks/${track.track_id}/edit`);
        }
      }}
    >
      <div className="flex min-w-0 items-start gap-4">
        <div
          className={`mt-0.5 select-none transition ${
            reorderPending || releaseStatus !== "draft"
              ? "cursor-not-allowed text-white/20"
              : "cursor-grab text-white/35 hover:text-white/55"
          }`}
          {...(reorderPending || releaseStatus !== "draft" ? {} : attributes)}
          {...(reorderPending || releaseStatus !== "draft" ? {} : listeners)}
          onClick={(e) => e.stopPropagation()}
        >
          |||
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-[16px] font-semibold text-white">
              {formatTrackTitle(track.track_title, track.track_version ?? null)}
            </p>

            {boostEnabled ? (
              <span className="shrink-0 inline-flex items-center rounded-full border border-[#00FFC6]/35 bg-[#00FFC6]/[0.10] px-2 py-0.5 text-[10px] font-semibold text-[#00FFC6]">
                Boost ON
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-[11px] text-white/45">
            Position <span className="text-white/70">{track.position}</span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-6">
        <div className="grid grid-rows-2 gap-2 text-right">
          {/* Row 1: Signals (left) + Eligibility (right) */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div className="text-[15px] font-semibold text-white/80">
              <span>{devLabel}</span>
              <span className="mx-3 text-white/30">•</span>
              {!isExposureOk ? (
                <Tooltip label={exposureTooltipText}>
                  <span className="cursor-help">{exposureLabel}</span>
                </Tooltip>
              ) : (
                <span>{exposureLabel}</span>
              )}
              <span className="mx-3 text-white/30">•</span>
              <span>{ratingsLabel}</span>
            </div>

            <div className="inline-flex items-center justify-end gap-2">
              {isEligible ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#00FFC6]" />
                  <span className="text-sm font-semibold text-[#00FFC6]">Performance ready</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-white/40" />
                  <span className="text-sm font-semibold text-white/70">Not ready for Performance</span>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Next step (left) + Remove (right) */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div>
              {isEligible ? (
                <div className="text-[11px] text-[#00FFC6]/80">
                  Performance ready.
                </div>
              ) : null}

              {nextStep ? (
                nextStep.href ? (
                  <a
                    href={nextStep.href}
                    className="inline-block text-[13px] font-semibold text-[#00FFC6] hover:text-[#00E0B0] transition"
                  >
                    Next step: <span className="text-[#00FFC6]">{nextStep.label}</span>
                  </a>
                ) : (
                  <span className="inline-block text-[13px] font-semibold text-[#00FFC6]">
                    Next step: {nextStep.label}
                  </span>
                )
              ) : null}
            </div>

            <button
              type="button"
              disabled={removePending || releaseStatus !== "draft"}
              onClick={async (e) => {
                e.stopPropagation();
                if (releaseStatus !== "draft") return;

                if (removePending) return;

                setRemovePending(true);

                try {
                  const res = await removeTrackFromReleaseAction(track.release_id, track.track_id);

                  if (res && "error" in res) {
                    alert(res.error);
                    onRefresh?.();
                    return;
                  }

                  setTracks((prev) =>
                    prev
                      .filter((t) => t.track_id !== track.track_id)
                      .map((t, index) => ({ ...t, position: index + 1 })),
                  );
                  onReleaseModified?.();
                  onRefresh?.();
                } finally {
                  setRemovePending(false);
                }
              }}
              className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[12px] font-semibold text-red-200/90 transition hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:bg-white/[0.02]"
            >
              {removePending ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

type TrackListSortableProps = {
  releaseId: string;
  tracks: Track[];
  setTracks: Dispatch<SetStateAction<Track[]>>;
  onReleaseModified?: () => void;
  eligibilityByTrackId?: Record<
    string,
    { is_development: boolean; exposure_completed: boolean; rating_count: number }
  >;
  boostEnabledById: Record<string, boolean>;
  releaseStatus: "draft" | "published";
  releasePublished: boolean;
};

export default function TrackListSortable({
  releaseId,
  tracks,
  setTracks,
  onReleaseModified,
  eligibilityByTrackId,
  boostEnabledById,
  releaseStatus,
  releasePublished,
}: TrackListSortableProps) {
  const router = useRouter();
  const [reorderPending, setReorderPending] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    if (reorderPending) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previousTracks = tracks.map((t) => ({ ...t }));
    let reorderedResult: Track[] = [];

    setTracks((prev) => {
      const oldIndex = prev.findIndex((t) => t.track_id === active.id);
      const newIndex = prev.findIndex((t) => t.track_id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }

      const newList = arrayMove(prev, oldIndex, newIndex);

      const reordered = newList.map((t, index) => ({
        ...t,
        position: index + 1,
      }));

      reorderedResult = reordered;
      return reordered;
    });

    if (reorderedResult.length === 0) return;

    setReorderPending(true);

    try {
      const res = await reorderReleaseTracksAction(
        releaseId,
        reorderedResult.map((t) => ({ track_id: t.track_id, position: t.position })),
      );

      if (res && "error" in res) {
        setTracks(previousTracks);
        alert(res.error);
        return;
      }

      onReleaseModified?.();
    } catch {
      setTracks(previousTracks);
      alert("Failed to save track order.");
    } finally {
      setReorderPending(false);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tracks.map((t) => t.track_id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {tracks.map((track) => (
            <SortableTrackItem
              key={track.track_id}
              track={track}
              setTracks={setTracks}
              onReleaseModified={onReleaseModified}
              eligibilityByTrackId={eligibilityByTrackId}
              onRefresh={() => router.refresh()}
              initialBoostEnabled={!!boostEnabledById[track.track_id]}
              releaseStatus={releaseStatus}
              releasePublished={releasePublished}
              reorderPending={reorderPending}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

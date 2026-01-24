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
  premiumBalance,
  status,
  initialBoostEnabled,
}: {
  track: Track;
  setTracks: Dispatch<SetStateAction<Track[]>>;
  onReleaseModified?: () => void;
  eligibilityByTrackId?: Record<
    string,
    { is_development: boolean; exposure_completed: boolean; rating_count: number }
  >;
  onRefresh?: () => void;
  premiumBalance: number;
  status: string | null;
  initialBoostEnabled: boolean;
}) {
  const [devPending, setDevPending] = useState(false);
  const [boostPending, setBoostPending] = useState(false);
  const [boostEnabled, setBoostEnabled] = useState<boolean>(initialBoostEnabled);

  const isPerformance = status === "performance";
  const boostDisabled = !isPerformance || premiumBalance <= 0 || boostPending;
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

  const missingLabel = !isDevOk
    ? "Need Dev"
    : !isExposureOk
    ? "Need Exposure"
    : ratingCount < 3
    ? `Need ${3 - ratingCount} rating(s)`
    : null;

  const tooltipText = isEligible
    ? "This track currently satisfies all Earned Credits gates (Development + Exposure + 3+ ratings)."
    : !isDevOk
    ? "To become eligible: Put this track into Development Discovery."
    : !isExposureOk
    ? "To become eligible: Complete Guaranteed Exposure for this track."
    : ratingCount < 3
    ? "To become eligible: Collect at least 3 unique listener ratings in Development Discovery."
    : "Not eligible yet.";

  const devLabel = isDevOk ? "Dev ✓" : "Dev ✕";
  const exposureLabel = isExposureOk ? "Exposure ✓" : "Exposure ✕";
  const ratingsLabel = `Ratings ${ratingCount}/3`;

  const nextStep =
    isEligible ? null :
    !isDevOk ? { label: "Enable Development (not available yet)", href: null } :
    !isExposureOk ? { label: "Check Guaranteed Exposure", href: "/artist/dashboard" } :
    ratingCount < 3 ? { label: "Collect more ratings (Development)", href: "/artist/dashboard" } :
    null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded border p-3 text-sm flex items-center justify-between transition
  ${isEligible
    ? "border-[#00FFC6]/35 bg-[#00FFC6]/[0.06] shadow-[0_0_0_1px_rgba(0,255,198,0.18),0_20px_60px_rgba(0,255,198,0.10)]"
    : "border-[#27272A] bg-[#18181B]"
  }
`}
    >
      <div className="flex min-w-0 items-start gap-4">
        <div
          className="mt-0.5 cursor-grab select-none text-white/35 hover:text-white/55 transition"
          {...attributes}
          {...listeners}
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
              <span>{exposureLabel}</span>
              <span className="mx-3 text-white/30">•</span>
              <span>{ratingsLabel}</span>
            </div>

            <Tooltip label={tooltipText}>
              <div className="inline-flex items-center justify-end gap-2 cursor-help">
                {isEligible ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-[#00FFC6]" />
                    <span className="text-sm font-semibold text-[#00FFC6]">Eligible</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-white/40" />
                    <span className="text-sm font-semibold text-white/70">Not eligible</span>
                  </>
                )}
              </div>
            </Tooltip>
          </div>

          {/* Row 2: Next step (left) + Remove (right) */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div>
              {isEligible ? (
                <div className="text-[11px] text-[#00FFC6]/80">
                  Eligible — ready to generate Earned Credits (Development).
                </div>
              ) : null}

              {!isDevOk ? (
                <button
                  type="button"
                  disabled={devPending}
                  onClick={async () => {
                    try {
                      setDevPending(true);
                      const res = await fetch(`/api/tracks/${track.track_id}/move-to-development`, {
                        method: "POST",
                      });

                      if (!res.ok) {
                        const msg = await res.text().catch(() => "");
                        alert(msg || "Failed to enable Development.");
                        return;
                      }

                      onRefresh?.();
                    } finally {
                      setDevPending(false);
                    }
                  }}
                  className="inline-flex items-center justify-end text-[11px] font-semibold text-[#00FFC6] hover:text-[#00E0B0] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enable Development →
                </button>
              ) : nextStep ? (
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
              onClick={async () => {
                await removeTrackFromReleaseAction(track.release_id, track.track_id);
                setTracks((prev) =>
                  prev
                    .filter((t) => t.track_id !== track.track_id)
                    .map((t, index) => ({ ...t, position: index + 1 })),
                );
                onReleaseModified?.();
              }}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[12px] font-semibold text-red-200/90 transition hover:bg-red-500/10 hover:border-red-500/40"
            >
              Remove
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
  premiumBalance: number;
  trackStatusById: Record<string, string>;
  boostEnabledById: Record<string, boolean>;
};

export default function TrackListSortable({
  releaseId,
  tracks,
  setTracks,
  onReleaseModified,
  eligibilityByTrackId,
  premiumBalance,
  trackStatusById,
  boostEnabledById,
}: TrackListSortableProps) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

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

    if (reorderedResult.length > 0) {
      await reorderReleaseTracksAction(
        releaseId,
        reorderedResult.map((t) => ({ track_id: t.track_id, position: t.position })),
      );
      onReleaseModified?.();
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
              premiumBalance={premiumBalance}
              status={trackStatusById[track.track_id] ?? null}
              initialBoostEnabled={!!boostEnabledById[track.track_id]}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

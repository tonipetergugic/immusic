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

type Track = { track_id: string; track_title: string; position: number; release_id: string };

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
      <div className="flex items-center gap-3">
        <div className="cursor-grab text-gray-400 select-none" {...attributes} {...listeners}>
          |||
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <p className="font-medium">{track.track_title}</p>

            {boostEnabled ? (
              <span className="inline-flex items-center rounded-full border border-[#00FFC6]/35 bg-[#00FFC6]/[0.10] px-2 py-0.5 text-[10px] font-semibold text-[#00FFC6]">
                Boost ON
              </span>
            ) : null}
          </div>

          <p className="text-xs text-gray-500">Position: {track.position}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <Tooltip label={tooltipText}>
            <div className="flex items-center justify-end gap-2 cursor-help">
              {isEligible ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#00FFC6]" />
                  <span className="text-xs font-semibold text-white">Eligible</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-white/40" />
                  <span className="text-xs font-semibold text-white/70">Not eligible</span>
                </>
              )}
            </div>
          </Tooltip>

          <div className="mt-0.5 text-[11px] text-white/40">
            {devLabel} · {exposureLabel} · {ratingsLabel}
          </div>

          {isPerformance ? (
            <div className="mt-3 flex items-center justify-end gap-3">
              <div className="text-right">
                <p className="text-[11px] font-semibold text-white/80">Boost</p>
                <p className="mt-0.5 text-[11px] text-white/35">
                  Boost uses credits only when it is actively used.
                </p>
                {premiumBalance <= 0 ? (
                  <p className="mt-0.5 text-[11px] text-white/35">
                    Disabled — no Premium Credits.
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                disabled={boostDisabled}
                onClick={async () => {
                  const next = !boostEnabled;
                  setBoostPending(true);
                  setBoostEnabled(next);

                  try {
                    const res = await fetch("/api/artist/boost", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ track_id: track.track_id, enabled: next }),
                    });

                    if (!res.ok) {
                      const msg = await res.text().catch(() => "");
                      alert(msg || "Failed to update Boost.");
                      setBoostEnabled(!next); // rollback
                      return;
                    }

                    onRefresh?.();
                  } finally {
                    setBoostPending(false);
                  }
                }}
                className={[
                  "relative inline-flex h-6 w-11 items-center rounded-full transition",
                  boostDisabled ? "opacity-50 cursor-not-allowed bg-white/10" : boostEnabled ? "bg-[#00FFC6]" : "bg-white/15",
                ].join(" ")}
                aria-pressed={boostEnabled}
                aria-label="Toggle boost"
              >
                <span
                  className={[
                    "inline-block h-5 w-5 transform rounded-full bg-black/70 transition",
                    boostEnabled ? "translate-x-5" : "translate-x-1",
                  ].join(" ")}
                />
              </button>
            </div>
          ) : null}

          {isEligible ? (
            <div className="mt-1 text-[11px] text-[#00FFC6]/90">
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
              className="mt-2 inline-flex items-center justify-end text-[11px] font-semibold text-[#00FFC6] hover:text-[#00E0B0] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enable Development →
            </button>
          ) : nextStep ? (
            nextStep.href ? (
              <a
                href={nextStep.href}
                className="mt-1 inline-block text-[11px] text-[#00FFC6] hover:text-[#00E0B0] transition"
              >
                Next step: {nextStep.label} →
              </a>
            ) : (
              <span className="mt-1 inline-block text-[11px] text-white/45">
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
          className="text-red-400 hover:text-red-300 text-xs ml-4"
        >
          Remove
        </button>
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

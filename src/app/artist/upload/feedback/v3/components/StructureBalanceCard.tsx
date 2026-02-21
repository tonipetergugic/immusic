"use client";

import React from "react";
import { deriveStructureBalanceCard } from "../utils/feedbackDerivations";

type Props = {
  payload: any;
  isReady: boolean;
};

export default function StructureBalanceCard({ payload, isReady }: Props) {
  const sb = deriveStructureBalanceCard(payload, isReady) as any;

  const score = typeof sb.score === "number" && Number.isFinite(sb.score) ? sb.score : null;
  const fill = score === null ? 0 : Math.max(0, Math.min(100, score));

  const isEmpty = score === null;

  // dominant highlight format: "Dominant segment: SEGMENT #X (YY.Y%)."
  const dominantText =
    typeof sb.dominant === "string" && sb.dominant.trim()
      ? sb.dominant.replace(/^Dominant segment:\s*/i, "").replace(/\.$/, "")
      : null;

  const coverageText = typeof sb.coverage === "number" && Number.isFinite(sb.coverage) ? `${sb.coverage}%` : null;

  const segs = payload?.metrics?.structure?.segments as Array<{ start: number; end: number }> | undefined;
  const spanCount = payload?.metrics?.structure?.segment_count_spans as number | undefined;

  const showTimeline = typeof spanCount === "number" && spanCount >= 2 && Array.isArray(segs) && segs.length >= 2;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Structure Balance</div>

          {isEmpty ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <span className="text-[10px] leading-none text-white/70">i</span>
              </span>
              <span className="truncate">No data yet — structure segments not available for this upload.</span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-white/50">{sb.explanation}</div>
          )}
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/80 tabular-nums">
          {isEmpty ? "—" : `${score}/100`}
        </div>
      </div>

      <div className="mt-4">
        <div
          className={[
            "h-3 w-full overflow-hidden rounded-full border bg-black/30",
            isEmpty ? "border-white/5 opacity-60" : "border-white/10",
          ].join(" ")}
        >
          <div
            className={["h-full", isEmpty ? "bg-white/10" : "bg-white/35"].join(" ")}
            style={{ width: `${fill}%` }}
            aria-label="Structure balance meter"
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-white/40 tabular-nums">
          <span>Low</span>
          <span>{isEmpty ? "—" : `${score}/100`}</span>
          <span>High</span>
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/50">
          This metric appears once the system can split the track into stable segments.
        </div>
      ) : (
        <>
          {showTimeline ? (
            <div className="mt-4">
              <div className="h-5 w-full overflow-hidden rounded-full border border-white/10 bg-black/30">
                <div className="flex h-full w-full">
                  {segs!.map((g, i) => {
                    const w = Math.max(0, Math.min(1, (g.end - g.start) / (segs!.reduce((a, b) => a + (b.end - b.start), 0))));
                    return (
                      <div
                        key={i}
                        className="h-full border-r border-black/40 bg-white/20"
                        style={{ width: `${w * 100}%` }}
                        aria-label={`Segment ${i + 1}`}
                        title={`SEGMENT #${i + 1} — ${(g.end - g.start).toFixed(1)}s`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-white/40">Segment timeline (duration-based)</div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/50">
              Timeline appears once we have at least 2 stable segment spans.
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/60">
              Dominant: <span className="text-white/80">{dominantText ?? "—"}</span>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/60">
              Coverage: <span className="text-white/80">{coverageText ?? "—"}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

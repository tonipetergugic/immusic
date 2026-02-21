import React from "react";
import AnalyzerBars from "./AnalyzerBars";
import { useImpactStrength } from "../hooks/useImpactStrength";

type DropImpactCard = {
  valuePct: number | null;
  confidencePct: number | null;
  explanation: string;
  label?: string | null;
};

type Props = {
  payload: any;
  isReady: boolean;

  // Injected helpers from page.tsx (no logic move / no duplication)
  deriveDropImpactCard: (payload: any, isReady: boolean) => DropImpactCard;
  findFirst: <T = any>(obj: any, paths: string[]) => T | null;
  sampleEnergyWindow: (payload: any, t0: number, t1: number, n: number) => number[] | null;
  confidenceLabel: (confPct: number | null) => { short: string; tone: string };
  clamp01: (x: number) => number;
  shapeWaveAmp: (a: number) => number;
};

export default function ImpactStrengthCard({
  payload,
  isReady,
  deriveDropImpactCard,
  findFirst,
  sampleEnergyWindow,
  confidenceLabel,
  clamp01,
  shapeWaveAmp,
}: Props) {
  const di = deriveDropImpactCard(payload, isReady);
  const conf = di.confidencePct === null ? null : Math.max(0, Math.min(100, di.confidencePct));

  const impact01 =
    typeof di.valuePct === "number" && Number.isFinite(di.valuePct)
      ? Math.max(0, Math.min(1, di.valuePct / 100))
      : 0;

  const peakT =
    findFirst<number>(payload, [
      "metrics.structure.drop_confidence.items.0.t",
      "metrics.structure.tension_release.drops.0.t",
      "metrics.structure.primary_peak.t",
      "structure.primary_peak.t",
    ]) ?? null;

  const windowS = 6;
  const before =
    peakT === null ? null : sampleEnergyWindow(payload, Math.max(0, peakT - windowS), peakT, 34);
  const after =
    peakT === null ? null : sampleEnergyWindow(payload, peakT, peakT + windowS, 34);

  const { before01, after01 } = useImpactStrength({
    before,
    after,
    impact01,
    clamp01,
    shapeWaveAmp,
  });

  const buildHeight = 80;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-6 lg:p-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">Impact Strength</div>
          <div className="mt-1 text-xs text-white/45">
            How much the strongest moment stands out from the section before it.
          </div>
        </div>
      </div>

      {/* Hero row */}
      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="leading-none">
          <div className="text-[11px] tracking-widest text-white/35">CONTRAST</div>
          <div className="mt-2 text-3xl font-semibold text-white tabular-nums tracking-tight">
            {di.valuePct === null ? "—" : `${Math.round(di.valuePct)}%`}
          </div>
        </div>
      </div>

      {/* Mini-wave visual (single premium graphic) */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div>
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-white/45">
              Before <span className="text-white/25">→</span> High point
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <>
              {/* LEFT: Before */}
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/0">
                <div className="relative w-full" style={{ height: `${buildHeight}px` }}>
                  <AnalyzerBars vals01={before01} mode="before" impact01={impact01} barMaxScale={1.0} />
                </div>
                <div className="px-2 pb-2 text-[10px] tracking-widest text-white/35">BEFORE</div>
              </div>

              {/* Divider */}
              <div className="h-[54px] w-[1px] rounded-full bg-white/10" />

              {/* RIGHT: High point */}
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/0 shadow-[0_0_35px_rgba(255,149,0,0.10)]">
                <div className="relative w-full" style={{ height: `${buildHeight}px` }}>
                  <AnalyzerBars
                    vals01={after01}
                    mode="after"
                    impact01={impact01}
                    barMaxScale={1 + impact01 * 0.10}
                  />
                </div>
                <div className="px-2 pb-2 text-[10px] tracking-widest text-white/35">HIGH POINT</div>
              </div>
            </>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px] text-white/45">{di.explanation}</div>
          </div>
        </div>
      </div>

      {/* Footer micro-hint (only if data exists) */}
      <div className="mt-4 text-[11px] text-white/35">
        {di.valuePct === null ? "" : "Bigger contrast usually feels more impactful."}
      </div>
    </div>
  );
}

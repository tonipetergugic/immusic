import React from "react";
import ImpactStrengthCard from "./ImpactStrengthCard";
import StructureBalanceCard from "./StructureBalanceCard";
import ArrangementDensityCard from "./ArrangementDensityCard";

type Props = {
  payload: any;
  isReady: boolean;

  deriveDropImpactCard: (payload: any, isReady: boolean) => any;
  findFirst: <T = any>(obj: any, paths: string[]) => T | null;
  sampleEnergyWindow: (payload: any, t0: number, t1: number, n: number) => number[] | null;
  confidenceLabel: (confPct: number | null) => { short: string; tone: string };
  clamp01: (x: number) => number;
  shapeWaveAmp: (a: number) => number;

  deriveStructureBalanceCard: (payload: any, isReady: boolean) => any;
  deriveArrangementDensityCard: (payload: any, isReady: boolean) => any;
};

export default function PerformanceSection({
  payload,
  isReady,
  deriveDropImpactCard,
  findFirst,
  sampleEnergyWindow,
  confidenceLabel,
  clamp01,
  shapeWaveAmp,
  deriveStructureBalanceCard,
  deriveArrangementDensityCard,
}: Props) {
  return (
    <section>
      <h2 className="text-lg font-semibold">Performance</h2>
      <p className="mt-1 text-sm text-white/60">The top three modules — focused, visual, and neutral.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ImpactStrengthCard
          payload={payload}
          isReady={isReady}
          deriveDropImpactCard={deriveDropImpactCard}
          findFirst={findFirst}
          sampleEnergyWindow={sampleEnergyWindow}
          confidenceLabel={confidenceLabel}
          clamp01={clamp01}
          shapeWaveAmp={shapeWaveAmp}
        />

        <StructureBalanceCard payload={payload} isReady={isReady} deriveStructureBalanceCard={deriveStructureBalanceCard} />

        <ArrangementDensityCard payload={payload} isReady={isReady} deriveArrangementDensityCard={deriveArrangementDensityCard} />
      </div>
    </section>
  );
}

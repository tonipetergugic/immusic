import React from "react";
import ImpactStrengthCard from "./ImpactStrengthCard";
import StructureBalanceCard from "./StructureBalanceCard";
import ArrangementDensityCard from "./ArrangementDensityCard";

type Props = {
  payload: any;
  isReady: boolean;
};

export default function PerformanceSection({ payload, isReady }: Props) {
  return (
    <section>
      <h2 className="text-lg font-semibold">Performance</h2>
      <p className="mt-1 text-sm text-white/60">The top three modules — focused, visual, and neutral.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ImpactStrengthCard payload={payload} isReady={isReady} />

        <StructureBalanceCard payload={payload} isReady={isReady} />

        <ArrangementDensityCard payload={payload} isReady={isReady} />
      </div>
    </section>
  );
}

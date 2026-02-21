import React from "react";

type StructureBalanceCardModel = {
  valuePct: number | null;
  label: string;
  explanation: string;
};

type Props = {
  payload: any;
  isReady: boolean;
  deriveStructureBalanceCard: (payload: any, isReady: boolean) => StructureBalanceCardModel;
};

export default function StructureBalanceCard({ payload, isReady, deriveStructureBalanceCard }: Props) {
  const sb = deriveStructureBalanceCard(payload, isReady);
  const fill = sb.valuePct === null ? 0 : Math.max(0, Math.min(100, sb.valuePct));

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Structure Balance</div>
          <div className="mt-1 text-xs text-white/50">{sb.explanation}</div>
        </div>

        <div className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80">
          {sb.label}
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black/30">
          <div className="h-full bg-white/35" style={{ width: `${fill}%` }} aria-label="Structure balance meter" />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-white/40 tabular-nums">
          <span>Low</span>
          <span>{sb.valuePct === null ? "—" : `${Math.round(sb.valuePct)}/100`}</span>
          <span>High</span>
        </div>
      </div>

      <div className="mt-4 text-[11px] text-white/40">
        Tip: If the build or break sections dominate, the perceived pacing can feel less clear.
      </div>
    </div>
  );
}

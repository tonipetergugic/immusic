import React from "react";

type ArrangementDensityCardModel = {
  valuePct: number | null;
  label: string;
  explanation: string;
  stability?: string | null;
  details?: {
    density?: number | null;
    std?: number | null;
    cv?: number | null;
  } | null;
};

type Props = {
  payload: any;
  isReady: boolean;
  deriveArrangementDensityCard: (payload: any, isReady: boolean) => ArrangementDensityCardModel;
};

export default function ArrangementDensityCard({ payload, isReady, deriveArrangementDensityCard }: Props) {
  const ad = deriveArrangementDensityCard(payload, isReady);
  const fill = ad.valuePct === null ? 0 : Math.max(0, Math.min(100, ad.valuePct));

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Arrangement Density</div>
          <div className="mt-1 text-xs text-white/50">{ad.explanation}</div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80">
            {ad.label}
          </div>
          <div className="text-[11px] text-white/40">Stability: {ad.stability}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black/30">
          <div className="h-full bg-white/35" style={{ width: `${fill}%` }} aria-label="Arrangement density meter" />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-white/40 tabular-nums">
          <span>Open</span>
          <span>{ad.valuePct === null ? "—" : `${Math.round(ad.valuePct)}/100`}</span>
          <span>Filled</span>
        </div>
      </div>

      {/* Details (small, optional) */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { k: "Density", v: ad.details?.density },
          { k: "Std", v: ad.details?.std },
          { k: "CV", v: ad.details?.cv },
        ].map((x) => (
          <div key={x.k} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] text-white/45">{x.k}</div>
            <div className="mt-1 text-xs text-white/70 tabular-nums">{typeof x.v === "number" ? x.v.toFixed(3) : "—"}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-white/40">
        Tip: If density is very high, leaving micro-gaps can improve perceived clarity.
      </div>
    </div>
  );
}

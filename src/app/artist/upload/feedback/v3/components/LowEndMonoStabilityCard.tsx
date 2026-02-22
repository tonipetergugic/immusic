"use client";

type Props = {
  phaseCorr20_120: number | null;
  monoLossPct20_120: number | null; // (Stereo RMS - Mono RMS)/Stereo RMS * 100
  phaseCorr20_60: number | null;
  phaseCorr60_120: number | null;
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function correlationColor(value: number | null) {
  if (typeof value !== "number") return "from-[#334155] to-[#475569]";

  if (value >= 0.85) return "from-[#1EE6B6] to-[#21E6C1]"; // healthy
  if (value >= 0.5) return "from-[#2BD4FF] to-[#4C6FFF]";   // neutral
  return "from-[#FF784F] to-[#FF4D4D]";                     // unstable
}

function meterStyles(t: number, currentValue: number | null) {
  const x = clamp01(t); // 0..1
  return {
    leftPct: `${x * 100}%`,
    // neutral track + premium fill
    trackClass:
      "relative h-5 w-full rounded-full overflow-hidden bg-gradient-to-r from-[#0f131b] via-[#131925] to-[#0f131b] border border-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_18px_rgba(0,0,0,0.55)]",
    fillClass:
      "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#21E6C1] to-[#2BD4FF] shadow-[0_0_14px_rgba(33,230,193,0.35)]",
    centerClass:
      "absolute left-1/2 top-0 bottom-0 w-px bg-white/10 pointer-events-none",
    markerClass: "",
  };
}

export default function LowEndMonoStabilityCard({
  phaseCorr20_120,
  monoLossPct20_120,
  phaseCorr20_60,
  phaseCorr60_120,
}: Props) {
  const hasPc20_60 =
    typeof phaseCorr20_60 === "number" && Number.isFinite(phaseCorr20_60);
  const hasPc60_120 =
    typeof phaseCorr60_120 === "number" && Number.isFinite(phaseCorr60_120);

  const tPc20_60 = hasPc20_60 ? clamp01((phaseCorr20_60 + 1) / 2) : 0.5;
  const tPc60_120 = hasPc60_120 ? clamp01((phaseCorr60_120 + 1) / 2) : 0.5;

  const hasPc =
    typeof phaseCorr20_120 === "number" && Number.isFinite(phaseCorr20_120);
  const hasLoss =
    typeof monoLossPct20_120 === "number" && Number.isFinite(monoLossPct20_120);

  if (!hasPc && !hasLoss && !hasPc20_60 && !hasPc60_120) return null;

  // Map [-1..+1] -> [0..1]
  const tPc = hasPc ? clamp01((phaseCorr20_120 + 1) / 2) : 0.5;

  // Mono loss: 0%..50% visual clamp (display still shows real value)
  const lossPct = hasLoss ? monoLossPct20_120 : null;
  const lossT = hasLoss ? clamp01((monoLossPct20_120 ?? 0) / 50) : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[18px] font-semibold text-white/90">
              Low-End Mono Stability
            </div>
            <div className="text-[13px] text-white/50 mt-1">
              Technical visibility (20–120 Hz). No judgement.
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#141820] border border-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/40">
              Correlation
            </div>
            <div className="text-[18px] font-semibold text-[#21E6C1] mt-1">
              {hasPc ? phaseCorr20_120.toFixed(2) : "—"}
            </div>
          </div>

          <div className="rounded-xl bg-[#141820] border border-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/40">
              Mono Loss
            </div>
            <div className="text-[18px] font-semibold text-white/90 mt-1">
              {hasLoss ? `${monoLossPct20_120.toFixed(1)}%` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Mini Heatbar (Correlation 20–120 Hz) */}
      <div className="mt-5">
        <div className="text-[10px] text-white/45">Phase correlation (20–120 Hz)</div>

        <div className="mt-2">
        {(() => {
          const s = meterStyles(tPc, phaseCorr20_120);
          return (
            <div className={s.trackClass}>
              {/* negative zone tint */}
              <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#2a1417] to-transparent opacity-50 pointer-events-none" />

              {/* center 0 line */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/10 pointer-events-none" />

              {/* positive fill (from 0 to value) */}
              <div
                className={s.fillClass}
                style={{
                  width: `${tPc * 100}%`,
                  clipPath: "inset(0 0 0 50%)",
                }}
              />
            </div>
          );
        })()}
        </div>

        <div className="mt-2 flex justify-between text-[10px] text-white/35">
          <span>-1</span>
          <span>0</span>
          <span>+1</span>
        </div>
      </div>

      {/* Mono Collapse Visual */}
      <div className="mt-5">
        <div className="text-[10px] text-white/45">Mono collapse (energy)</div>

        <div className="mt-2 space-y-2">
          {/* Stereo reference */}
          <div className="flex items-center gap-3">
            <div className="w-16 text-[10px] text-white/40">Stereo</div>
            <div className="relative h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-white/35" />
            </div>
          </div>

          {/* Mono bar scaled from loss */}
          <div className="flex items-center gap-3">
            <div className="w-16 text-[10px] text-white/40">Mono</div>
            <div className="relative h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-emerald-400/60"
                style={{
                  width: hasLoss ? `${(1 - (lossT ?? 0)) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-2 text-[10px] text-white/35">
          {hasLoss ? (
            <>Displayed: {monoLossPct20_120.toFixed(1)}% loss (20–120 Hz)</>
          ) : (
            <>No mono loss data (20–120 Hz)</>
          )}
        </div>
      </div>

      {/* Sub-band correlation split */}
      <div className="mt-5">
        <div className="text-[10px] text-white/45">Sub-band correlation split</div>

        <div className="mt-2 space-y-4">
          {/* 20–60 */}
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-white/40">20–60 Hz</div>
              <div className="text-[10px] tabular-nums text-white/55">
                {hasPc20_60 ? phaseCorr20_60.toFixed(2) : "—"}
              </div>
            </div>

            <div className="mt-2">
            {(() => {
              const s = meterStyles(tPc20_60, phaseCorr20_60);
              return (
                <div className={s.trackClass}>
                  {/* negative zone tint */}
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#2a1417] to-transparent opacity-50 pointer-events-none" />

                  {/* center 0 line */}
                  <div className="absolute inset-y-0 left-1/2 w-px bg-white/10 pointer-events-none" />

                  {/* positive fill (from 0 to value) */}
                  <div
                    className={s.fillClass}
                    style={{
                      width: `${tPc20_60 * 100}%`,
                      clipPath: "inset(0 0 0 50%)",
                    }}
                  />
                </div>
              );
            })()}
            </div>

            <div className="mt-2 flex justify-between text-[10px] text-white/35">
              <span>-1</span>
              <span>0</span>
              <span>+1</span>
            </div>
          </div>

          {/* 60–120 */}
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-white/40">60–120 Hz</div>
              <div className="text-[10px] tabular-nums text-white/55">
                {hasPc60_120 ? phaseCorr60_120.toFixed(2) : "—"}
              </div>
            </div>

            <div className="mt-2">
            {(() => {
              const s = meterStyles(tPc60_120, phaseCorr60_120);
              return (
                <div className={s.trackClass}>
                  {/* negative zone tint */}
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#2a1417] to-transparent opacity-50 pointer-events-none" />

                  {/* center 0 line */}
                  <div className="absolute inset-y-0 left-1/2 w-px bg-white/10 pointer-events-none" />

                  {/* positive fill (from 0 to value) */}
                  <div
                    className={s.fillClass}
                    style={{
                      width: `${tPc60_120 * 100}%`,
                      clipPath: "inset(0 0 0 50%)",
                    }}
                  />
                </div>
              );
            })()}
            </div>

            <div className="mt-2 flex justify-between text-[10px] text-white/35">
              <span>-1</span>
              <span>0</span>
              <span>+1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

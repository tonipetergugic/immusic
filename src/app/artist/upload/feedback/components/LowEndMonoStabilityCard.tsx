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
    fillClass: "absolute inset-y-0 left-0 rounded-full bg-white/40",
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
            <div className="text-[13px] text-white/40 mt-1">
              Technical visibility (20–120 Hz). No judgement.
            </div>
          </div>
        </div>

      {/* KPI Row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Correlation */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/30">
            Correlation (20–120 Hz)
          </div>

          <div className="mt-2 text-[28px] font-semibold text-white">
            {hasPc ? phaseCorr20_120.toFixed(2) : "—"}
          </div>
        </div>

        {/* Mono Loss */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/30">
            Mono Loss (20–120 Hz)
          </div>

          <div className="mt-2 text-[28px] font-semibold text-white">
            {hasLoss ? `${monoLossPct20_120.toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>
      </div>

      {/* Mini Heatbar (Correlation 20–120 Hz) */}
      <div className="mt-5">
        <div className="text-[11px] text-white/40">Phase correlation (20–120 Hz)</div>

        <div className="mt-2">
        {(() => {
          const s = meterStyles(tPc, phaseCorr20_120);
          return (
            <div className={s.trackClass}>
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

        <div className="mt-2 flex justify-between text-[11px] text-white/35">
          <span>-1</span>
          <span>0</span>
          <span>+1</span>
        </div>
      </div>

      {/* Mono energy retention */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="text-[11px] uppercase tracking-wide text-white/30">
          Mono energy retention (20–120 Hz)
        </div>

        <div className="mt-3 relative h-5 w-full rounded-full overflow-hidden bg-gradient-to-r from-[#0f131b] via-[#131925] to-[#0f131b] border border-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_18px_rgba(0,0,0,0.55)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/40"
            style={{
              width: hasLoss ? `${(1 - (lossT ?? 0)) * 100}%` : "0%",
            }}
          />
        </div>

        <div className="mt-2 text-[11px] text-white/35">
          {hasLoss
            ? `${(100 - monoLossPct20_120).toFixed(1)}% energy retained in mono`
            : "No mono retention data (20–120 Hz)"}
        </div>
      </div>

      {/* Sub-band correlation split */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="text-[11px] uppercase tracking-wide text-white/30">
          Sub-band detail (20–60 / 60–120 Hz)
        </div>

        <div className="mt-2 space-y-4">
          {/* 20–60 */}
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-white/40">20–60 Hz</div>
              <div className="text-[11px] tabular-nums text-white/55">
                {hasPc20_60 ? phaseCorr20_60.toFixed(2) : "—"}
              </div>
            </div>

            <div className="mt-2">
            {(() => {
              const s = meterStyles(tPc20_60, phaseCorr20_60);
              return (
                <div className={s.trackClass}>
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

            <div className="mt-2 flex justify-between text-[11px] text-white/35">
              <span>-1</span>
              <span>0</span>
              <span>+1</span>
            </div>
          </div>

          {/* 60–120 */}
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-white/40">60–120 Hz</div>
              <div className="text-[11px] tabular-nums text-white/55">
                {hasPc60_120 ? phaseCorr60_120.toFixed(2) : "—"}
              </div>
            </div>

            <div className="mt-2">
            {(() => {
              const s = meterStyles(tPc60_120, phaseCorr60_120);
              return (
                <div className={s.trackClass}>
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

            <div className="mt-2 flex justify-between text-[11px] text-white/35">
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

"use client";

type Props = {
  isReady: boolean;
  payload: any;
};

export default function EngineeringDynamics({ isReady, payload }: Props) {
  const dynamicsHealth =
    payload && typeof payload.dynamics_health === "object" ? payload.dynamics_health : null;

  const dynamicsScore =
    dynamicsHealth && typeof dynamicsHealth.score === "number" && Number.isFinite(dynamicsHealth.score)
      ? dynamicsHealth.score
      : null;

  const dynamicsFactors =
    dynamicsHealth && typeof dynamicsHealth.factors === "object" && dynamicsHealth.factors
      ? dynamicsHealth.factors
      : null;

  const score = dynamicsScore;
  const label =
    dynamicsHealth && typeof dynamicsHealth.label === "string"
      ? String(dynamicsHealth.label).toUpperCase()
      : null;

  const lufs =
    dynamicsFactors && typeof (dynamicsFactors as any).lufs === "number"
      ? (dynamicsFactors as any).lufs
      : undefined;
  const lra =
    dynamicsFactors && typeof (dynamicsFactors as any).lra === "number"
      ? (dynamicsFactors as any).lra
      : undefined;
  const crest =
    dynamicsFactors && typeof (dynamicsFactors as any).crest === "number"
      ? (dynamicsFactors as any).crest
      : undefined;

  const lraNum = typeof lra === "number" && Number.isFinite(lra) ? lra : null;
  const labelCappedByLra =
    lraNum !== null && lraNum < 4.0 && label === "BORDERLINE";

  // --------------------
  // Dynamics color logic (deterministic)
  // --------------------
  type Tone = "good" | "warn" | "critical";

  function toneClass(t: Tone) {
    // Match Engineering look: subtle tinted panel, neutral white value text
    if (t === "critical") return "border-red-500/30 bg-red-500/5";
    if (t === "warn") return "border-yellow-500/30 bg-yellow-500/5";
    return "border-emerald-500/30 bg-emerald-500/5";
  }

  function toneForLufs(x: number): Tone {
    // Good: -16..-9 | Warn: -20..-16 or -9..-7 | Critical: < -20 or > -7
    if (x > -7 || x < -20) return "critical";
    if ((x >= -20 && x < -16) || (x > -9 && x <= -7)) return "warn";
    return "good";
  }

  function toneForLra(x: number): Tone {
    // Good: 5..12 | Warn: 3..5 or 12..14 | Critical: <3 or >14
    if (x < 3 || x > 14) return "critical";
    if ((x >= 3 && x < 5) || (x > 12 && x <= 14)) return "warn";
    return "good";
  }

  function toneForCrest(x: number): Tone {
    // Good: 7..12 | Warn: 5..7 or 12..14 | Critical: <5 or >14
    if (x < 5 || x > 14) return "critical";
    if ((x >= 5 && x < 7) || (x > 12 && x <= 14)) return "warn";
    return "good";
  }

  return (
    <section className="h-full">
      <div className="h-full rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8 flex flex-col">
        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 shrink-0">
          {[
            {
              k: "Integrated LUFS",
              v: lufs,
              fmt: (x: number) => x.toFixed(1),
              tone: (x: number) => toneForLufs(x),
            },
            {
              k: "Loudness Range (LRA)",
              v: lra,
              fmt: (x: number) => x.toFixed(1),
              tone: (x: number) => toneForLra(x),
            },
            {
              k: "Crest Factor (dB)",
              v: crest,
              fmt: (x: number) => x.toFixed(2),
              tone: (x: number) => toneForCrest(x),
            },
          ].map((m) => (
            <div
              key={m.k}
              className={
                "rounded-2xl border px-4 py-4 " +
                (typeof m.v === "number" && Number.isFinite(m.v)
                  ? toneClass(m.tone(m.v))
                  : "border-white/10 bg-white/[0.03]")
              }
            >
              <div className="text-sm uppercase tracking-wider text-white/40">
                {m.k}
              </div>

              <div className="mt-2 text-2xl font-semibold text-white tabular-nums">
                {typeof m.v === "number" && Number.isFinite(m.v) ? m.fmt(m.v) : "—"}
              </div>
            </div>
          ))}
        </div>

        {typeof score === "number" && (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm uppercase tracking-wider text-white/40">
                  Dynamics score
                </div>

                <div className="mt-2 flex items-baseline gap-3">
                  <div className="text-4xl font-semibold text-[#00FFC6] tabular-nums">
                    {score}
                  </div>
                  <div className="text-base text-white/50 tabular-nums">/100</div>

                  <span className="ml-2 text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.05] text-white/80 font-semibold tracking-wide">
                    {label ?? "—"}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-sm text-white/40">
                Higher is healthier.
              </div>
            </div>

            <div className="mt-5">
              <div className="h-3.5 w-full rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-[#00FFC6] transition-all duration-500"
                  style={{
                    width:
                      typeof score === "number"
                        ? `${Math.max(0, Math.min(100, score))}%`
                        : "0%",
                    boxShadow: "0 0 12px rgba(0,255,198,0.6)"
                  }}
                />
              </div>

              <div className="mt-2 text-sm text-white/45">
                Low LRA can cap the label — keep musical contrast while avoiding over-compression.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

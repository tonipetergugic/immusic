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

  return (
    <section className="h-full">
      <div className="h-full rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8 flex flex-col">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Dynamics</h2>
            <p className="mt-1 text-sm text-white/60">
              Core technical metrics.
            </p>
          </div>

          {typeof score === "number" && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/[0.03] text-white/70 font-semibold tracking-wide">
                {label ?? "—"}
              </span>
              <div className="text-sm font-semibold text-white/80 tabular-nums">
                {score}/100
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 flex-grow">
          {[
            { k: "Integrated LUFS", v: lufs, fmt: (x: number) => x.toFixed(1) },
            { k: "Loudness Range (LRA)", v: lra, fmt: (x: number) => x.toFixed(1) },
            { k: "Crest Factor (dB)", v: crest, fmt: (x: number) => x.toFixed(2) },
          ].map((m) => (
            <div
              key={m.k}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
            >
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                {m.k}
              </div>

              <div className="mt-2 text-lg font-semibold text-white/85 tabular-nums">
                {typeof m.v === "number" && Number.isFinite(m.v)
                  ? m.fmt(m.v)
                  : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

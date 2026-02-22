"use client";

type Props = {
  isReady: boolean;
  payload: any;
  lufsI: number | null;
  truePeak: number | null; // dBTP max (closest to 0)
  durationS: number | null;
};

export default function EngineeringCore({
  isReady,
  payload,
  lufsI,
  truePeak,
  durationS,
}: Props) {
  const headroomDb =
    typeof truePeak === "number" && Number.isFinite(truePeak)
      ? Math.max(0, 0 - truePeak)
      : null;

  const truePeakTone =
    typeof truePeak === "number" && Number.isFinite(truePeak)
      ? truePeak >= 0
        ? "critical"
        : truePeak > -0.3
          ? "warn"
          : "good"
      : "neutral";

  const toneClass =
    truePeakTone === "critical"
      ? "border-red-500/30 bg-red-500/5"
      : truePeakTone === "warn"
        ? "border-yellow-500/30 bg-yellow-500/5"
        : truePeakTone === "good"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-white/10 bg-white/[0.03]";

  const headroomTone =
    typeof headroomDb === "number"
      ? headroomDb <= 0.1
        ? "critical"
        : headroomDb <= 0.3
          ? "warn"
          : "good"
      : "neutral";

  const headroomClass =
    headroomTone === "critical"
      ? "border-red-500/30 bg-red-500/5"
      : headroomTone === "warn"
        ? "border-yellow-500/30 bg-yellow-500/5"
        : headroomTone === "good"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-white/10 bg-white/[0.03]";

  const codec = payload?.codec_simulation ?? null;
  const aac = codec?.aac128 ?? null;
  const mp3 = codec?.mp3128 ?? null;

  const aacOvers = typeof aac?.overs === "number" ? aac.overs : null;
  const mp3Overs = typeof mp3?.overs === "number" ? mp3.overs : null;

  const headEng = payload?.metrics?.loudness?.headroom_engineering ?? null;
  const postEncodeHeadroom =
    typeof headEng?.post_encode_headroom_dbtp === "number" ? headEng.post_encode_headroom_dbtp : null;

  // Risk score (simple + deterministic)
  const oversMax =
    typeof aacOvers === "number" || typeof mp3Overs === "number"
      ? Math.max(aacOvers ?? 0, mp3Overs ?? 0)
      : null;

  let encodingRiskTone: "good" | "warn" | "critical" | "neutral" = "neutral";

  if (typeof oversMax === "number") {
    encodingRiskTone = oversMax >= 50 ? "critical" : oversMax >= 1 ? "warn" : "good";
  } else if (typeof postEncodeHeadroom === "number") {
    // negative means overs risk
    encodingRiskTone = postEncodeHeadroom < 0 ? "critical" : postEncodeHeadroom < 0.1 ? "warn" : "good";
  }

  const encodingRiskClass =
    encodingRiskTone === "critical"
      ? "border-red-500/30 bg-red-500/5"
      : encodingRiskTone === "warn"
        ? "border-yellow-500/30 bg-yellow-500/5"
        : encodingRiskTone === "good"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-white/10 bg-white/[0.03]";

  const encodingRiskLabel =
    encodingRiskTone === "critical" ? "CRITICAL" : encodingRiskTone === "warn" ? "MODERATE" : encodingRiskTone === "good" ? "OK" : "—";

  return (
    <section className="h-full">
      <div className="h-full rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8 flex flex-col">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Engineering</h2>
            <p className="mt-1 text-sm text-white/60">
              Core technical metrics.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 flex-grow">
          {/* Integrated LUFS */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Integrated LUFS
            </div>
            <div className="mt-2 text-xl font-semibold text-white tabular-nums">
              {typeof lufsI === "number" ? lufsI.toFixed(1) : "—"}
            </div>
          </div>

          {/* True Peak */}
          <div className={"rounded-2xl border px-4 py-4 " + toneClass}>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              True Peak (dBTP)
            </div>
            <div className="mt-2 text-xl font-semibold text-white tabular-nums">
              {typeof truePeak === "number"
                ? truePeak.toFixed(2)
                : "—"}
            </div>
          </div>

          {/* Duration */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Duration (min)
            </div>
            <div className="mt-2 text-xl font-semibold text-white tabular-nums">
              {typeof durationS === "number"
                ? `${Math.floor(durationS / 60)}:${String(
                    Math.round(durationS % 60)
                  ).padStart(2, "0")}`
                : "—"}
            </div>
          </div>

          {/* Headroom */}
          <div className={"rounded-2xl border px-4 py-4 " + headroomClass}>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Headroom (dB)
            </div>
            <div className="mt-2 text-xl font-semibold text-white tabular-nums">
              {typeof headroomDb === "number" ? headroomDb.toFixed(2) : "—"}
            </div>
          </div>

          {/* Encoding Risk */}
          <div className={"rounded-2xl border px-4 py-4 " + encodingRiskClass}>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Encoding Risk
            </div>
            <div className="mt-2 text-lg font-semibold text-white/85 tabular-nums">
              {encodingRiskLabel}
            </div>
            <div className="mt-1 text-[11px] text-white/45 tabular-nums">
              {typeof oversMax === "number"
                ? `Overs: ${oversMax}`
                : typeof postEncodeHeadroom === "number"
                  ? `Post headroom: ${postEncodeHeadroom.toFixed(2)} dB`
                  : "—"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

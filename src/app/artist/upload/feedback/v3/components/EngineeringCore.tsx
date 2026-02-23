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
  function toneForStereoWidth(x: number): "good" | "warn" | "critical" {
    if (!Number.isFinite(x)) return "warn";
    if (x > 0.8) return "critical";
    if (x > 0.6) return "warn";
    return "good";
  }

  function labelForStereoWidthTone(t: "good" | "warn" | "critical") {
    if (t === "good") return "OK";
    if (t === "critical") return "TOO WIDE";
    return "WIDE";
  }

  function hintForStereoWidthTone(t: "good" | "warn" | "critical") {
    if (t === "good") return "Club-safe stereo";
    if (t === "critical") return "High mono risk";
    return "Check mono compatibility";
  }

  function toneClass(t: "good" | "warn" | "critical") {
    if (t === "critical") return "border-red-500/30 bg-red-500/5";
    if (t === "warn") return "border-yellow-500/30 bg-yellow-500/5";
    return "border-emerald-500/30 bg-emerald-500/5";
  }

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

  const truePeakClass =
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

  const aacOvers =
    payload?.codec_simulation?.aac128?.overs ??
    payload?.codec_simulation?.aac128?.overs_count ??
    payload?.codec_simulation?.overs_aac ??
    payload?.codec_simulation?.aac_overs ??
    null;

  const mp3Overs =
    payload?.codec_simulation?.mp3128?.overs ??
    payload?.codec_simulation?.mp3128?.overs_count ??
    payload?.codec_simulation?.overs_mp3 ??
    payload?.codec_simulation?.mp3_overs ??
    null;

  const headEng = payload?.metrics?.loudness?.headroom_engineering ?? null;
  const postEncodeHeadroom =
    typeof headEng?.post_encode_headroom_dbtp === "number" ? headEng.post_encode_headroom_dbtp : null;

  const sourceHeadroom =
    typeof headroomDb === "number" && Number.isFinite(headroomDb) ? headroomDb : null;

  const postHeadroom =
    typeof postEncodeHeadroom === "number" && Number.isFinite(postEncodeHeadroom)
      ? Math.max(0, postEncodeHeadroom)
      : null;

  const headroomLost =
    typeof sourceHeadroom === "number" &&
    typeof postHeadroom === "number"
      ? postHeadroom - sourceHeadroom
      : null;

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

  const METRIC_TITLE = "text-[10px] uppercase tracking-wider text-white/40";
  const METRIC_VALUE = "mt-2 text-xl font-semibold text-white tabular-nums";

  const clippedSamples =
    typeof payload?.metrics?.clipping?.clipped_sample_count === "number" &&
    Number.isFinite(payload.metrics.clipping.clipped_sample_count)
      ? payload.metrics.clipping.clipped_sample_count
      : null;

  const clippingTone: "good" | "warn" | "critical" | "neutral" =
    typeof clippedSamples === "number"
      ? clippedSamples === 0
        ? "good"
        : clippedSamples < 200
          ? "warn"
          : "critical"
      : "neutral";

  const clippingClass =
    clippingTone === "critical"
      ? "border-red-500/30 bg-red-500/5"
      : clippingTone === "warn"
        ? "border-yellow-500/30 bg-yellow-500/5"
        : clippingTone === "good"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-white/10 bg-white/[0.03]";

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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 flex-grow">
          {/* Integrated LUFS */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className={METRIC_TITLE}>Integrated LUFS</div>
            <div className={METRIC_VALUE}>
              {typeof lufsI === "number" ? lufsI.toFixed(1) : "—"}
            </div>
          </div>

          {/* True Peak */}
          <div className={"rounded-2xl border px-4 py-4 " + truePeakClass}>
            <div className={METRIC_TITLE}>True Peak (dBTP)</div>
            <div className={METRIC_VALUE}>
              {typeof truePeak === "number"
                ? truePeak.toFixed(2)
                : "—"}
            </div>
          </div>

          {/* Clipping */}
          <div className={"rounded-2xl border px-4 py-4 " + clippingClass}>
            <div className={METRIC_TITLE}>Clipped Samples</div>
            <div className={METRIC_VALUE}>
              {typeof clippedSamples === "number" ? String(Math.trunc(clippedSamples)) : "—"}
            </div>
            <div className="mt-1 text-[11px] text-white/45 tabular-nums">
              {clippingTone === "good" && "OK • No hard digital clipping"}
              {clippingTone === "warn" && "WARN • Some hard clipping detected"}
              {clippingTone === "critical" && "CRITICAL • Audible clipping likely"}
              {clippingTone === "neutral" && "—"}
            </div>
          </div>

          {/* Duration */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className={METRIC_TITLE}>Duration (min)</div>
            <div className={METRIC_VALUE}>
              {typeof durationS === "number"
                ? `${Math.floor(durationS / 60)}:${String(
                    Math.round(durationS % 60)
                  ).padStart(2, "0")}`
                : "—"}
            </div>
          </div>

          {/* Headroom */}
          <div className={"rounded-2xl border px-4 py-4 " + headroomClass}>
            <div className={METRIC_TITLE}>Headroom (dB)</div>
            <div className={METRIC_VALUE}>
              {typeof headroomDb === "number" ? headroomDb.toFixed(2) : "—"}
            </div>
          </div>

          {/* Streaming Safety (status) */}
          <div className={"rounded-2xl border px-4 py-4 " + encodingRiskClass}>
            <div className={METRIC_TITLE}>Streaming Safety</div>
            <div className={METRIC_VALUE}>
              {encodingRiskTone === "good" && "OK"}
              {encodingRiskTone === "warn" && "MODERATE"}
              {encodingRiskTone === "critical" && "CRITICAL"}
              {encodingRiskTone === "neutral" && "—"}
            </div>
            <div className="mt-1 text-[11px] text-white/45 tabular-nums">
              {typeof oversMax === "number"
                ? `Overs: ${oversMax}`
                : typeof postEncodeHeadroom === "number"
                  ? `Post headroom: ${postEncodeHeadroom.toFixed(2)} dB`
                  : "—"}
            </div>
          </div>

          {/* Stereo Width Index */}
          {(() => {
            const width = payload?.metrics?.stereo?.stereo_width_index ?? null;
            const tone =
              typeof width === "number" ? toneForStereoWidth(width) : null;

            const cls =
              typeof tone === "string"
                ? toneClass(tone)
                : "border-white/10 bg-white/[0.03]";

            return (
              <div className={"rounded-2xl border px-4 py-4 " + cls}>
                <div className={METRIC_TITLE}>Stereo Width</div>

                <div className={METRIC_VALUE}>
                  {typeof width === "number" ? width.toFixed(2) : "—"}
                </div>

                <div className="mt-1 text-[11px] text-white/45 tabular-nums">
                  {typeof tone === "string" ? labelForStereoWidthTone(tone) : "—"}
                  {typeof tone === "string" ? " • " + hintForStereoWidthTone(tone) : ""}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Streaming Safety + Codec Simulation */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Streaming Safety */}
          <div
            className={
              "rounded-3xl border p-6 md:p-8 bg-white/[0.02] h-full flex flex-col " +
              (encodingRiskTone === "critical"
                ? "border-red-500/40"
                : encodingRiskTone === "warn"
                  ? "border-yellow-500/40"
                  : encodingRiskTone === "good"
                    ? "border-emerald-500/40"
                    : "border-white/10")
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Streaming Safety</h3>
                <p className="mt-1 text-sm text-white/60">
                  Risk of audible distortion after MP3/AAC conversion.
                </p>
              </div>

              <div className="text-sm font-semibold text-white/85 tabular-nums">
                {encodingRiskTone === "good" && "Streaming-safe"}
                {encodingRiskTone === "warn" && "Minor distortion risk"}
                {encodingRiskTone === "critical" && "High distortion risk"}
                {encodingRiskTone === "neutral" && "—"}
              </div>
            </div>

            <div className="mt-4 text-sm text-white/70 leading-snug line-clamp-2 min-h-[2.6em]">
              {encodingRiskTone === "good" &&
                "No digital clipping detected after MP3/AAC conversion."}
              {encodingRiskTone === "warn" &&
                "Some clipping may occur after streaming compression. Consider lowering your limiter ceiling slightly (e.g. −1.0 dBTP)."}
              {encodingRiskTone === "critical" &&
                "Your track clips after streaming conversion. Lower your limiter ceiling (e.g. −1.0 to −1.2 dBTP) or reduce overall master gain."}
            </div>

            <div className="mt-auto pt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className={METRIC_TITLE}>AAC overs</div>
                <div className={METRIC_VALUE}>
                  {typeof aacOvers === "number" ? aacOvers : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className={METRIC_TITLE}>MP3 overs</div>
                <div className={METRIC_VALUE}>
                  {typeof mp3Overs === "number" ? mp3Overs : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className={METRIC_TITLE}>Post-encode headroom</div>
                <div className={METRIC_VALUE}>
                  {typeof postHeadroom === "number"
                    ? `${postHeadroom.toFixed(2)} dB`
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Codec Simulation */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8 h-full flex flex-col">
            <div>
              <h3 className="text-lg font-semibold leading-tight">Codec Simulation</h3>
              <p className="mt-1 text-sm text-white/60">
                Lossy encode → decode check (AAC 128 / MP3 128).
              </p>
            </div>

            <div className="mt-auto pt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  AAC 128
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Headroom lost</span>
                  <span className={METRIC_VALUE}>
                    {typeof headroomLost === "number"
                      ? `${headroomLost.toFixed(2)} dB`
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  MP3 128
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Headroom lost</span>
                  <span className={METRIC_VALUE}>
                    {typeof headroomLost === "number"
                      ? `${headroomLost.toFixed(2)} dB`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

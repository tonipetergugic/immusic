import React from "react";

type HeadroomBadge = { label: string; cls: string } | null;

type Props = {
  isReady: boolean;

  v2LufsI: number | null;
  v2TruePeak: number | null;
  v2DurationS: number | null;
  v2TransientDensity: number | null;
  v2PunchIndex: number | null;
  v2P95ShortCrest: number | null;
  v2MeanShortCrest: number | null;

  headroomSourceDb: number | null;
  headroomBadge: HeadroomBadge;

  normSpotifyGain: number | null;
  normSpotifyDesired: number | null;
  normYoutubeGain: number | null;
  normAppleGain: number | null;
  normAppleUpCap: number | null;
};

export default function EngineeringPanel(props: Props) {
  const {
    isReady,

    v2LufsI,
    v2TruePeak,
    v2DurationS,
    v2TransientDensity,
    v2PunchIndex,
    v2P95ShortCrest,
    v2MeanShortCrest,

    headroomSourceDb,
    headroomBadge,

    normSpotifyGain,
    normSpotifyDesired,
    normYoutubeGain,
    normAppleGain,
    normAppleUpCap,
  } = props;

  return (
    <section className="mt-10">
      <div className="rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Engineering</h2>
            <p className="mt-1 text-sm text-white/60">Purely technical — no taste, no gate.</p>
          </div>
          <span className="text-xs text-white/40">{isReady ? "Ready" : "Pending"}</span>
        </div>

        {/* V3 Engineering KPIs (minimal, stable) */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Integrated LUFS", v: v2LufsI, fmt: (x: number) => x.toFixed(1) },
            { k: "True Peak (dBTP)", v: v2TruePeak, fmt: (x: number) => x.toFixed(2) },
            {
              k: "Duration",
              v: v2DurationS,
              fmt: (x: number) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, "0")}`,
            },
            { k: "Transient density", v: v2TransientDensity, fmt: (x: number) => x.toFixed(3) },
            { k: "Punch index", v: v2PunchIndex, fmt: (x: number) => x.toFixed(0) },
            { k: "Short crest p95", v: v2P95ShortCrest, fmt: (x: number) => x.toFixed(2) },
            { k: "Short crest mean", v: v2MeanShortCrest, fmt: (x: number) => x.toFixed(2) },
          ].map((m) => (
            <div key={m.k} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40">{m.k}</div>
              <div className="mt-1 text-sm font-semibold text-white/85 tabular-nums">
                {typeof m.v === "number" && Number.isFinite(m.v) ? m.fmt(m.v) : "—"}
              </div>
            </div>
          ))}
        </div>

        {/* Headroom & Streaming (V3) */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white/85">Headroom & Streaming</div>
              <div className="mt-1 text-xs text-white/45">Protects against encoding distortion and normalization clipping.</div>
            </div>

            {headroomBadge ? (
              <span className={"text-[10px] px-2 py-1 rounded-full border font-semibold tracking-wide " + headroomBadge.cls}>
                {headroomBadge.label}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40">True Peak</div>
              <div className="mt-1 text-sm font-semibold text-white/85 tabular-nums">
                {typeof v2TruePeak === "number" ? `${v2TruePeak.toFixed(2)} dBTP` : "—"}
              </div>
              <div className="mt-1 text-xs text-white/40">Source peak (pre-encode)</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Headroom</div>
              <div className="mt-1 text-sm font-semibold text-white/85 tabular-nums">
                {typeof headroomSourceDb === "number" ? `${headroomSourceDb.toFixed(2)} dB` : "—"}
              </div>
              <div className="mt-1 text-xs text-white/40">0.0 dBTP minus True Peak</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Guidance</div>
              <div className="mt-1 text-xs text-white/60">
                {headroomSourceDb === null
                  ? "—"
                  : headroomSourceDb <= 0.10
                    ? "Reduce limiter ceiling (e.g. -1.0 dBTP) to avoid encoding overs."
                    : headroomSourceDb <= 0.30
                      ? "Consider a slightly lower ceiling for safer streaming."
                      : "Headroom looks safe for typical encoding."}
              </div>
            </div>
          </div>
        </div>

        {/* Streaming normalization (V3) */}
        <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white/85">Streaming normalization</div>
              <div className="mt-1 text-xs text-white/45">Estimated playback gain based on loudness targets.</div>
            </div>
            <span className="text-xs text-white/35">Down-only unless headroom allows</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Spotify",
                sub: "Target −14 LUFS",
                gain: normSpotifyGain,
                extra: normSpotifyDesired !== null ? `Desired: ${normSpotifyDesired.toFixed(1)} dB` : null,
              },
              {
                title: "YouTube",
                sub: "Target −14 LUFS",
                gain: normYoutubeGain,
                extra: "Down-only",
              },
              {
                title: "Apple Music",
                sub: "Target −16 LUFS",
                gain: normAppleGain,
                extra: normAppleUpCap !== null ? `Up capped by headroom: ${normAppleUpCap.toFixed(1)} dB` : null,
              },
            ].map((x) => (
              <div key={x.title} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold text-white/80">{x.title}</div>
                <div className="mt-1 text-[11px] text-white/45">{x.sub}</div>

                <div className="mt-4 text-2xl font-semibold text-white/85 tabular-nums">
                  {typeof x.gain === "number" ? `${x.gain > 0 ? "+" : ""}${x.gain.toFixed(1)} dB` : "—"}
                </div>

                {x.extra ? <div className="mt-2 text-[11px] text-white/45">{x.extra}</div> : <div className="mt-2 text-[11px] text-white/35">—</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs text-white/40">
          More engineering panels (codec simulation, true-peak events, spectral bands, stereo/phase) will be added module-by-module.
        </div>
      </div>
    </section>
  );
}

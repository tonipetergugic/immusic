"use client";

type Props = {
  isReady: boolean;
  payload: any;
};

type Tone = "good" | "warn" | "critical" | "neutral";

function toneClass(t: Tone) {
  if (t === "critical") return "border-red-500/30 bg-red-500/5";
  if (t === "warn") return "border-yellow-500/30 bg-yellow-500/5";
  if (t === "good") return "border-emerald-500/30 bg-emerald-500/5";
  return "border-white/10 bg-white/[0.03]";
}

function fmtDb(v: any) {
  return typeof v === "number" && Number.isFinite(v)
    ? `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`
    : "—";
}

// Deterministic indicator based on playback gain:
// - Down-gain (negative): track is loud; can increase clipping risk in worst-case playback chains.
// - Up-gain (positive): track is quiet; can sound weaker after normalization (and may be capped by headroom on Apple).
function toneForGain(gainDb: any): Tone {
  if (!(typeof gainDb === "number" && Number.isFinite(gainDb))) return "neutral";

  // Up-gain (too quiet master)
  if (gainDb > 0) {
    if (gainDb >= 4) return "critical";
    if (gainDb >= 2) return "warn";
    return "good";
  }

  // Down-gain (too loud master)
  if (gainDb <= -8) return "critical";
  if (gainDb <= -4) return "warn";
  return "good";
}

function toneForApple(applied: any, desired: any, maxUp: any): Tone {
  const a = typeof applied === "number" && Number.isFinite(applied) ? applied : null;
  const d = typeof desired === "number" && Number.isFinite(desired) ? desired : null;
  const m = typeof maxUp === "number" && Number.isFinite(maxUp) ? maxUp : null;

  // If Apple wants to turn up and is capped by headroom
  if (d !== null && d > 0 && m !== null && m < d) {
    const diff = d - m;
    if (diff >= 3) return "critical";
    if (diff >= 1) return "warn";
  }

  return toneForGain(a);
}

export default function StreamingNormalization({ isReady, payload }: Props) {
  if (!isReady || !payload) return null;

  const sn = payload?.metrics?.loudness?.streaming_normalization;
  if (!sn) return null;

  const spotifyTone = toneForGain(sn?.spotify?.desired_gain_db ?? sn?.spotify?.applied_gain_db);
  const ytTone = toneForGain(sn?.youtube?.applied_gain_db);
  const appleTone = toneForApple(
    sn?.apple_music?.applied_gain_db,
    sn?.apple_music?.desired_gain_db,
    sn?.apple_music?.max_up_gain_db
  );

  const appleDesired =
    typeof sn?.apple_music?.desired_gain_db === "number" && Number.isFinite(sn?.apple_music?.desired_gain_db)
      ? sn.apple_music.desired_gain_db
      : null;

  const appleMaxUp =
    typeof sn?.apple_music?.max_up_gain_db === "number" && Number.isFinite(sn?.apple_music?.max_up_gain_db)
      ? sn.apple_music.max_up_gain_db
      : null;

  return (
    <section className="h-full">
      <div className="h-full rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8 flex flex-col">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Streaming normalization</h2>
            <p className="mt-1 text-sm text-white/60">
              Playback gain can reveal "too loud" (clipping risk) or "too quiet" (reduced impact after normalization).
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 flex-grow">
          {/* Spotify */}
          <div className={"rounded-2xl border px-4 py-4 " + toneClass(spotifyTone)}>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Spotify (−14 LUFS)
            </div>
            <div className="mt-2 text-xl font-semibold text-white tabular-nums">
              {fmtDb(sn?.spotify?.applied_gain_db)}
            </div>
          </div>

          {/* YouTube */}
          <div className={"rounded-2xl border px-4 py-4 " + toneClass(ytTone)}>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              YouTube (−14 LUFS)
            </div>
            <div className="mt-2 text-xl font-semibold text-white tabular-nums">
              {fmtDb(sn?.youtube?.applied_gain_db)}
            </div>
            <div className="mt-1 text-[11px] text-white/45">
              Turns down loud tracks only
            </div>
          </div>

          {/* Apple */}
          <div className={"rounded-2xl border px-4 py-4 " + toneClass(appleTone)}>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Apple Music (−16 LUFS)
            </div>
            <div className="mt-2 text-xl font-semibold text-white tabular-nums">
              {fmtDb(sn?.apple_music?.applied_gain_db)}
            </div>
            <div className="mt-1 text-[11px] text-white/45 tabular-nums">
              Desired: {fmtDb(sn?.apple_music?.desired_gain_db)}
            </div>

            {appleDesired !== null && appleDesired > 0 && (
              <div className="mt-1 text-[11px] text-white/45 tabular-nums">
                Max up gain (headroom): {fmtDb(appleMaxUp)}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

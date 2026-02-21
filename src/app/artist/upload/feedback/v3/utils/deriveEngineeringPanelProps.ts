type HeadroomBadge =
  | { label: "CRITICAL" | "WARN" | "OK"; cls: string }
  | null;

export type EngineeringPanelProps = {
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

export function deriveEngineeringPanelProps(params: {
  payload: any;
  isReady: boolean;
}): EngineeringPanelProps {
  const { payload, isReady } = params;

  const v2LufsI =
    typeof payload?.metrics?.lufs?.integrated === "number" && Number.isFinite(payload.metrics.lufs.integrated)
      ? payload.metrics.lufs.integrated
      : null;

  const v2TruePeak =
    typeof payload?.metrics?.true_peak?.dbtp === "number" && Number.isFinite(payload.metrics.true_peak.dbtp)
      ? payload.metrics.true_peak.dbtp
      : null;

  const headroomSourceDb =
    typeof v2TruePeak === "number" && Number.isFinite(v2TruePeak) ? 0.0 - v2TruePeak : null;

  const headroomBadge: HeadroomBadge =
    headroomSourceDb === null
      ? null
      : headroomSourceDb <= 0.10
        ? { label: "CRITICAL", cls: "border-red-400/30 bg-red-500/10 text-red-200" }
        : headroomSourceDb <= 0.30
          ? { label: "WARN", cls: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200" }
          : { label: "OK", cls: "border-white/10 bg-white/5 text-white/60" };

  const norm = payload?.metrics?.streaming_normalization ?? null;

  const normSpotifyGain = typeof norm?.spotify?.gain_db === "number" ? norm.spotify.gain_db : null;
  const normSpotifyDesired = typeof norm?.spotify?.desired_gain_db === "number" ? norm.spotify.desired_gain_db : null;

  const normYoutubeGain = typeof norm?.youtube?.gain_db === "number" ? norm.youtube.gain_db : null;

  const normAppleGain = typeof norm?.apple_music?.gain_db === "number" ? norm.apple_music.gain_db : null;
  const normAppleUpCap =
    typeof norm?.apple_music?.up_capped_by_headroom_db === "number"
      ? norm.apple_music.up_capped_by_headroom_db
      : null;

  const v2DurationS =
    typeof payload?.track?.duration_s === "number" && Number.isFinite(payload.track.duration_s)
      ? payload.track.duration_s
      : null;

  const v2PunchIndex =
    typeof payload?.metrics?.transients?.punch_index === "number" && Number.isFinite(payload.metrics.transients.punch_index)
      ? payload.metrics.transients.punch_index
      : null;

  const v2P95ShortCrest =
    typeof payload?.metrics?.crest?.short_term_p95 === "number" && Number.isFinite(payload.metrics.crest.short_term_p95)
      ? payload.metrics.crest.short_term_p95
      : null;

  const v2MeanShortCrest =
    typeof payload?.metrics?.crest?.short_term_mean === "number" && Number.isFinite(payload.metrics.crest.short_term_mean)
      ? payload.metrics.crest.short_term_mean
      : null;

  const v2TransientDensity =
    typeof payload?.track?.private_metrics?.transient_density === "number" &&
    Number.isFinite(payload.track.private_metrics.transient_density)
      ? payload.track.private_metrics.transient_density
      : null;

  return {
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
  };
}

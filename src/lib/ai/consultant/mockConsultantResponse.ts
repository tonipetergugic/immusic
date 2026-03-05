type ConsultantMetrics = {
  LUFS?: number | null
  TP?: number | null
  LRA?: number | null
  CREST?: number | null
  PHASE?: number | null
  LOW_MONO?: number | null

  WIDTH?: number | null
  MID_RMS?: number | null
  SIDE_RMS?: number | null

  ATTACK?: number | null
  DENSITY?: number | null

  SUB_RMS?: number | null
  MID_RMS_SPEC?: number | null
  AIR_RMS?: number | null
}

function fmt(n: number | null | undefined, digits = 1) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null
  return n.toFixed(digits)
}

export function mockConsultantResponse(metrics: ConsultantMetrics) {
  const lines: string[] = []

  const lufs = fmt(metrics.LUFS, 1)
  const tp = fmt(metrics.TP, 2)
  const lra = fmt(metrics.LRA, 1)

  // Loudness
  if (lufs) {
    const n = Number(lufs)
    if (n > -9) lines.push(`Loudness is strong (${lufs} LUFS). That can hit hard, but watch streaming turn-down and limiter stress.`)
    else if (n < -14) lines.push(`Loudness is quite conservative (${lufs} LUFS). That can preserve punch, but may feel quieter next to references.`)
    else lines.push(`Loudness sits in a healthy range (${lufs} LUFS). Good balance of impact and headroom.`)
  } else {
    lines.push("Loudness: no integrated value provided.")
  }

  // True Peak
  if (tp) {
    const tpNum = Number(tp)
    if (tpNum > -0.5) {
      lines.push(`True peak is very close to 0 dBTP (${tp} dBTP). For safer streaming, set a limiter ceiling around -0.8 dBTP.`)
    } else if (tpNum > -1.2) {
      lines.push(`True peak is fairly tight (${tp} dBTP). Consider -1.0 to -0.8 dBTP if you want extra codec safety.`)
    } else {
      lines.push(`True peak looks safe (${tp} dBTP). Nice headroom for encoding and playback.`)
    }
  } else {
    lines.push("True peak: no value provided.")
  }

  // Dynamics (LRA)
  if (lra) {
    const lraNum = Number(lra)
    if (lraNum < 2.0) {
      lines.push(`Dynamics are very tight (LRA ~${lra} LU). Great for club consistency, but can feel flat on streaming if over-limited.`)
    } else if (lraNum > 6.0) {
      lines.push(`Dynamics are wide (LRA ~${lra} LU). Musical and open, but check loudness consistency in dense sections.`)
    } else {
      lines.push(`Dynamics look balanced (LRA ~${lra} LU). Good mix of punch and movement.`)
    }
  } else {
    lines.push("Dynamics: no LRA value provided.")
  }

  // Stereo phase
  const phase = metrics.PHASE
  if (typeof phase === "number" && Number.isFinite(phase)) {
    if (phase < 0.2) lines.push("Stereo phase: low correlation — mono compatibility could be risky. Check the drop in mono.")
    else if (phase < 0.5) lines.push("Stereo phase: moderate correlation — mostly fine, but validate mono on leads and wide FX.")
    else lines.push("Stereo phase: correlation looks healthy. Nice mono compatibility.")
  } else {
    lines.push("Stereo phase: no value provided.")
  }

  // Low-end mono stability
  const lowMono = metrics.LOW_MONO
  if (typeof lowMono === "number" && Number.isFinite(lowMono)) {
    if (lowMono < 0.2) lines.push("Low-end mono: risky (20–120 Hz). Tighten stereo processing in the sub and re-check club translation.")
    else if (lowMono < 0.5) lines.push("Low-end mono: borderline. Consider mono below ~120 Hz for more reliable club playback.")
    else lines.push("Low-end mono: stable. Great foundation for club systems.")
  } else {
    lines.push("Low-end mono: no value provided.")
  }

  // Extra positive reinforcement (if many sections look good)
  const goodSignals =
    (tp ? (Number(tp) <= -1.2 ? 1 : 0) : 0) +
    (lra ? (Number(lra) >= 2.0 && Number(lra) <= 6.0 ? 1 : 0) : 0) +
    (typeof phase === "number" && phase >= 0.5 ? 1 : 0) +
    (typeof lowMono === "number" && lowMono >= 0.5 ? 1 : 0)

  if (goodSignals >= 3) {
    lines.push("Overall: a lot of fundamentals look solid — this is already close to release-ready from a technical perspective.")
  }

  return { explanation: lines.join(" ") }
}
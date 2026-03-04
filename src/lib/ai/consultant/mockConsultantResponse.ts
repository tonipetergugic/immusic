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

  if (lufs) {
    lines.push(`Loudness sits around ${lufs} LUFS (integrated).`)
  }

  if (tp) {
    const tpNum = Number(tp)
    if (tpNum > -0.5) {
      lines.push(
        `True peak is very close to 0 dBTP (${tp} dBTP). For safer streaming, consider a limiter ceiling around -0.8 dBTP.`
      )
    } else {
      lines.push(`True peak looks safe (${tp} dBTP).`)
    }
  }

  if (lra) {
    const lraNum = Number(lra)
    if (lraNum < 2.0) {
      lines.push(`Dynamics are quite tight (LRA ~${lra} LU). That can work for club focus, but may feel a bit flat on streaming.`)
    } else if (lraNum > 6.0) {
      lines.push(`Dynamics are fairly wide (LRA ~${lra} LU). Watch loudness consistency in dense sections.`)
    } else {
      lines.push(`Dynamics look balanced (LRA ~${lra} LU).`)
    }
  }

  const phase = metrics.PHASE
  if (typeof phase === "number" && Number.isFinite(phase)) {
    if (phase < 0.2) lines.push("Phase correlation is low — mono compatibility could be risky.")
    else if (phase < 0.5) lines.push("Phase correlation is moderate — check mono playback on key elements.")
    else lines.push("Phase correlation looks healthy for most playback situations.")
  }

  const lowMono = metrics.LOW_MONO
  if (typeof lowMono === "number" && Number.isFinite(lowMono)) {
    if (lowMono < 0.2) lines.push("Low-end mono stability looks risky (20–120 Hz). Consider tightening stereo FX in the sub.")
    else if (lowMono < 0.5) lines.push("Low-end mono stability is borderline — consider mono below ~120 Hz for club translation.")
  }

  if (lines.length === 0) {
    lines.push("Metrics received. Click again with a processed track to see a contextual interpretation.")
  }

  return { explanation: lines.join(" ") }
}
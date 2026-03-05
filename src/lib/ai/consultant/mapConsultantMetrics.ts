export type ConsultantMetrics = {
  LUFS?: number
  TP?: number
  LRA?: number
  PHASE?: number
  CREST?: number
  LOW_MONO?: number

  WIDTH?: number
  MID_RMS?: number
  SIDE_RMS?: number

  ATTACK?: number
  DENSITY?: number

  SUB_RMS?: number
  MID_RMS_SPEC?: number
  AIR_RMS?: number
}

type Raw = Record<string, unknown>

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x)
}

export function mapConsultantMetrics(raw: Raw): ConsultantMetrics {
  const out: ConsultantMetrics = {}

  // Only copy finite numbers (no null/undefined/NaN/Infinity)
  const set = (k: keyof ConsultantMetrics, v: unknown) => {
    if (isFiniteNumber(v)) out[k] = v
  }

  set("LUFS", raw.LUFS)
  set("TP", raw.TP)
  set("LRA", raw.LRA)
  set("PHASE", raw.PHASE)
  set("CREST", raw.CREST)
  set("LOW_MONO", raw.LOW_MONO)

  set("WIDTH", raw.WIDTH)
  set("MID_RMS", raw.MID_RMS)
  set("SIDE_RMS", raw.SIDE_RMS)

  set("ATTACK", raw.ATTACK)
  set("DENSITY", raw.DENSITY)

  set("SUB_RMS", raw.SUB_RMS)
  set("MID_RMS_SPEC", raw.MID_RMS_SPEC)
  set("AIR_RMS", raw.AIR_RMS)

  return out
}

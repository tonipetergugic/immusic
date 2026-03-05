export type ConsultantGoal = "club" | "streaming" | "balanced"

export type ConsultantPromptInput = {
  genre?: string | null
  goal?: ConsultantGoal | null
  // already-mapped compact metrics object (token-sparend), e.g. { LUFS, TP, LRA, PHASE, LOW_MONO, CREST, ... }
  metrics: Record<string, number | string | boolean | null | undefined>
}

function cleanMetrics(metrics: ConsultantPromptInput["metrics"]) {
  // remove null/undefined and non-finite numbers to avoid AI hallucinations + reduce tokens
  const out: Record<string, number | string | boolean> = {}
  for (const [k, v] of Object.entries(metrics || {})) {
    if (v === null || v === undefined) continue
    if (typeof v === "number" && !Number.isFinite(v)) continue
    out[k] = v as any
  }
  return out
}

export function buildConsultantPrompt(input: ConsultantPromptInput) {
  const genre = input.genre ?? "unknown"
  const goal: ConsultantGoal = (input.goal ?? "balanced") as ConsultantGoal

  // SYSTEM prompt stays stable (per PDF)
  const system = [
    "You are a professional mastering engineer with 20+ years of experience.",
    "You analyze technical mix/mastering metrics and explain them to an experienced producer.",
    "Rules:",
    "- Be concise and practical.",
    "- Only comment on metrics that matter.",
    "- Ignore values that are normal.",
    "- Give real-world mastering advice.",
    "- Mention differences between club playback and streaming platforms when relevant.",
    "- Never invent data.",
    "- Do not explain basic audio theory.",
    "- Output plain text. No markdown."
  ].join("\n")

  // CONTEXT block (per PDF)
  const context = [
    `Track Context`,
    `Genre: ${genre}`,
    `Goal: ${goal}`,
    "Interpret the metrics from a professional mastering perspective."
  ].join("\n")

  // METRICS input (minimal, token-sparend)
  const metrics = JSON.stringify(cleanMetrics(input.metrics))

  // RESPONSE format (per PDF)
  const format = [
    "Respond in this structure:",
    "Problem:",
    "Why it matters:",
    "Recommendation:"
  ].join("\n")

  const user = [
    context,
    "Metrics:",
    metrics,
    "",
    format
  ].join("\n")

  return { system, user }
}

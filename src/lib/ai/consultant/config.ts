export type AiConsultantMode = "mock" | "live"

export const AI_CONSULTANT_MODE: AiConsultantMode =
  (process.env.AI_CONSULTANT_MODE as AiConsultantMode) || "mock"

export function isAiConsultantLive() {
  // Hard safety lock: live is only allowed when explicitly enabled
  if (process.env.AI_CONSULTANT_LIVE_ENABLED !== "true") return false
  return process.env.AI_CONSULTANT_MODE === "live"
}
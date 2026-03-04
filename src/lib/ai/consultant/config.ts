export type AiConsultantMode = "mock" | "live"

export const AI_CONSULTANT_MODE: AiConsultantMode =
  (process.env.AI_CONSULTANT_MODE as AiConsultantMode) || "mock"

export function isAiConsultantLive() {
  return AI_CONSULTANT_MODE === "live"
}
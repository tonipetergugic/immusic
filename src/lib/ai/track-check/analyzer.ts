import type { TrackCheckDecision } from "@/lib/ai/track-check/types";

/**
 * Minimal Analyzer Stub (DSP comes later).
 * IMPORTANT: do not return any metrics/fail-codes (anti-leak).
 * For now: always approved.
 */
export async function analyzeAudioStub(_wavBuffer: ArrayBuffer): Promise<TrackCheckDecision> {
  return "approved";
}

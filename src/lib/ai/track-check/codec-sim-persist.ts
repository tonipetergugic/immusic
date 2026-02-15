import type { CodecSimulationResult } from "@/lib/ai/track-check/codec-simulation";

export async function persistCodecSimulationBestEffort(params: {
  admin: any;
  queueId: string;
  preTruePeakDb: number;
  sim: CodecSimulationResult | null;
}): Promise<void> {
  const { admin, queueId, preTruePeakDb, sim } = params;

  if (!sim) return;

  try {
    await admin.from("track_ai_codec_simulation").upsert(
      {
        queue_id: queueId,
        pre_true_peak_db: preTruePeakDb,

        aac128_post_true_peak_db: sim.aac128.postTruePeakDb,
        aac128_overs_count: sim.aac128.oversCount,
        aac128_headroom_delta_db: sim.aac128.headroomDeltaDb,
        aac128_distortion_risk: sim.aac128.distortionRisk,

        mp3128_post_true_peak_db: sim.mp3128.postTruePeakDb,
        mp3128_overs_count: sim.mp3128.oversCount,
        mp3128_headroom_delta_db: sim.mp3128.headroomDeltaDb,
        mp3128_distortion_risk: sim.mp3128.distortionRisk,
      },
      { onConflict: "queue_id" }
    );
  } catch {
    // best-effort: no throw, no blocking
  }
}

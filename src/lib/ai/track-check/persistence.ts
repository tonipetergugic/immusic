import type { HardFailReason } from "@/lib/ai/track-check/rules";

export async function bestEffortPersistHardFailReasons(params: {
  admin: any;
  queueId: string;
  reasons: HardFailReason[];
}) {
  try {
    const adminClient = params.admin as any;

    const { data, error } = await adminClient
      .from("track_ai_private_metrics")
      .update({ hard_fail_reasons: Array.isArray(params.reasons) ? params.reasons : [] })
      .eq("queue_id", params.queueId)
      .select("queue_id");

    if (error) {
      console.warn("[AI-CHECK] hard_fail_reasons update failed:", error);
      return;
    }

    if (!data || data.length === 0) {
      console.warn("[AI-CHECK] hard_fail_reasons update affected 0 rows (metrics row missing?)", {
        queueId: params.queueId,
      });
    }
  } catch (e) {
    console.warn("[AI-CHECK] hard_fail_reasons update crashed (ignored):", String((e as any)?.message ?? e));
  }
}

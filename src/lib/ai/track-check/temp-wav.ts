import { NextResponse } from "next/server";
import { writeTempWav } from "@/lib/audio/ingestTools";
import { resetQueueToPending } from "@/lib/ai/track-check/queue";

export type WriteTempWavResult =
  | { ok: true; tmpWavPath: string }
  | { ok: false; response: NextResponse };

export async function writeTempWavOrFail(params: {
  supabase: any;
  userId: string;
  queueId: string;
  wavBuf: ArrayBuffer;
  logStage: (stage: string, ms: number) => void;
  nowNs: () => bigint;
  elapsedMs: (startNs: bigint) => number;
}): Promise<WriteTempWavResult> {
  try {
    const tTmp = params.nowNs();
    const tmpWavPath = await writeTempWav({ wavBuf: params.wavBuf });
    params.logStage("write_temp_wav", params.elapsedMs(tTmp));
    return { ok: true, tmpWavPath };
  } catch {
    await resetQueueToPending({ supabase: params.supabase, userId: params.userId, queueId: params.queueId });

    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "tmp_wav_write_failed" }, { status: 500 }),
    };
  }
}

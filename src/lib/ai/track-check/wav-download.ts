import { NextResponse } from "next/server";
import { resetQueueToPending } from "@/lib/ai/track-check/queue";

export type DownloadWavResult =
  | { ok: true; wavBuf: ArrayBuffer }
  | { ok: false; response: any };

export async function downloadIngestWavOrFail(params: {
  supabase: any;
  audioPath: string;
  userId: string;
  queueId: string;
  logStage: (stage: string, ms: number) => void;
  nowNs: () => bigint;
  elapsedMs: (startNs: bigint) => number;
}): Promise<DownloadWavResult> {
  const tDl = params.nowNs();
  const { data: wavBlob, error: wavDlErr } = await params.supabase.storage
    .from("ingest_wavs")
    .download(params.audioPath);
  params.logStage("download_wav", params.elapsedMs(tDl));

  if (wavDlErr || !wavBlob) {
    await resetQueueToPending({ supabase: params.supabase, userId: params.userId, queueId: params.queueId });

    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "wav_download_failed" }, { status: 500 }),
    };
  }

  const wavBuf = await wavBlob.arrayBuffer();
  return { ok: true, wavBuf };
}

import { sha256HexFromArrayBuffer } from "@/lib/audio/ingestTools";

export type EnsureHashResult =
  | { ok: true; audioHash: string | null }
  | { ok: false; audioHash: null };

export async function ensureQueueAudioHash(params: {
  supabase: any;
  pendingItem: any;
  userId: string;
  wavBuf: ArrayBuffer;
}): Promise<EnsureHashResult> {
  // Ensure audio_hash exists ASAP (required for paid feedback unlock even on hard-fail rejects)
  // Do this before any terminal return paths.
  let audioHash = params.pendingItem.audio_hash as string | null;

  if (!audioHash) {
    try {
      audioHash = await sha256HexFromArrayBuffer(params.wavBuf);

      await params.supabase
        .from("tracks_ai_queue")
        .update({
          audio_hash: audioHash,
          hash_status: "done",
          hashed_at: new Date().toISOString(),
          hash_last_error: null,
        })
        .eq("id", params.pendingItem.id)
        .eq("user_id", params.userId);
    } catch {
      // Hash failure should not hard-reject user audio, but it will block unlock (action will show waiting_for_hash)
      await params.supabase
        .from("tracks_ai_queue")
        .update({
          hash_status: "error",
          hash_attempts: ((params.pendingItem as any).hash_attempts ?? 0) + 1,
          hash_last_error: "hash_failed",
        })
        .eq("id", params.pendingItem.id)
        .eq("user_id", params.userId);

      return { ok: false, audioHash: null };
    }
  }

  return { ok: true, audioHash };
}

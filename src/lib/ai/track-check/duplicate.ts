export type DuplicateCheckResult =
  | { handled: false }
  | { handled: true; kind: "queue_error" }
  | { handled: true; kind: "track_error" }
  | { handled: true; kind: "duplicate_audio" };

export async function checkDuplicateAudio(params: {
  supabase: any;
  audioHash: string;
  queueId: string;
}) : Promise<DuplicateCheckResult> {
  // Queue-level race protection: block duplicates that are already in-flight or already approved in the queue
  const { data: existingQueue, error: queueErr } = await params.supabase
    .from("tracks_ai_queue")
    .select("id")
    .eq("audio_hash", params.audioHash)
    .in("status", ["pending", "processing", "approved"])
    .neq("id", params.queueId)
    .limit(1)
    .maybeSingle();

  if (queueErr) {
    return { handled: true, kind: "queue_error" };
  }

  if (existingQueue?.id) {
    return { handled: true, kind: "duplicate_audio" };
  }

  const { data: existingTrack, error: existingErr } = await params.supabase
    .from("tracks")
    .select("id")
    .eq("audio_hash", params.audioHash)
    .limit(1)
    .maybeSingle();

  if (existingErr) {
    return { handled: true, kind: "track_error" };
  }

  if (existingTrack?.id) {
    return { handled: true, kind: "duplicate_audio" };
  }

  return { handled: false };
}

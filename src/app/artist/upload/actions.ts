"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createHash } from "crypto";

export async function submitToQueueAction(formData: FormData) {
  const audioPath = formData.get("audio_path")?.toString().trim();
  const title = formData.get("title")?.toString().trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!audioPath) {
    throw new Error("No audio file uploaded.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData?.user) {
    throw new Error("Not authenticated.");
  }

  const userId = authData.user.id;

  // Guard 1: audio_path darf nur in den eigenen User-Prefix zeigen (verhindert manipulierte Hidden Inputs)
  if (!audioPath.startsWith(`${userId}/`)) {
    throw new Error("Invalid audio path.");
  }

  // Guard 2: keine Doppel-Queue NUR für dasselbe audio_path
  // (Neue Uploads mit neuem audio_path müssen immer eine neue Queue bekommen.)
  const { data: existingPending, error: pendingErr } = await supabase
    .from("tracks_ai_queue")
    .select("id")
    .eq("user_id", userId)
    .eq("audio_path", audioPath)
    .in("status", ["pending", "processing"])
    .limit(1);

  if (pendingErr) {
    throw new Error(`Failed to verify queue state: ${pendingErr.message}`);
  }

  if (existingPending && existingPending.length > 0) {
    redirect("/artist/upload/processing");
  }

  const { data: insertedRow, error: insertErr } = await supabase
    .from("tracks_ai_queue")
    .insert({
      user_id: userId,
      audio_path: audioPath,
      title,
      status: "pending",
      hash_status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !insertedRow?.id) {
    throw new Error(`Failed to queue track: ${insertErr?.message ?? "unknown insert error"}`);
  }

  const queueId = insertedRow.id as string;

  // Best-effort: Hash direkt nach Insert setzen (damit process-next sofort arbeiten kann)
  try {
    const { data: file, error: dlErr } = await supabase.storage.from("tracks").download(audioPath);

    if (dlErr || !file) {
      // Markiere Hash-Fehler, aber blockiere den Flow nicht komplett
      await supabase
        .from("tracks_ai_queue")
        .update({
          hash_status: "error",
          hash_attempts: 1,
          hash_last_error: `download_failed: ${dlErr?.message ?? "unknown"}`,
        })
        .eq("id", queueId)
        .eq("user_id", userId)
        .eq("hash_status", "pending")
        .is("audio_hash", null);

      redirect("/artist/upload/processing");
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (!buf || buf.length === 0) {
      await supabase
        .from("tracks_ai_queue")
        .update({
          hash_status: "error",
          hash_attempts: 1,
          hash_last_error: "download_failed: empty_file",
        })
        .eq("id", queueId)
        .eq("user_id", userId)
        .eq("hash_status", "pending")
        .is("audio_hash", null);

      redirect("/artist/upload/processing");
    }

    const hex = createHash("sha256").update(buf).digest("hex");

    await supabase
      .from("tracks_ai_queue")
      .update({
        audio_hash: hex,
        hash_status: "done",
        hashed_at: new Date().toISOString(),
        hash_last_error: null,
      })
      .eq("id", queueId)
      .eq("user_id", userId)
      .eq("hash_status", "pending")
      .is("audio_hash", null);
  } catch (e) {
    await supabase
      .from("tracks_ai_queue")
      .update({
        hash_status: "error",
        hash_attempts: 1,
        hash_last_error: `hash_failed: ${String((e as any)?.message ?? e)}`,
      })
      .eq("id", queueId)
      .eq("user_id", userId)
      .eq("hash_status", "pending")
      .is("audio_hash", null);
  }

  redirect("/artist/upload/processing");
}

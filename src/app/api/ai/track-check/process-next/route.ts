import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile, readFile, unlink } from "node:fs/promises";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

type Decision = "approved" | "rejected";

/**
 * Minimaler Analyzer-Stub (DSP kommt später).
 * IMPORTANT: keinerlei Messwerte/Fail-Codes zurückgeben (Anti-Leak).
 * Für jetzt: immer approved.
 */
async function analyzeAudioStub(
  supabase: any,
  audioPath: string
): Promise<Decision> {
  try {
    const { data, error } = await supabase.storage
      .from("ingest_wavs")
      .download(audioPath);

    if (error || !data) return "rejected";

    // Blob size check (0 bytes / absurdly large)
    const size = (data as Blob).size ?? 0;
    if (size <= 0) return "rejected";
    if (size > 200 * 1024 * 1024) return "rejected"; // 200 MB hard safety

    // Minimal format sniffing (hard-fail only if totally broken/unknown)
    const buf = await data.arrayBuffer();
    if (!buf || buf.byteLength <= 0) return "rejected";

    const u8 = new Uint8Array(buf);

    const startsWith = (ascii: string) => {
      if (u8.length < ascii.length) return false;
      for (let i = 0; i < ascii.length; i++) {
        if (u8[i] !== ascii.charCodeAt(i)) return false;
      }
      return true;
    };

    const isWav = u8.length >= 12 && startsWith("RIFF") && String.fromCharCode(...u8.slice(8, 12)) === "WAVE";
    const isFlac = startsWith("fLaC");
    const isOgg = startsWith("OggS");
    const isMp3 = startsWith("ID3") || (u8.length >= 2 && u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0); // frame sync
    const isMp4 =
      u8.length >= 12 &&
      u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70; // "ftyp" at offset 4

    if (!(isWav || isFlac || isOgg || isMp3 || isMp4)) return "rejected";

    return "approved";
  } catch {
    return "rejected";
  }
}

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function sha256HexFromArrayBuffer(buf: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return toHex(digest);
}

async function transcodeWavToMp3_320(wavBuffer: ArrayBuffer): Promise<Uint8Array> {
  const inPath = join(tmpdir(), `immusic-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
  const outPath = join(tmpdir(), `immusic-${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`);

  try {
    await writeFile(inPath, Buffer.from(wavBuffer));

    // MP3 320 kbps CBR, stereo preserved, no video
    await execFileAsync("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inPath,
      "-vn",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "320k",
      "-compression_level",
      "0",
      outPath,
    ]);

    const mp3 = await readFile(outPath);
    return new Uint8Array(mp3);
  } finally {
    // best-effort cleanup
    try { await unlink(inPath); } catch {}
    try { await unlink(outPath); } catch {}
  }
}

async function hasFeedbackUnlock(supabase: any, userId: string, queueId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("track_ai_feedback_unlocks")
    .select("id")
    .eq("queue_id", queueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.id;
}
 
type FeedbackPayloadV1 = {
  issues: Array<{
    t?: number; // seconds
    title: string;
    detail?: string;
    severity?: "low" | "medium" | "high";
  }>;
  metrics: Record<string, number | string | null>;
  recommendations: Array<{
    title: string;
    detail?: string;
  }>;
};

async function writeFeedbackPayloadIfUnlocked(params: {
  admin: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  queueId: string;
  audioHash: string;
  decision: Decision;
}) {
  const { admin, userId, queueId, audioHash, decision } = params;

  // Only write payload if user has paid unlock (anti-leak + cost control)
  const { data: unlock, error: unlockErr } = await admin
    // Database typing may not include this table yet -> avoid "never" inference
    .from("track_ai_feedback_unlocks" as any)
    .select("id")
    .eq("queue_id", queueId)
    .eq("user_id", userId)
    .maybeSingle();

  const unlockRow = unlock as { id?: string } | null;

  if (unlockErr || !unlockRow?.id) return;

  const payload: FeedbackPayloadV1 =
    decision === "approved"
      ? {
          issues: [],
          metrics: { decision: "approved" },
          recommendations: [
            {
              title: "No critical technical issues detected (DEV stub).",
              detail:
                "This is a placeholder result. The real DSP analyzer will add timecoded issues, metrics and recommendations.",
            },
          ],
        }
      : {
          issues: [
            {
              title: "Technical listenability problems detected (DEV stub).",
              detail:
                "This is a placeholder result. The real DSP analyzer will provide precise causes and timecodes.",
              severity: "high",
            },
          ],
          metrics: { decision: "rejected" },
          recommendations: [
            {
              title: "Fix technical problems and re-upload.",
              detail:
                "Common issues: corrupted file, silence/dropouts, extreme clipping, invalid format.",
            },
          ],
        };

  // Idempotent: one payload per queue_id (DB has UNIQUE(queue_id))
  const adminClient = admin as any;

  await adminClient
    .from("track_ai_feedback_payloads")
    .upsert(
      {
        queue_id: queueId,
        user_id: userId,
        audio_hash: audioHash,
        payload_version: 1,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "queue_id" }
    );
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Step 65: Auto-recover stuck processing items (self-healing, user-scoped)
  // If a previous run crashed after claiming, don't leave the queue blocked forever.
  // We only reset rows older than 10 minutes to avoid interfering with an active run.
  await supabase
    .from("tracks_ai_queue")
    .update({ status: "pending", message: null })
    .eq("user_id", user.id)
    .eq("status", "processing")
    .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  // 1) Find oldest pending queue item for this user
  const { data: pendingItem, error: fetchErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, user_id, audio_path, title, status, hash_status, audio_hash")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: "queue_fetch_failed" }, { status: 500 });
  }

  if (!pendingItem) {
    // No pending items to process.
    // (Hashing is no longer a prerequisite; analysis runs first.)
    // Continue with terminal-state lookup below.

    // If there is no pending item, check the most recent terminal state (approved/rejected)
    const { data: lastItem, error: lastErr } = await supabase
      .from("tracks_ai_queue")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["approved", "rejected"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastErr && lastItem?.status === "approved") {
      const unlocked = await hasFeedbackUnlock(supabase, user.id, lastItem.id);
      return NextResponse.json({ ok: true, processed: true, decision: "approved", feedback_available: unlocked, queue_id: lastItem.id });
    }

    if (!lastErr && lastItem?.status === "rejected") {
      const unlocked = await hasFeedbackUnlock(supabase, user.id, lastItem.id);
      return NextResponse.json({ ok: true, processed: true, decision: "rejected", feedback_available: unlocked, queue_id: lastItem.id });
    }

    return NextResponse.json({ ok: true, processed: false, reason: "idle" });
  }

  // 2) Claim atomically-ish: pending -> processing (avoid double-processing)
  const { data: claimRows, error: claimErr } = await supabase
    .from("tracks_ai_queue")
    .update({ status: "processing" })
    .eq("id", pendingItem.id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id")
    .limit(1);

  if (claimErr) {
    return NextResponse.json({ ok: false, error: "queue_claim_failed" }, { status: 500 });
  }

  if (!claimRows || claimRows.length === 0) {
    return NextResponse.json({ ok: true, processed: false, reason: "already_claimed" });
  }

  const queueId = pendingItem.id as string;

  try {
    const audioPath = pendingItem.audio_path as string | null;
    const title = (pendingItem.title as string | null)?.trim() ?? null;

    if (!audioPath) {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "rejected", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return NextResponse.json({ ok: true, processed: true, decision: "rejected", feedback_available: unlocked, queue_id: queueId });
    }

    // 3) Analyze (stub for now)
    const decision = await analyzeAudioStub(supabase, audioPath);

    let audioHash = pendingItem.audio_hash as string | null;

    if (!audioHash) {
      try {
        const { data: fileData, error: downloadErr } =
          await supabase.storage.from("ingest_wavs").download(audioPath);

        if (!downloadErr && fileData) {
          const buf = await fileData.arrayBuffer();
          audioHash = await sha256HexFromArrayBuffer(buf);

          await supabase
            .from("tracks_ai_queue")
            .update({
              audio_hash: audioHash,
              hash_status: "done",
              hashed_at: new Date().toISOString(),
              hash_last_error: null,
            })
            .eq("id", queueId)
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("tracks_ai_queue")
            .update({
              hash_status: "error",
              hash_attempts: (pendingItem as any).hash_attempts + 1,
              hash_last_error: "download_failed",
            })
            .eq("id", queueId)
            .eq("user_id", user.id);
        }
      } catch {
        await supabase
          .from("tracks_ai_queue")
          .update({
            hash_status: "error",
            hash_attempts: (pendingItem as any).hash_attempts + 1,
            hash_last_error: "hash_failed",
          })
          .eq("id", queueId)
          .eq("user_id", user.id);
      }
    }

    // Global audio dedupe: identical master audio must not enter the system twice
    if (audioHash) {
      // Queue-level race protection: block duplicates that are already in-flight or already approved in the queue
      const { data: existingQueue, error: queueErr } = await supabase
        .from("tracks_ai_queue")
        .select("id")
        .eq("audio_hash", audioHash)
        .in("status", ["pending", "processing", "approved"])
        .neq("id", queueId)
        .limit(1)
        .maybeSingle();

      if (queueErr) {
        return NextResponse.json(
          { ok: false, error: "queue_duplicate_check_failed" },
          { status: 500 }
        );
      }

      if (existingQueue?.id) {
        // Cleanup WAV (best-effort) to avoid ingest leftovers
        try {
          await supabase.storage.from("ingest_wavs").remove([audioPath]);
        } catch {
          // ignore cleanup errors
        }

        await supabase
          .from("tracks_ai_queue")
          .update({
            status: "rejected",
            rejected_at: new Date().toISOString(),
            reject_reason: "duplicate_audio",
            message: null,
          })
          .eq("id", queueId)
          .eq("user_id", user.id);

        const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);

        return NextResponse.json({
          ok: true,
          processed: true,
          decision: "rejected",
          reason: "duplicate_audio",
          feedback_available: unlocked,
          queue_id: queueId,
        });
      }
      const { data: existingTrack, error: existingErr } = await supabase
        .from("tracks")
        .select("id")
        .eq("audio_hash", audioHash)
        .limit(1)
        .maybeSingle();

      if (existingErr) {
        await supabase
          .from("tracks_ai_queue")
          .update({ status: "pending", message: null })
          .eq("id", queueId)
          .eq("user_id", user.id);

        return NextResponse.json(
          { ok: false, error: "duplicate_check_failed" },
          { status: 500 }
        );
      }

      if (existingTrack?.id) {
        // Cleanup WAV (best-effort) to avoid ingest leftovers
        try {
          await supabase.storage.from("ingest_wavs").remove([audioPath]);
        } catch {
          // ignore cleanup errors
        }

        await supabase
          .from("tracks_ai_queue")
          .update({
            status: "rejected",
            rejected_at: new Date().toISOString(),
            reject_reason: "duplicate_audio",
            message: null,
          })
          .eq("id", queueId)
          .eq("user_id", user.id);

        const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
        return NextResponse.json({
          ok: true,
          processed: true,
          decision: "rejected",
          reason: "duplicate_audio",
          feedback_available: unlocked,
          queue_id: queueId,
        });
      }
    }

    if (decision === "rejected") {
      // Cleanup WAV (best-effort). Rejects must not leave ingest artifacts behind.
      try {
        if (audioPath) {
          await supabase.storage.from("ingest_wavs").remove([audioPath]);
        }
      } catch {
        // ignore cleanup errors
      }

      await supabase
        .from("tracks_ai_queue")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          reject_reason: "technical",
          message: null,
        })
        .eq("id", queueId)
        .eq("user_id", user.id);

      const finalAudioHash = audioHash as string;
      if (finalAudioHash) {
        await writeFeedbackPayloadIfUnlocked({
          admin,
          userId: user.id,
          queueId,
          audioHash: finalAudioHash,
          decision: "rejected",
        });
      }

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return NextResponse.json({
        ok: true,
        processed: true,
        decision: "rejected",
        feedback_available: unlocked,
        queue_id: queueId,
      });
    }

    // APPROVE -> insert track
    if (!title) {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "rejected", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return NextResponse.json({ ok: true, processed: true, decision: "rejected", feedback_available: unlocked, queue_id: queueId });
    }

    // Placeholder for transcoding output path (WAV -> MP3 happens in next step)
    const safeTitleOut = (title || "untitled")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const mp3Path = `${user.id}/${safeTitleOut}-${queueId}.mp3`;

    // Transcode WAV (ingest_wavs) -> MP3 (tracks)
    const { data: wavBlob, error: wavDlErr } = await supabase.storage
      .from("ingest_wavs")
      .download(audioPath);

    if (wavDlErr || !wavBlob) {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "pending", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      return NextResponse.json({ ok: false, error: "wav_download_failed" }, { status: 500 });
    }

    const wavBuf = await wavBlob.arrayBuffer();

    // (Optional safety) reject empty/corrupt
    if (!wavBuf || wavBuf.byteLength <= 0) {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "rejected", message: null, rejected_at: new Date().toISOString() })
        .eq("id", queueId)
        .eq("user_id", user.id);

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return NextResponse.json({ ok: true, processed: true, decision: "rejected", feedback_available: unlocked, queue_id: queueId });
    }

    let mp3Bytes: Uint8Array;
    try {
      mp3Bytes = await transcodeWavToMp3_320(wavBuf);
    } catch {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "pending", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      return NextResponse.json({ ok: false, error: "transcode_failed" }, { status: 500 });
    }

    const { error: mp3UpErr } = await supabase.storage
      .from("tracks")
      .upload(mp3Path, new Blob([Buffer.from(mp3Bytes)], { type: "audio/mpeg" }), {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (mp3UpErr) {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "pending", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      return NextResponse.json({ ok: false, error: "mp3_upload_failed" }, { status: 500 });
    }

    // Delete WAV (best-effort). If it fails, we still proceed; cleanup can be retried later.
    await supabase.storage.from("ingest_wavs").remove([audioPath]);

    const finalAudioHash = audioHash as string | null;

    if (!finalAudioHash) {
      // Should not happen because we hash after analysis, but keep it safe.
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "pending", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      return NextResponse.json({ ok: false, error: "missing_audio_hash" }, { status: 500 });
    }

    const { error: trackError } = await supabase.from("tracks").insert({
      artist_id: user.id,
      audio_path: mp3Path,
      title,
      status: "approved",
      source_queue_id: queueId,
      audio_hash: finalAudioHash,
    });

    if (trackError) {
      // Unique violations can mean either:
      // - idempotency (source_queue_id already inserted)
      // - global dedupe (audio_hash already exists)
      if ((trackError as any).code === "23505") {
        const msg = String((trackError as any).message ?? "");
        const isAudioHashUnique =
          msg.includes("tracks_audio_hash_unique") || msg.includes("audio_hash");
        const isQueueUnique =
          msg.includes("tracks_source_queue_id_uq") || msg.includes("source_queue_id");

        // If it's the global audio hash unique constraint => controlled duplicate rejection
        if (isAudioHashUnique && !isQueueUnique) {
          await supabase
            .from("tracks_ai_queue")
            .update({
              status: "rejected",
              rejected_at: new Date().toISOString(),
              reject_reason: "duplicate_audio",
              message: null,
            })
            .eq("id", queueId)
            .eq("user_id", user.id);

          const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);

          return NextResponse.json({
            ok: true,
            processed: true,
            decision: "rejected",
            reason: "duplicate_audio",
            feedback_available: unlocked,
            queue_id: queueId,
          });
        }

        // Otherwise treat as idempotency for this queue
        await supabase
          .from("tracks_ai_queue")
          .update({ status: "approved", message: null, audio_path: mp3Path })
          .eq("id", queueId)
          .eq("user_id", user.id);

        if (finalAudioHash) {
          await writeFeedbackPayloadIfUnlocked({
            admin,
            userId: user.id,
            queueId,
            audioHash: finalAudioHash,
            decision: "approved",
          });
        }

        const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
        return NextResponse.json({
          ok: true,
          processed: true,
          decision: "approved",
          feedback_available: unlocked,
          queue_id: queueId,
        });
      }

      // Other insert errors are real errors
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "pending", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      return NextResponse.json(
        { ok: false, error: "track_insert_failed" },
        { status: 500 }
      );
    }

    await supabase
      .from("tracks_ai_queue")
      .update({ status: "approved", message: null, audio_path: mp3Path })
      .eq("id", queueId)
      .eq("user_id", user.id);

    if (finalAudioHash) {
      await writeFeedbackPayloadIfUnlocked({
        admin,
        userId: user.id,
        queueId,
        audioHash: finalAudioHash,
        decision: "approved",
      });
    }

    const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
    return NextResponse.json({ ok: true, processed: true, decision: "approved", feedback_available: unlocked, queue_id: queueId });
  } catch {
    // Absoluter Safety-Net: niemals in processing hängen bleiben
    await supabase
      .from("tracks_ai_queue")
      .update({ status: "pending", message: null })
      .eq("id", queueId)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: false, error: "worker_unhandled_error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QueueRequestBody = {
  audio_path?: unknown;
  title?: unknown;
  version?: unknown;
  main_genre?: unknown;
  genre?: unknown;
  bpm?: unknown;
  key?: unknown;
  reference_artist?: unknown;
  reference_track?: unknown;
};

export async function POST(request: Request) {
  let body: QueueRequestBody;

  try {
    body = (await request.json()) as QueueRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const audioPath =
    typeof body.audio_path === "string" ? body.audio_path.trim() : "";
  const title =
    typeof body.title === "string" ? body.title.trim() : "";
  const version =
    typeof body.version === "string" ? body.version.trim() : "";
  const mainGenre =
    typeof body.main_genre === "string" ? body.main_genre.trim() : "";
  const genre =
    typeof body.genre === "string" ? body.genre.trim() : "";
  const bpm =
    typeof body.bpm === "number"
      ? body.bpm
      : typeof body.bpm === "string"
        ? Number.parseInt(body.bpm.trim(), 10)
        : Number.NaN;
  const key =
    typeof body.key === "string" ? body.key.trim() : "";
  const referenceArtist =
    typeof body.reference_artist === "string"
      ? body.reference_artist.trim()
      : "";
  const referenceTrack =
    typeof body.reference_track === "string"
      ? body.reference_track.trim()
      : "";

  if (!title) {
    return NextResponse.json(
      { ok: false, error: "Title is required." },
      { status: 400 }
    );
  }

  if (!version) {
    return NextResponse.json(
      { ok: false, error: "Version is required." },
      { status: 400 }
    );
  }

  if (!mainGenre) {
    return NextResponse.json(
      { ok: false, error: "Main genre is required." },
      { status: 400 }
    );
  }

  if (!genre) {
    return NextResponse.json(
      { ok: false, error: "Subgenre is required." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(bpm) || bpm <= 0 || bpm > 300) {
    return NextResponse.json(
      { ok: false, error: "A valid BPM is required." },
      { status: 400 }
    );
  }

  if (!key) {
    return NextResponse.json(
      { ok: false, error: "Key is required." },
      { status: 400 }
    );
  }

  if (!audioPath) {
    return NextResponse.json(
      { ok: false, error: "No audio file uploaded." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  if (!audioPath.startsWith(`${user.id}/`)) {
    return NextResponse.json(
      { ok: false, error: "Invalid audio path." },
      { status: 400 }
    );
  }

  const { data: existingPending, error: pendingErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("audio_path", audioPath)
    .in("status", ["pending", "processing"])
    .limit(1);

  if (pendingErr) {
    return NextResponse.json(
      { ok: false, error: `Failed to verify queue state: ${pendingErr.message}` },
      { status: 500 }
    );
  }

  const existingRow = existingPending?.[0];
  const existingQueueId = existingRow?.id;
  const existingStatus =
    typeof existingRow?.status === "string" ? existingRow.status : "";

  if (typeof existingQueueId === "string" && existingQueueId.length > 0) {
    if (existingStatus === "pending") {
      const { error: updatePendingErr } = await supabase
        .from("tracks_ai_queue")
        .update({
          title,
          version,
          main_genre: mainGenre,
          genre,
          bpm,
          key,
          reference_artist: referenceArtist || null,
          reference_track: referenceTrack || null,
        })
        .eq("id", existingQueueId)
        .eq("user_id", user.id);

      if (updatePendingErr) {
        return NextResponse.json(
          {
            ok: false,
            error: `Failed to refresh pending queue metadata: ${updatePendingErr.message}`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      queue_id: existingQueueId,
    });
  }

  const { data: insertedRow, error: insertErr } = await supabase
    .from("tracks_ai_queue")
    .insert({
      user_id: user.id,
      audio_path: audioPath,
      title,
      version,
      main_genre: mainGenre,
      genre,
      bpm,
      key,
      reference_artist: referenceArtist || null,
      reference_track: referenceTrack || null,
      status: "pending",
      hash_status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !insertedRow?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to queue track: ${insertErr?.message ?? "unknown insert error"}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    queue_id: insertedRow.id,
  });
}

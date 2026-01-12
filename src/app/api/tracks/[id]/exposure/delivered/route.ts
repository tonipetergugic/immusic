import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: trackId } = await params;
  if (!trackId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("mark_exposure_delivered", {
    p_track_id: trackId,
  });

  if (error) {
    const msg = error.message || "Unknown error";
    if (msg.toLowerCase().includes("unauthorized")) {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    if (msg.toLowerCase().includes("exposure not active")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: data?.[0] ?? null }, { status: 200 });
}


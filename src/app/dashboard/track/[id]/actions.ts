"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateTrackLyricsAction(trackId: string, lyrics: string) {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, error: "Not authenticated" as const };

  // Load track to check ownership
  const { data: track, error: trackErr } = await supabase
    .from("tracks")
    .select("id, artist_id")
    .eq("id", trackId)
    .maybeSingle();

  if (trackErr || !track) return { ok: false, error: "Track not found" as const };

  // Load role (admin override)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  const isOwner = track.artist_id === user.id;

  if (!isAdmin && !isOwner) {
    return { ok: false, error: "Not allowed" as const };
  }

  const { error: updateErr } = await supabase
    .from("tracks")
    .update({ lyrics })
    .eq("id", trackId);

  if (updateErr) return { ok: false, error: "Update failed" as const };

  return { ok: true as const };
}

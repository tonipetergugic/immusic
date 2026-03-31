"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ReorderResult = { ok: true } | { ok: false; error: string };

export async function reorderPlaylistTracksAction(
  playlistId: string,
  newOrder: { track_id: string; position: number }[],
): Promise<ReorderResult> {
  if (!playlistId) return { ok: false, error: "Missing playlistId" };
  if (!Array.isArray(newOrder) || newOrder.length === 0) {
    return { ok: false, error: "Empty order" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  // Owner-check: only playlist owner can reorder
  const { data: playlist, error: pErr } = await supabase
    .from("playlists")
    .select("created_by")
    .eq("id", playlistId)
    .single();

  if (pErr || !playlist) return { ok: false, error: "Playlist not found" };
  if (playlist.created_by !== user.id) return { ok: false, error: "Forbidden" };

  const { error: reorderError } = await supabase.rpc(
    "reorder_playlist_tracks_atomic",
    {
      p_playlist_id: playlistId,
      p_new_order: newOrder,
    }
  );

  if (reorderError) {
    console.error("Failed to reorder playlist tracks atomically:", reorderError);
    return { ok: false, error: reorderError.message };
  }

  revalidatePath(`/dashboard/playlist/${playlistId}`);
  return { ok: true };
}


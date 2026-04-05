import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getArtistTrackIds(artistId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  const { data: artistTracks, error: artistTracksErr } = await supabase
    .from("tracks")
    .select("id")
    .eq("artist_id", artistId);

  if (artistTracksErr) throw new Error(artistTracksErr.message);

  return (artistTracks || []).map((t) => String(t.id));
}

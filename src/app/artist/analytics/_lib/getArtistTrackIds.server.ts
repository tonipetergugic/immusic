import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ArtistTrackRow = {
  id: string | null;
};

type ArtistMembershipRow = {
  track_id: string | null;
};

export async function getArtistTrackIds(artistId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  const { data: artistTracks, error: artistTracksErr } = await supabase
    .from("tracks")
    .select("id")
    .eq("artist_id", artistId);

  if (artistTracksErr) throw new Error(artistTracksErr.message);

  const { data: membershipTracks, error: membershipTracksErr } = await supabase
    .from("analytics_artist_track_memberships")
    .select("track_id")
    .eq("artist_id", artistId);

  if (membershipTracksErr) throw new Error(membershipTracksErr.message);

  return Array.from(
    new Set([
      ...((artistTracks ?? []) as ArtistTrackRow[])
        .map((row) => String(row.id ?? ""))
        .filter(Boolean),
      ...((membershipTracks ?? []) as ArtistMembershipRow[])
        .map((row) => String(row.track_id ?? ""))
        .filter(Boolean),
    ])
  );
}

import { PlayerTrack } from "@/types/playerTrack";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// SERVER-ONLY: darf in Client Components NICHT importiert werden!
export async function getReleaseQueueForPlayerServer(
  releaseId: string
): Promise<PlayerTrack[]> {
  const supabase = await createSupabaseServerClient();

  /**
   * 1) Release + Cover laden (einmal)
   */
  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("cover_path")
    .eq("id", releaseId)
    .single();

  if (releaseError) throw releaseError;

  let cover_url: string | null = null;
  if (release?.cover_path) {
    const { data } = supabase.storage
      .from("release_covers")
      .getPublicUrl(release.cover_path);

    cover_url = data.publicUrl ?? null;
  }

  /**
   * 2) Release-Tracks laden (geordnet)
   */
  const { data, error } = await supabase
    .from("release_tracks")
    .select(
      `
      id,
      release_id,
      position,
      tracks:track_id (
        id,
        title,
        audio_path,
        artist_id,
        bpm,
        key,
        profiles:artist_id ( display_name )
      )
    `
    )
    .eq("release_id", releaseId)
    .order("position", { ascending: true });

  if (error) throw error;

  /**
   * 3) PlayerTrack Queue bauen
   */
  const queue: PlayerTrack[] = (data ?? [])
    .map((row: any) => {
      const t = row.tracks;
      if (!t?.id || !t?.audio_path || !t?.artist_id) return null;

      const { data: audioPublic } = supabase.storage
        .from("tracks")
        .getPublicUrl(t.audio_path);

      return {
        id: t.id,
        title: t.title,
        artist_id: t.artist_id,
        audio_url: audioPublic.publicUrl,
        cover_url,
        bpm: t.bpm ?? null,
        key: t.key ?? null,
        profiles: t.profiles ?? null,
        release_id: releaseId,
        release_track_id: row.id,
      } satisfies PlayerTrack;
    })
    .filter(Boolean) as PlayerTrack[];

  return queue;
}


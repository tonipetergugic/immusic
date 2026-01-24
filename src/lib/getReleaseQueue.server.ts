import { PlayerTrack } from "@/types/playerTrack";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toPlayerTrackList } from "@/lib/playerTrack";

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
        version,
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
  // Build explicit mapper inputs (no spreading DB rows)
  const inputs = (data ?? [])
    .map((row: any) => {
      const t = row.tracks;
      if (!t?.id || !t?.audio_path || !t?.artist_id) return null;

      const { data: audioPublic } = supabase.storage
        .from("tracks")
        .getPublicUrl(t.audio_path);

      const audio_url = audioPublic?.publicUrl ?? null;
      if (!audio_url) return null;

      return {
        id: t.id,
        title: t.title ?? null,
        artist_id: t.artist_id ?? null,
        audio_url,
        cover_url,
        bpm: t.bpm ?? null,
        key: t.key ?? null,
        profiles: t.profiles ?? null,
        // keep linkage fields available for later merge
        release_id: releaseId,
        release_track_id: row.id ?? null,
      };
    })
    .filter(Boolean) as any[];

  const mapped = toPlayerTrackList(inputs);

  // Re-attach linkage fields (toPlayerTrackList does not preserve these extras)
  const queue: PlayerTrack[] = mapped.map((pt, idx) => ({
    ...pt,
    release_id: inputs[idx]?.release_id ?? null,
    release_track_id: inputs[idx]?.release_track_id ?? null,
  }));

  return queue;
}


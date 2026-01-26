export type DisplayArtist = { id: string; display_name: string };

export function buildArtistsList(row: any): DisplayArtist[] {
  const primary =
    row?.track?.artist?.id && row?.track?.artist?.display_name
      ? {
          id: String(row.track.artist.id),
          display_name: String(row.track.artist.display_name),
        }
      : null;

  const collabs = Array.isArray(row?.track?.track_collaborators)
    ? row.track.track_collaborators
        .map((c: any) =>
          c?.profiles?.id && c?.profiles?.display_name
            ? { id: String(c.profiles.id), display_name: String(c.profiles.display_name) }
            : null
        )
        .filter(Boolean)
    : [];

  // Deduplicate by id, preserve order (primary first)
  const map = new Map<string, DisplayArtist>();
  if (primary) map.set(primary.id, primary);
  for (const a of collabs) map.set((a as any).id, a as any);

  return Array.from(map.values());
}

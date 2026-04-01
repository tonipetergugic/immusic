export type DisplayArtist = { id: string; display_name: string };

type ArtistProfile = {
  id: string;
  display_name: string | null;
};

export type ResolvedArtistRow = {
  id: string | null;
  display_name: string | null;
};

type BuildArtistsListParams = {
  primaryArtist?: ArtistProfile | null;
  resolvedArtists?: ResolvedArtistRow[] | null;
};

export function buildArtistsList({
  primaryArtist,
  resolvedArtists,
}: BuildArtistsListParams): DisplayArtist[] {
  const map = new Map<string, DisplayArtist>();

  if (Array.isArray(resolvedArtists)) {
    for (const artist of resolvedArtists) {
      const id = String(artist?.id ?? "");
      if (!id) continue;

      map.set(id, {
        id,
        display_name: String(artist?.display_name ?? "Unknown Artist"),
      });
    }
  }

  if (map.size === 0 && primaryArtist?.id) {
    map.set(String(primaryArtist.id), {
      id: String(primaryArtist.id),
      display_name: String(primaryArtist.display_name ?? "Unknown Artist"),
    });
  }

  return Array.from(map.values());
}

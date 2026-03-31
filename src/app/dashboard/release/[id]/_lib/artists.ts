export type DisplayArtist = { id: string; display_name: string };

type ArtistProfile = {
  id: string;
  display_name: string | null;
};

type TrackCollaborator = {
  profiles: ArtistProfile | ArtistProfile[] | null;
};

type ReleaseArtistsRow = {
  track?: {
    artist?: ArtistProfile | ArtistProfile[] | null;
    track_collaborators?: TrackCollaborator[] | null;
  } | null;
};

export function buildArtistsList(row: ReleaseArtistsRow): DisplayArtist[] {
  const primarySource = Array.isArray(row.track?.artist)
    ? row.track.artist[0]
    : row.track?.artist;

  const primary =
    primarySource?.id && primarySource.display_name
      ? {
          id: String(primarySource.id),
          display_name: String(primarySource.display_name),
        }
      : null;

  const collabs: DisplayArtist[] = Array.isArray(row.track?.track_collaborators)
    ? row.track.track_collaborators
        .map((collaborator) => {
          const profile = Array.isArray(collaborator.profiles)
            ? collaborator.profiles[0]
            : collaborator.profiles;

          return profile?.id && profile.display_name
            ? {
                id: String(profile.id),
                display_name: String(profile.display_name),
              }
            : null;
        })
        .filter((artist): artist is DisplayArtist => artist !== null)
    : [];

  // Deduplicate by id, preserve order (primary first)
  const map = new Map<string, DisplayArtist>();
  if (primary) map.set(primary.id, primary);
  for (const artist of collabs) map.set(artist.id, artist);

  return Array.from(map.values());
}

import type { SupabaseClient } from "@supabase/supabase-js";

type LibraryReleaseListItem = {
  id: string;
  title: string | null;
  coverUrl: string | null;
  releaseType: string | null;
  releaseDate: string | null;
  artistId: string | null;
  artistName: string | null;
};

type LibraryReleaseSavedRow = {
  release_id: string | null;
  saved_at: string | null;
};

type LibraryReleaseProfileRow = {
  display_name: string | null;
};

type LibraryReleaseSourceRow = {
  id: string | null;
  title: string | null;
  cover_path: string | null;
  cover_preview_path: string | null;
  release_type: string | null;
  release_date: string | null;
  artist_id: string | null;
  profiles: LibraryReleaseProfileRow | LibraryReleaseProfileRow[] | null;
};

export async function loadLibraryV2Releases({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<LibraryReleaseListItem[]> {
  const { data: rows, error } = await supabase
    .from("library_releases")
    .select("release_id, saved_at")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  if (error) {
    console.error("LibraryV2: Failed to load library_releases:", error);
    return [];
  }

  const releaseIds = Array.from(
    new Set(
      ((rows ?? []) as LibraryReleaseSavedRow[])
        .map((row) => row.release_id)
        .filter((releaseId): releaseId is string => Boolean(releaseId))
    )
  );

  if (releaseIds.length === 0) return [];

  if (releaseIds.length === 0) return [];

  const { data: releases, error: releasesErr } = await supabase
    .from("releases")
    .select(
      `
      id,
      title,
      cover_path,
      cover_preview_path,
      release_type,
      release_date,
      artist_id,
      profiles:artist_id (
        display_name
      )
      `
    )
    .in("id", releaseIds);

  if (releasesErr) {
    console.error("LibraryV2: Failed to load releases:", releasesErr);
    return [];
  }

  const byId = new Map(
    ((releases ?? []) as LibraryReleaseSourceRow[])
      .filter((release): release is LibraryReleaseSourceRow & { id: string } => Boolean(release.id))
      .map((release) => {
        const profile = Array.isArray(release.profiles)
          ? (release.profiles[0] ?? null)
          : (release.profiles ?? null);

        const item: LibraryReleaseListItem = {
          id: String(release.id),
          title: release.title ?? null,
          coverUrl: (() => {
            const preferredCoverPath =
              release.cover_preview_path ?? release.cover_path ?? null;

            return preferredCoverPath
              ? supabase.storage
                  .from("release_covers")
                  .getPublicUrl(preferredCoverPath).data.publicUrl ?? null
              : null;
          })(),
          releaseType: release.release_type ?? null,
          releaseDate: release.release_date ?? null,
          artistId: release.artist_id ?? null,
          artistName: profile?.display_name ?? null,
        };

        return [String(release.id), item] as const;
      })
  );

  return releaseIds
    .map((id) => byId.get(String(id)) ?? null)
    .filter((release): release is LibraryReleaseListItem => Boolean(release));
}

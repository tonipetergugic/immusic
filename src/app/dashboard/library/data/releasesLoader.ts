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

type LibraryExplicitReleaseRow = {
  release_id: string | null;
};

type LibraryReleaseProfileRow = {
  display_name: string | null;
};

type LibraryReleaseSourceRow = {
  id: string | null;
  title: string | null;
  cover_path: string | null;
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

  let hideExplicitTracks = false;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("hide_explicit_tracks")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("LibraryV2: Failed to load explicit preference for releases:", profileErr);
  } else {
    hideExplicitTracks = !!profile?.hide_explicit_tracks;
  }

  let visibleReleaseIds = releaseIds;

  if (hideExplicitTracks) {
    const { data: explicitRows, error: explicitErr } = await supabase
      .from("release_tracks")
      .select("release_id, tracks!inner(is_explicit)")
      .in("release_id", releaseIds)
      .eq("tracks.is_explicit", true);

    if (explicitErr) {
      console.error("LibraryV2: Failed to filter explicit releases:", explicitErr);
    } else {
      const blockedReleaseIds = new Set(
        ((explicitRows ?? []) as LibraryExplicitReleaseRow[])
          .map((row) => row.release_id)
          .filter((releaseId): releaseId is string => Boolean(releaseId))
          .map((releaseId) => String(releaseId))
      );

      visibleReleaseIds = releaseIds.filter((id) => !blockedReleaseIds.has(String(id)));
    }
  }

  if (visibleReleaseIds.length === 0) return [];

  const { data: releases, error: releasesErr } = await supabase
    .from("releases")
    .select(
      `
      id,
      title,
      cover_path,
      release_type,
      release_date,
      artist_id,
      profiles:artist_id (
        display_name
      )
      `
    )
    .in("id", visibleReleaseIds);

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
          coverUrl: release.cover_path
            ? supabase.storage
                .from("release_covers")
                .getPublicUrl(release.cover_path).data.publicUrl ?? null
            : null,
          releaseType: release.release_type ?? null,
          releaseDate: release.release_date ?? null,
          artistId: release.artist_id ?? null,
          artistName: profile?.display_name ?? null,
        };

        return [String(release.id), item] as const;
      })
  );

  return visibleReleaseIds
    .map((id) => byId.get(String(id)) ?? null)
    .filter((release): release is LibraryReleaseListItem => Boolean(release));
}

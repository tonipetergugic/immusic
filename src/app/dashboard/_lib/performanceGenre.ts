export type PerfItemLike = { track_id: string };
export type TrackMetaLike = { genre?: string | null };

export function getPerformanceGenreOptions(
  performanceItems: PerfItemLike[] | null | undefined,
  perfTrackMetaMap: Record<string, TrackMetaLike> | null | undefined
): string[] {
  return Array.from(
    new Set(
      (performanceItems ?? [])
        .map((it) => {
          const trackId = it.track_id;
          const genre = perfTrackMetaMap?.[trackId]?.genre ?? null;
          return genre && genre.trim() ? genre.trim() : "Unknown";
        })
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

export function filterPerformanceItemsByGenre(
  performanceItems: PerfItemLike[] | null | undefined,
  performanceGenre: string,
  perfTrackMetaMap: Record<string, TrackMetaLike> | null | undefined
): PerfItemLike[] {
  const items = performanceItems ?? [];

  if (performanceGenre === "all") return items;

  const target = performanceGenre.toLowerCase();

  return items.filter((it) => {
    const trackId = it.track_id;
    const genre = perfTrackMetaMap?.[trackId]?.genre ?? "Unknown";
    const genreLower = (genre || "Unknown").toLowerCase().trim();
    return genreLower === target;
  });
}

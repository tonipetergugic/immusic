import "server-only";

import { getArtistAnalyticsSummary, type AnalyticsRange } from "@/lib/analytics/getArtistAnalytics.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Range, TopConvertingTrackRow } from "../types";
import type { ValidListenRow, TrackTitleRow, SummaryRow } from "./analyticsRows";

export type ConversionTabData = {
  topConvertingTracks: TopConvertingTrackRow[];
  savesCount: number;
  conversionPct: number;
};

function rangeToDays(r: Range): number | null {
  if (r === "7d") return 7;
  if (r === "28d") return 28;
  if (r === "all") return null;
  return 28;
}

export async function getConversionTabData(args: {
  artistId: string;
  range: Range;
  trackIds: string[];
}): Promise<ConversionTabData> {
  const { artistId, range, trackIds } = args;

  if (trackIds.length === 0) {
    return {
      topConvertingTracks: [],
      savesCount: 0,
      conversionPct: Number.NaN,
    };
  }

  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdmin();
  const days = rangeToDays(range);

  const summary = await getArtistAnalyticsSummary({
    artistId,
    range: range as AnalyticsRange,
  });

  let savesCount = 0;

  if (trackIds.length > 0) {
    let savesQuery = supabaseAdmin
      .from("library_tracks")
      .select("track_id", { count: "exact", head: true })
      .in("track_id", trackIds)
      .neq("user_id", artistId);

    if (days !== null) {
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const fromISO = from.toISOString().slice(0, 10);
      savesQuery = savesQuery.gte("created_at", `${fromISO}T00:00:00.000Z`);
    }

    const { count, error: savesErr } = await savesQuery;

    if (savesErr) throw new Error(savesErr.message);
    savesCount = count ?? 0;
  }

  const uniqueListenersInRange = Number(
    ((summary as SummaryRow | null)?.unique_listeners_total) ?? 0
  );

  const conversionPct =
    uniqueListenersInRange > 0
      ? (Number(savesCount ?? 0) / uniqueListenersInRange) * 100
      : Number.NaN;

  const toPublicCoverUrl = (p: string | null): string | null => {
    if (!p) return null;
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    const { data } = supabase.storage.from("release_covers").getPublicUrl(p);
    return data.publicUrl ?? null;
  };

  const loadPublishedCoverPathByTrackIds = async (trackIds: string[]) => {
    const coverPathByTrackId = new Map<string, string | null>();

    if (!trackIds.length) return coverPathByTrackId;

    const { data: releaseTrackRows, error: releaseTrackErr } = await supabase
      .from("release_tracks")
      .select(`
      track_id,
      release_id,
      releases!inner (
        id,
        status,
        cover_path,
        published_at,
        created_at
      )
    `)
      .in("track_id", trackIds)
      .eq("releases.status", "published");

    if (releaseTrackErr) throw new Error(releaseTrackErr.message);

    type PublishedReleasePickRow = {
      track_id: string | null;
      release_id: string | null;
      releases:
        | {
            id: string | null;
            status: string | null;
            cover_path: string | null;
            published_at: string | null;
            created_at: string | null;
          }
        | {
            id: string | null;
            status: string | null;
            cover_path: string | null;
            published_at: string | null;
            created_at: string | null;
          }[]
        | null;
    };

    const bestByTrackId = new Map<
      string,
      {
        release_id: string;
        cover_path: string | null;
        published_at: string | null;
        created_at: string | null;
      }
    >();

    ((releaseTrackRows || []) as PublishedReleasePickRow[]).forEach((row) => {
      const trackId = row.track_id ? String(row.track_id) : null;
      if (!trackId) return;

      const release = Array.isArray(row.releases) ? row.releases[0] : row.releases;
      if (!release?.id) return;

      const next = {
        release_id: String(release.id),
        cover_path: release.cover_path ? String(release.cover_path) : null,
        published_at: release.published_at ? String(release.published_at) : null,
        created_at: release.created_at ? String(release.created_at) : null,
      };

      const prev = bestByTrackId.get(trackId);

      if (!prev) {
        bestByTrackId.set(trackId, next);
        return;
      }

      const nextPublished = next.published_at ?? "";
      const prevPublished = prev.published_at ?? "";

      if (nextPublished > prevPublished) {
        bestByTrackId.set(trackId, next);
        return;
      }

      if (nextPublished < prevPublished) return;

      const nextCreated = next.created_at ?? "";
      const prevCreated = prev.created_at ?? "";

      if (nextCreated > prevCreated) {
        bestByTrackId.set(trackId, next);
        return;
      }

      if (nextCreated < prevCreated) return;

      if (next.release_id > prev.release_id) {
        bestByTrackId.set(trackId, next);
      }
    });

    bestByTrackId.forEach((value, key) => {
      coverPathByTrackId.set(key, value.cover_path);
    });

    return coverPathByTrackId;
  };

  const topConvertingTracks: TopConvertingTrackRow[] = [];

  // Unique listeners per track in selected range (truth from valid_listen_events)
  const uniqByTrack = new Map<string, Set<string>>();

  let vq2 = supabaseAdmin
    .from("valid_listen_events")
    .select("track_id, user_id")
    .in("track_id", trackIds);

  if (days !== null) {
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromISO = from.toISOString().slice(0, 10);
    vq2 = vq2.gte("created_at", `${fromISO}T00:00:00.000Z`);
  }

  const { data: vRows2, error: vErr2 } = await vq2;
  if (vErr2) throw new Error(vErr2.message);

  ((vRows2 || []) as ValidListenRow[]).forEach((r) => {
    const tid = String(r.track_id);
    const uid = r.user_id ? String(r.user_id) : null;
    if (!uid) return;

    const set = uniqByTrack.get(tid) ?? new Set<string>();
    set.add(uid);
    uniqByTrack.set(tid, set);
  });

  // Hard rule: only tracks with at least 2 listeners in selected range
  const eligibleTrackIds = trackIds.filter(
    (id) => (uniqByTrack.get(String(id))?.size ?? 0) >= 2
  );

  if (eligibleTrackIds.length > 0) {
    // Saves per track (current library state)
    let savesQuery2 = supabaseAdmin
      .from("library_tracks")
      .select("track_id")
      .in("track_id", eligibleTrackIds)
      .neq("user_id", artistId);

    if (days !== null) {
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const fromISO = from.toISOString().slice(0, 10);
      savesQuery2 = savesQuery2.gte("created_at", `${fromISO}T00:00:00.000Z`);
    }

    const { data: saveRows2, error: savesErr2 } = await savesQuery2;

    if (savesErr2) throw new Error(savesErr2.message);

    const savesByTrack = new Map<string, number>();
    ((saveRows2 || []) as { track_id: string | null }[]).forEach((r) => {
      const tid = r.track_id ? String(r.track_id) : null;
      if (!tid) return;
      savesByTrack.set(tid, (savesByTrack.get(tid) ?? 0) + 1);
    });

    // Titles for eligible tracks
    const { data: titleRows2, error: titleErr2 } = await supabase
      .from("tracks")
      .select("id, title")
      .in("id", eligibleTrackIds);

    if (titleErr2) throw new Error(titleErr2.message);

    const titleByEligibleId = new Map<string, string>();
    ((titleRows2 || []) as TrackTitleRow[]).forEach((t) =>
      titleByEligibleId.set(String(t.id), String(t.title ?? "Unknown track"))
    );

    const coverPathByEligibleTrackId = await loadPublishedCoverPathByTrackIds(
      eligibleTrackIds.map((id) => String(id))
    );

    const items = eligibleTrackIds
      .map((id) => {
        const tid = String(id);
        const listeners = uniqByTrack.get(tid)?.size ?? 0;
        const saves = savesByTrack.get(tid) ?? 0;
        const conversion_pct = listeners > 0 ? (saves / listeners) * 100 : 0;

        return {
          track_id: tid,
          title: titleByEligibleId.get(tid) || "Unknown track",
          cover_url: toPublicCoverUrl(coverPathByEligibleTrackId.get(tid) ?? null),
          listeners,
          saves,
          conversion_pct,
        } satisfies TopConvertingTrackRow;
      })
      .sort((a, b) => {
        if (b.conversion_pct !== a.conversion_pct) return b.conversion_pct - a.conversion_pct;
        if (b.listeners !== a.listeners) return b.listeners - a.listeners;
        return b.saves - a.saves;
      })
      .slice(0, 5);

    topConvertingTracks.push(...items);
  }

  return {
    topConvertingTracks,
    savesCount,
    conversionPct,
  };
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Disc3,
  Music2,
  Upload,
  User,
  ExternalLink,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";
import ArtistDashboardHero from "./_components/ArtistDashboardHero";
import { SectionDivider, Stat, MenuTile } from "./_components/DashboardUi";
import { formatNumber, getCoverUrl } from "./_lib/dashboardHelpers";

export default async function ArtistDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: credits, error: creditsError } = await supabase
    .from("artist_credits")
    .select("balance")
    .eq("profile_id", user.id)
    .single();

  if (creditsError && creditsError.code !== "PGRST116") {
    throw creditsError;
  }

  const balance = credits?.balance ?? 0;

  // --- Premium Credits Ledger (read-only) ---
  type PremiumTxRow = {
    id: string;
    delta: number;
    reason: string | null;
    source: string | null;
    created_at: string;
  };

  const { data: premiumTxRaw, error: premiumTxError } = await supabase
    .from("artist_credit_transactions")
    .select("id, delta, reason, source, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (premiumTxError) {
    throw premiumTxError;
  }

  const premiumTx = (premiumTxRaw ?? []) as PremiumTxRow[];

  type AnalyticsTopTrackRow = {
    track_id: string;
    streams: number | null;
    ratings_count: number | null;
    rating_avg: number | null;
  };

  type ResolvedTrackRow = {
    track_id: string;
    track_title: string | null;
    cover_path: string | null;
  };

  type ArtistMembershipRow = {
    track_id: string;
  };

  type TrackStatRow = {
    id: string;
    rating_avg: number | null;
    rating_count: number | null;
  };

  type TrackLifetimeRow = {
    track_id: string;
    streams_lifetime: number | null;
  };

  type TrackReleaseRow = {
    track_id: string;
    release_id: string | null;
  };

  const { data: topRatedRaw, error: topRatedError } = await supabase
    .from("analytics_artist_top_tracks_30d")
    .select(
      `
      track_id,
      streams:streams_30d,
      ratings_count:ratings_count_30d,
      rating_avg:rating_avg_30d
    `
    )
    .eq("artist_id", user.id)
    .gt("ratings_count_30d", 0)
    .order("rating_avg_30d", { ascending: false, nullsFirst: false })
    .order("ratings_count_30d", { ascending: false, nullsFirst: false })
    .limit(3);

  const { data: topStreamsRaw, error: topStreamsError } = await supabase
    .from("analytics_artist_top_tracks_30d")
    .select(
      `
      track_id,
      streams:streams_30d,
      ratings_count:ratings_count_30d,
      rating_avg:rating_avg_30d
    `
    )
    .eq("artist_id", user.id)
    .order("streams_30d", { ascending: false, nullsFirst: false })
    .limit(3);

  const { data: artistMembershipsRaw, error: artistMembershipsError } = await supabase
    .from("analytics_artist_track_memberships")
    .select("track_id")
    .eq("artist_id", user.id);

  const perfError = topRatedError ?? topStreamsError ?? artistMembershipsError;

  if (perfError) {
    throw perfError;
  }

  const topRatedRows = (topRatedRaw ?? []) as AnalyticsTopTrackRow[];
  const topStreamsRows = (topStreamsRaw ?? []) as AnalyticsTopTrackRow[];

  const analyticsTrackIds = Array.from(
    new Set(
      [...topRatedRows, ...topStreamsRows]
        .map((row) => String(row.track_id ?? ""))
        .filter(Boolean)
    )
  );

  const { data: topTrackDetailsRaw, error: topTrackDetailsError } =
    analyticsTrackIds.length > 0
      ? await supabase
          .from("artist_top_tracks_resolved")
          .select("track_id, track_title, cover_path")
          .in("track_id", analyticsTrackIds)
      : { data: [], error: null };

  if (topTrackDetailsError) {
    throw topTrackDetailsError;
  }

  const detailsByTrackId = new Map(
    ((topTrackDetailsRaw ?? []) as ResolvedTrackRow[]).map((row) => [
      row.track_id,
      row,
    ])
  );

  const artistMemberships = (artistMembershipsRaw ?? []) as ArtistMembershipRow[];

  const quickStatsTrackIds = Array.from(
    new Set(
      artistMemberships
        .map((row) => String(row.track_id ?? ""))
        .filter(Boolean)
    )
  );

  const [
    { data: quickStatsTracksRaw, error: quickStatsTracksError },
    { data: quickStatsLifetimeRaw, error: quickStatsLifetimeError },
    { data: quickStatsReleaseRaw, error: quickStatsReleaseError },
  ] = quickStatsTrackIds.length > 0
    ? await Promise.all([
        supabase
          .from("tracks")
          .select("id, rating_avg, rating_count")
          .in("id", quickStatsTrackIds),
        supabase
          .from("analytics_track_lifetime")
          .select("track_id, streams_lifetime")
          .in("track_id", quickStatsTrackIds),
        supabase
          .from("artist_top_tracks_resolved")
          .select("track_id, release_id")
          .in("track_id", quickStatsTrackIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  const quickStatsError =
    quickStatsTracksError ?? quickStatsLifetimeError ?? quickStatsReleaseError;

  if (quickStatsError) {
    throw quickStatsError;
  }

  const quickStatsTracks = (quickStatsTracksRaw ?? []) as TrackStatRow[];
  const quickStatsLifetime = (quickStatsLifetimeRaw ?? []) as TrackLifetimeRow[];
  const quickStatsReleases = (quickStatsReleaseRaw ?? []) as TrackReleaseRow[];

  const totalStreams = quickStatsLifetime.reduce(
    (sum, row) =>
      sum + (typeof row.streams_lifetime === "number" ? row.streams_lifetime : 0),
    0
  );

  const totalTracks = quickStatsTrackIds.length;

  const totalReleases = Array.from(
    new Set(
      quickStatsReleases
        .map((row) => String(row.release_id ?? ""))
        .filter(Boolean)
    )
  ).length;

  const { weightedRatingSum, ratingCountSum } = quickStatsTracks.reduce(
    (acc, row) => {
      const count = typeof row.rating_count === "number" ? row.rating_count : 0;
      const avg = typeof row.rating_avg === "number" ? row.rating_avg : null;

      if (count > 0 && avg !== null) {
        acc.weightedRatingSum += avg * count;
        acc.ratingCountSum += count;
      }

      return acc;
    },
    { weightedRatingSum: 0, ratingCountSum: 0 }
  );

  const avgRating = ratingCountSum > 0 ? weightedRatingSum / ratingCountSum : 0;

  const performanceTracks = topStreamsRows.flatMap((row, index) => {
    const details = detailsByTrackId.get(row.track_id);
    if (!details) return [];

    return [
      {
        key: `p-${row.track_id}-${index}`,
        title: details.track_title ?? "Untitled Track",
        streams: row.streams ?? 0,
        coverUrl: getCoverUrl(supabase, details.cover_path),
      },
    ];
  });

  const qualityTracks = topRatedRows.flatMap((row, index) => {
    const details = detailsByTrackId.get(row.track_id);
    if (!details || typeof row.rating_avg !== "number") return [];

    return [
      {
        key: `q-${row.track_id}-${index}`,
        title: details.track_title ?? "Untitled Track",
        rating: row.rating_avg,
        ratingCount: row.ratings_count ?? 0,
        coverUrl: getCoverUrl(supabase, details.cover_path),
      },
    ];
  });

  const lastUpdatedLabel = new Date().toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-8">
      <ArtistDashboardHero />

      <div className="space-y-3">
        <section className="mt-16 mb-10">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-white">
              Quick <span className="text-[#00FFC6]">Stats</span>
            </h2>
            <p className="mt-1 text-xs text-[#B3B3B3]">
              Last updated: {lastUpdatedLabel}
            </p>
          </div>
          <div className="mt-8 mb-16">
            <div className="grid grid-cols-2 gap-y-8 gap-x-8 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex justify-center text-center">
                <Stat
                  label="Total Streams"
                  value={formatNumber(totalStreams)}
                  valueClassName="text-4xl md:text-5xl font-semibold text-white"
                />
              </div>

              <div className="flex justify-center text-center">
                <Stat
                  label="Releases"
                  value={formatNumber(totalReleases)}
                  valueClassName="text-4xl md:text-5xl font-semibold text-white"
                />
              </div>

              <div className="flex justify-center text-center">
                <Stat
                  label="Tracks"
                  value={formatNumber(totalTracks)}
                  valueClassName="text-4xl md:text-5xl font-semibold text-white"
                />
              </div>

              <div className="flex justify-center text-center">
                <Stat
                  label="Ø Rating"
                  value={avgRating.toFixed(2).replace(".", ",")}
                  valueClassName="text-4xl md:text-5xl font-semibold text-white"
                />
              </div>

              <div className="flex justify-center text-center">
                <Tooltip label="Premium Credits are system energy. Boost can use them to increase visibility in Performance Discovery.">
                  <div>
                    <Stat
                      label="Premium Credits"
                      value={formatNumber(balance)}
                      valueClassName="text-4xl md:text-5xl font-semibold text-[#00FFC6]"
                    />
                  </div>
                </Tooltip>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-2">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Quality */}
            <div>
              <div className="flex items-end justify-between">
                <h3 className="text-xl md:text-2xl font-semibold text-white mt-1">
                  Top <span className="text-[#00FFC6]">rated</span>
                </h3>
              </div>

              <div className="mt-4 space-y-3">
                {qualityTracks.length > 0 ? (
                  qualityTracks.map((t) => (
                    <div
                      key={t.key}
                      className="flex items-center gap-5 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 transition hover:bg-white/[0.05] hover:border-white/10"
                    >
                      {t.coverUrl ? (
                        <img
                          src={t.coverUrl}
                          alt=""
                          className="h-14 w-14 rounded-lg object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-white/5 border border-white/10" />
                      )}

                  <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-white">
                          {t.title}
                        </p>
                      </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[17px] font-medium text-white/85 whitespace-nowrap">
                      {t.rating.toFixed(2).replace(".", ",")} rating · {t.ratingCount} votes
                    </p>
                  </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#B3B3B3]">
                    No rated tracks yet.
                  </p>
                )}
              </div>
            </div>

            {/* Performance */}
            <div>
              <div className="flex items-end justify-between">
                <h3 className="text-xl md:text-2xl font-semibold text-white mt-1">
                  Top <span className="text-[#00FFC6]">streams</span>
                </h3>
              </div>

              <div className="mt-4 space-y-3">
                {performanceTracks.length > 0 ? (
                  performanceTracks.map((t) => (
                    <div
                      key={t.key}
                      className="flex items-center gap-5 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 transition hover:bg-white/[0.05] hover:border-white/10"
                    >
                      {t.coverUrl ? (
                        <img
                          src={t.coverUrl}
                          alt=""
                          className="h-14 w-14 rounded-lg object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-white/5 border border-white/10" />
                      )}

                  <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-white">
                          {t.title}
                        </p>
                      </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[17px] font-medium text-white/85 whitespace-nowrap">
                      {t.streams.toLocaleString("de-DE")} streams
                    </p>
                  </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#B3B3B3]">
                    No tracks found yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <SectionDivider />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl md:text-2xl font-semibold text-white">
            Artist <span className="text-[#00FFC6]">Menu</span>
          </h2>
          <p className="text-sm text-[#B3B3B3]">Jump to the tools you need.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-stretch">
          {/* Row 1 – Primary */}
          <MenuTile
            href="/artist/upload"
            title="Upload"
            description="Upload new tracks and prepare releases."
            icon={<Upload className="h-6 w-6" />}
          />

          <MenuTile
            href="/artist/my-tracks"
            title="My Tracks"
            description="Edit tracks, metadata and status."
            icon={<Music2 className="h-6 w-6" />}
          />

          <MenuTile
            href="/artist/releases"
            title="Releases"
            description="Manage your releases and publish updates."
            icon={<Disc3 className="h-6 w-6" />}
          />

          {/* Row 2 – Secondary */}
          <MenuTile
            href="/artist/analytics"
            title="Analytics"
            description="Streams, ratings and audience insights."
            icon={<BarChart3 className="h-6 w-6" />}
          />

          <MenuTile
            href="/artist/profile"
            title="Profile"
            description="Update your banner, name and settings."
            icon={<User className="h-6 w-6" />}
          />

          <MenuTile
            href={`/dashboard/artist/${user.id}`}
            title="Public Page"
            description="View your public artist profile as listeners see it."
            icon={<ExternalLink className="h-6 w-6" />}
          />
        </div>
      </section>

      <section className="pt-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Premium */}
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-white">
                  Premium <span className="text-[#00FFC6]">Credits</span> History
                </h2>
                <p className="mt-1 text-xs text-[#B3B3B3]">
                  Last 20 transactions (read-only)
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-white/35">
                  {premiumTx[0]
                    ? `Last: ${premiumTx[0].delta >= 0 ? "+" : ""}${formatNumber(
                        premiumTx[0].delta
                      )} · ${new Date(premiumTx[0].created_at).toLocaleString("de-DE")}`
                    : "No history yet"}
                </p>
              </div>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer select-none text-sm text-[#B3B3B3] hover:text-white transition list-none">
                ▶ Show history
              </summary>

              <div className="mt-4 rounded-xl bg-[#121216] border border-white/5 overflow-hidden">
                {premiumTx.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {premiumTx.map((tx) => (
                      <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {tx.reason ?? "Premium Credits"}
                          </p>
                          <p className="mt-0.5 text-xs text-[#B3B3B3]">
                            {new Date(tx.created_at).toLocaleString("de-DE")}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-white">
                            {tx.delta >= 0 ? "+" : ""}
                            {formatNumber(tx.delta)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/35">
                            {tx.source ?? "system"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4">
                    <p className="text-sm text-[#B3B3B3]">No transactions yet.</p>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}

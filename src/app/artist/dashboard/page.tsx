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

  const publicArtistHref = `/dashboard/artist/${user.id}`;

  type PerfRow = {
    release_id: string;
    track_title: string;
    stream_count: number | null;
    rating_avg: number | null;
    rating_count: number | null;
    cover_path: string | null;
  };

  const { data: topRatedRaw, error: topRatedError } = await supabase
    .from("artist_dashboard_release_tracks")
    .select("release_id, track_title, stream_count, rating_avg, rating_count, cover_path")
    .eq("artist_id", user.id)
    .order("rating_avg", { ascending: false, nullsFirst: false })
    .order("rating_count", { ascending: false, nullsFirst: false })
    .limit(50);

  const { data: topStreamsRaw, error: topStreamsError } = await supabase
    .from("artist_dashboard_release_tracks")
    .select("release_id, track_title, stream_count, rating_avg, rating_count, cover_path")
    .eq("artist_id", user.id)
    .order("stream_count", { ascending: false, nullsFirst: false })
    .limit(50);

  const perfError = topRatedError ?? topStreamsError;

  if (perfError) {
    throw perfError;
  }

  const topRatedRows = (topRatedRaw ?? []) as PerfRow[];
  const topStreamsRows = (topStreamsRaw ?? []) as PerfRow[];

  const totalStreams = topStreamsRows.reduce(
    (sum, row) => sum + (typeof row.stream_count === "number" ? row.stream_count : 0),
    0
  );

  const totalTracks = topStreamsRows.length;
  const totalReleases = Array.from(
    new Set(topStreamsRows.map((row) => row.release_id).filter(Boolean))
  ).length;

  const avgStreamsPerTrack = totalTracks > 0 ? totalStreams / totalTracks : 0;

  const { weightedRatingSum, ratingCountSum } = topRatedRows.reduce(
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

  const totalRatingsCount = topRatedRows.reduce(
    (sum, row) => sum + (typeof row.rating_count === "number" ? row.rating_count : 0),
    0
  );

  const avgRating =
    ratingCountSum > 0 ? weightedRatingSum / ratingCountSum : 0;

  const getReleaseCoverPath = (row: PerfRow) => {
    return row.cover_path ?? null;
  };


  const performanceTracks = topStreamsRows
    .slice(0, 3)
    .map((row) => ({
      title: row.track_title ?? "Untitled Track",
      streams: row.stream_count ?? 0,
      coverUrl: getCoverUrl(supabase, getReleaseCoverPath(row)),
    }));

  const qualityTracks = topRatedRows
    .filter((row) => (row.rating_count ?? 0) > 0 && typeof row.rating_avg === "number")
    .slice(0, 3)
    .map((row) => ({
      title: row.track_title ?? "Untitled Track",
      rating: row.rating_avg ?? 0,
      ratingCount: row.rating_count ?? 0,
      coverUrl: getCoverUrl(supabase, getReleaseCoverPath(row)),
    }));

  const lastUpdatedLabel = new Date().toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-8">
      <ArtistDashboardHero publicArtistHref={publicArtistHref} />

      <div className="space-y-3">
        <section className="mt-16 mb-10">
          <div>
            <h2 className="text-lg font-semibold text-white">Quick Stats</h2>
            <p className="mt-1 text-xs text-[#B3B3B3]">
              Last updated: {lastUpdatedLabel}
            </p>
          </div>
          <div className="mt-8 mb-28 space-y-10">
          {/* Row 1 – Performance + Credits */}
          <div className="px-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-y-8 gap-x-10">
            {/* Featured via typography */}
            <Stat
              label="Total Streams"
              value={formatNumber(totalStreams)}
              valueClassName="text-3xl md:text-4xl font-semibold text-white"
            />

            <Stat
              label="Ø Streams / Track"
              value={formatNumber(Math.round(avgStreamsPerTrack))}
            />

            <Stat
              label="Releases"
              value={formatNumber(totalReleases)}
            />

            <Stat
              label="Tracks"
              value={formatNumber(totalTracks)}
            />

            <Stat
              label="Ø Rating"
              value={avgRating.toFixed(2).replace(".", ",")}
            />

            <Stat
              label="Ratings (Count)"
              value={formatNumber(totalRatingsCount)}
            />

            <Tooltip label="Premium Credits are system energy. Boost can use them to increase visibility in Performance Discovery.">
              <div>
                <Stat
                  label="Premium Credits"
                  value={formatNumber(balance)}
                  valueClassName="text-3xl md:text-4xl font-semibold text-[#00FFC6]"
                />
              </div>
            </Tooltip>
          </div>
          </div>
        </section>

        <section className="pt-2">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Quality */}
            <div>
              <div className="flex items-end justify-between">
                <h3 className="text-base font-semibold text-white">Top rated</h3>
              </div>

              <div className="mt-4 space-y-3">
                {qualityTracks.length > 0 ? (
                  qualityTracks.map((t) => (
                    <div
                      key={`q-${t.title}`}
                      className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.04]"
                    >
                      {t.coverUrl ? (
                        <img
                          src={t.coverUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-white/5 border border-white/10" />
                      )}

                  <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {t.title}
                        </p>
                      </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-white">
                      {t.rating.toFixed(2).replace(".", ",")}
                    </p>
                    <p className="text-xs text-[#B3B3B3]">
                      Rating · {t.ratingCount} votes
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
                <h3 className="text-base font-semibold text-white">Top streams</h3>
              </div>

              <div className="mt-4 space-y-3">
                {performanceTracks.length > 0 ? (
                  performanceTracks.map((t) => (
                    <div
                      key={`p-${t.title}`}
                      className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.04]"
                    >
                      {t.coverUrl ? (
                        <img
                          src={t.coverUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-white/5 border border-white/10" />
                      )}

                  <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {t.title}
                        </p>
                      </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-white">
                      {t.streams.toLocaleString("de-DE")}
                    </p>
                    <p className="text-xs text-[#B3B3B3]">
                      Streams
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
          <h2 className="text-lg font-semibold text-white">Artist Menu</h2>
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
            href="/artist/releases"
            title="Releases"
            description="Manage your releases and publish updates."
            icon={<Disc3 className="h-6 w-6" />}
          />

          <MenuTile
            href="/artist/my-tracks"
            title="My Tracks"
            description="Edit tracks, metadata and status."
            icon={<Music2 className="h-6 w-6" />}
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
            href={publicArtistHref}
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
                <h2 className="text-lg font-semibold text-white">Premium Credits History</h2>
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


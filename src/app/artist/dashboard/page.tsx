import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  Disc3,
  Music2,
  Upload,
  User,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";

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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, banner_url")
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    throw profileError;
  }

  const artistName = profile?.display_name ?? "Artist";
  const bannerUrl = profile?.banner_url ?? null;

  const publicArtistHref = `/dashboard/artist/${user.id}`;
  const isProfileIncomplete = !bannerUrl || artistName === "Artist";

  type PerfRow = {
    release_id: string;
    track_title: string | null;
    stream_count: number | null;
    rating_avg: number | null;
    rating_count: number | null;
    releases:
      | { artist_id: string; cover_path: string | null }
      | { artist_id: string; cover_path: string | null }[]
      | null;
  };

  const { data: perfRowsRaw, error: perfError } = await supabase
    .from("release_tracks")
    .select(
      "release_id, track_title, stream_count, rating_avg, rating_count, releases!inner(artist_id, cover_path)"
    )
    .eq("releases.artist_id", user.id);

  if (perfError) {
    throw perfError;
  }

  const perfRows = (perfRowsRaw ?? []) as PerfRow[];

  const totalStreams = perfRows.reduce(
    (sum, row) => sum + (typeof row.stream_count === "number" ? row.stream_count : 0),
    0
  );

  const totalTracks = perfRows.length;
  const totalReleases = Array.from(
    new Set(perfRows.map((row) => row.release_id).filter(Boolean))
  ).length;

  const avgStreamsPerTrack = totalTracks > 0 ? totalStreams / totalTracks : 0;

  const { weightedRatingSum, ratingCountSum } = perfRows.reduce(
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

  const totalRatingsCount = perfRows.reduce(
    (sum, row) => sum + (typeof row.rating_count === "number" ? row.rating_count : 0),
    0
  );

  const avgRating =
    ratingCountSum > 0 ? weightedRatingSum / ratingCountSum : 0;

  const getReleaseCoverPath = (row: PerfRow) => {
    const rel = row.releases
      ? Array.isArray(row.releases)
        ? row.releases[0]
        : row.releases
      : null;

    return rel?.cover_path ?? null;
  };

  const getCoverUrl = (coverPath: string | null) => {
    if (!coverPath) return null;
    return supabase.storage.from("release_covers").getPublicUrl(coverPath).data.publicUrl;
  };

  const performanceTracks = [...perfRows]
    .sort((a, b) => (b.stream_count ?? 0) - (a.stream_count ?? 0))
    .slice(0, 3)
    .map((row) => ({
      title: row.track_title ?? "Untitled Track",
      streams: row.stream_count ?? 0,
      coverUrl: getCoverUrl(getReleaseCoverPath(row)),
    }));

  const qualityTracks = [...perfRows]
    .filter((row) => (row.rating_count ?? 0) > 0 && typeof row.rating_avg === "number")
    .sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0))
    .slice(0, 3)
    .map((row) => ({
      title: row.track_title ?? "Untitled Track",
      rating: row.rating_avg ?? 0,
      ratingCount: row.rating_count ?? 0,
      coverUrl: getCoverUrl(getReleaseCoverPath(row)),
    }));

  const lastUpdatedLabel = new Date().toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatNumber = (value: number) => value.toLocaleString("de-DE");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">
        Welcome {artistName} to ImMusic
      </h1>
      <p className="text-sm text-[#B3B3B3]">
        Your hub for releases, uploads and analytics.
      </p>

      <div className="rounded-xl bg-[#121216] border border-white/5 overflow-hidden">
        <div className="relative h-48 md:h-64">
          {bannerUrl ? (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${bannerUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#00FFC6]/15 via-white/5 to-[#00FFC6]/10" />
          )}

          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/35" />
          {/* Bottom gradient for text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

          {/* Text on banner */}
          <div className="absolute left-0 right-0 top-28 md:top-36 px-8 md:px-10">
            {!bannerUrl && (
              <p className="text-xs text-white/60 mb-2">Banner not set yet</p>
            )}

            <p className="text-4xl md:text-6xl xl:text-7xl font-semibold text-white leading-tight tracking-tight">
              {artistName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mt-10">
        <p className="text-sm text-white/80">
          Your public artist page is live.
          <Link
            href={publicArtistHref}
            className="ml-2 text-[#00FFC6] hover:text-[#00E0B0] transition-colors"
          >
            View page →
          </Link>
        </p>

        {isProfileIncomplete ? (
          <p className="text-sm text-[#B3B3B3]">
            Tip: Complete your artist profile for a better public page.
            <Link
              href="/artist/profile"
              className="ml-2 text-[#00FFC6] hover:text-[#00E0B0] transition-colors"
            >
              Go to Profile →
            </Link>
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <section className="mt-16 mb-10">
          <div>
            <h2 className="text-lg font-semibold text-white">Quick Stats</h2>
            <p className="mt-1 text-xs text-[#B3B3B3]">
              Last updated: {lastUpdatedLabel}
            </p>
          </div>
          <div className="mt-8 mb-28 space-y-10">

  {/* Row 1 – Performance */}
  <div className="px-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-8 gap-x-10">
    <Stat label="Total Streams" value={formatNumber(totalStreams)} />
    <Stat label="Ø Streams / Track" value={formatNumber(Math.round(avgStreamsPerTrack))} />
    <Stat label="Releases" value={formatNumber(totalReleases)} />
    <Stat label="Tracks" value={formatNumber(totalTracks)} />
    <Stat label="Ø Rating" value={avgRating.toFixed(2).replace(".", ",")} />
    <Stat label="Ratings (Count)" value={formatNumber(totalRatingsCount)} />
  </div>

  {/* Row 2 – Credits & Development */}
  <div className='px-2 pt-10 border-t border-white/5 grid grid-cols-6 gap-x-12 gap-y-8 text-center'>

    <div className="lg:col-start-1">
      <Tooltip label="Premium Credits are system energy. Boost can use them to increase visibility in Performance Discovery.">
        <div className="inline-block">
          <Stat label="Premium Credits" value={formatNumber(balance)} />
          <p className="mt-2 text-[11px] text-white/35 text-center">
            Buy credits — coming soon
          </p>
        </div>
      </Tooltip>
    </div>

    <div className="lg:col-start-2">
      <Stat label="Status" value="Active" />
    </div>
  </div>

</div>
        </section>

      <section className="mt-16">
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

            <details className="mt-4 rounded-xl bg-[#121216] border border-white/5 overflow-hidden">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm text-[#B3B3B3] hover:text-white transition">
                Show history
              </summary>

              <div className="border-t border-white/5">
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

        <section className="mt-16">
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
                      className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
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
                      className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
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

      <section className="space-y-4 mt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Artist Menu</h2>
          <p className="text-sm text-[#B3B3B3]">Jump to the tools you need.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-stretch">
          <MenuTile
            href="/artist/releases"
            title="Releases"
            description="Manage your releases and publish updates."
            icon={<Disc3 className="h-6 w-6" />}
          />
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
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-[#121216] border border-white/5 p-5">
      <p className="text-xs text-[#B3B3B3]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#B3B3B3]">{hint}</p> : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="relative group text-center">
      <p className="text-3xl font-semibold text-white leading-none transition group-hover:text-[#00FFC6]">
        {value}
      </p>

      <p className="mt-2 text-xs uppercase tracking-wide text-white/40">
        {label}
      </p>
    </div>
  );
}

function MenuTile(props: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={props.href}
      className="
        group relative overflow-hidden rounded-2xl
        bg-[#121216] border border-white/5
        p-6 transition
        hover:-translate-y-0.5
        hover:border-[#00FFC6]/35 hover:bg-[#14141a]
        focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/40
        h-full
      "
    >
      <div className="absolute right-4 top-4 text-white/30 group-hover:text-[#00FFC6]/80 transition">
        <ChevronRight className="h-5 w-5" />
      </div>

      <div className="flex h-full flex-col">
        <div className="flex items-start gap-4">
          <div
            className="
              mt-0.5 shrink-0 rounded-xl
              bg-white/5 border border-white/10
              p-3 text-white/90
              transition
              group-hover:text-[#00FFC6]
              group-hover:border-[#00FFC6]/35
              group-hover:bg-[#00FFC6]/[0.08]
            "
          >
            {props.icon}
          </div>

          <div className="min-w-0">
            <p className="text-lg font-semibold text-white">{props.title}</p>
            <p className="mt-1 text-sm text-[#B3B3B3]">{props.description}</p>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <p className="text-xs text-white/35 group-hover:text-[#00FFC6]/70 transition">
            Open →
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#00FFC6]/10 blur-2xl" />
      </div>
    </Link>
  );
}

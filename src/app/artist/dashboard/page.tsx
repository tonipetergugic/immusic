import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BarChart3, Disc3, LayoutDashboard, Music2, Upload } from "lucide-react";

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

  type PerfRow = {
    release_id: string;
    stream_count: number | null;
    rating_avg: number | null;
    rating_count: number | null;
    releases: { artist_id: string } | { artist_id: string }[] | null;
  };

  const { data: perfRowsRaw, error: perfError } = await supabase
    .from("release_tracks")
    .select(
      "release_id, stream_count, rating_avg, rating_count, releases!inner(artist_id)"
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

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Quick Stats</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Total Streams" value={formatNumber(totalStreams)} />
          <KpiCard
            label="Ø Streams / Track"
            value={formatNumber(Math.round(avgStreamsPerTrack))}
          />
          <KpiCard label="Releases" value={formatNumber(totalReleases)} />
          <KpiCard label="Tracks" value={formatNumber(totalTracks)} />
          <KpiCard label="Ø Rating" value={avgRating.toFixed(2).replace(".", ",")} />
          <KpiCard
            label="Ratings (Count)"
            value={formatNumber(totalRatingsCount)}
          />
          <KpiCard label="Credit Balance" value={formatNumber(balance)} />
          <KpiCard label="Status" value="UI Ready" hint="Phase 1" />
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Artist Menu</h2>
          <p className="text-sm text-[#B3B3B3]">Jump to the tools you need.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MenuTile
            href="/artist/dashboard"
            title="Dashboard"
            description="Your start screen with quick stats and shortcuts."
            icon={<LayoutDashboard className="h-6 w-6" />}
          />
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
            description="Deep insights into performance, quality and credits."
            icon={<BarChart3 className="h-6 w-6" />}
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

function MenuTile(props: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={props.href}
      className="group rounded-2xl bg-[#121216] border border-white/5 p-6 transition hover:border-white/10 hover:bg-[#14141a] hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5 shrink-0 rounded-xl bg-white/5 border border-white/10 p-3 text-white/90 group-hover:text-[#00FFC6] transition">
          {props.icon}
        </div>

        <div className="min-w-0">
          <p className="text-lg font-semibold text-white">{props.title}</p>
          <p className="mt-1 text-sm text-[#B3B3B3]">{props.description}</p>
        </div>
      </div>
    </Link>
  );
}

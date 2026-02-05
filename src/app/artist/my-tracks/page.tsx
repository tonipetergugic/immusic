import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FileMusic } from "lucide-react";
import TrackListClient from "./TrackListClient";

export default async function MyTracksPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  // 0) Determine locked tracks (tracks that belong to a published release)
  const { data: publishedReleases, error: publishedErr } = await supabase
    .from("releases")
    .select("id")
    .eq("artist_id", user.id)
    .eq("status", "published");

  if (publishedErr) {
    throw new Error("Failed to load published releases.");
  }

  const publishedReleaseIds = (publishedReleases ?? []).map((r) => r.id);

  let lockedTrackIdSet = new Set<string>();
  if (publishedReleaseIds.length > 0) {
    const { data: lockedRows, error: lockedErr } = await supabase
      .from("release_tracks")
      .select("track_id")
      .in("release_id", publishedReleaseIds);

    if (lockedErr) {
      throw new Error("Failed to load locked tracks.");
    }

    lockedTrackIdSet = new Set((lockedRows ?? []).map((r) => r.track_id));
  }

  // 1) Load tracks for My Tracks list
  const { data, error } = await supabase
    .from("tracks")
    .select("id,title,artist_id,version,audio_path,bpm,key,genre,has_lyrics,is_explicit,status")
    .eq("artist_id", user.id)
    .in("status", ["approved", "development", "performance"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load tracks.");
  }

  const tracks = (data ?? []).map((t) => {
    const isLocked = lockedTrackIdSet.has(t.id);
    return { ...t, isLocked };
  });

  return (
    <div className="w-full text-white">
      <div className="w-full max-w-[900px] mx-auto">
        {/* Header */}
        <div className="mt-2">
          <h1 className="flex items-center gap-3 text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            <FileMusic className="h-6 w-6 sm:h-7 sm:w-7 text-[#00FFC6]" />
            My Tracks
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Approved tracks ready to be added to releases.
          </p>

          {/* Info-Box */}
          <div className="mt-6 w-full rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-5 py-4 shadow-[0_0_0_1px_rgba(0,255,198,0.05)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white/90">
                  Next step: create a release
                </div>
                <p className="mt-1 text-sm text-white/60">
                  Before creating a release, make sure all track details (title, BPM, key, genre) are complete and correct.
                </p>
              </div>

              <Link
                href="/artist/releases"
                className="shrink-0 inline-flex items-center justify-center rounded-xl border border-emerald-500/25 bg-transparent px-5 py-2 text-sm font-semibold text-emerald-300 hover:border-emerald-500/40 hover:text-emerald-200 hover:bg-emerald-500/5 active:scale-[0.98] transition"
              >
                Go to Releases
              </Link>
            </div>
          </div>
        </div>

        {/* Count */}
        <div className="mt-10">
          <div className="mb-6">
            <div className="flex items-baseline gap-4">
              <div className="text-2xl font-semibold tracking-tight text-white">
                {tracks.length} {tracks.length === 1 ? "Track" : "Tracks"}
              </div>
            </div>
          </div>

          <TrackListClient tracks={tracks} />
        </div>
      </div>
    </div>
  );
}


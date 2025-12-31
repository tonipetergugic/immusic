import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import TrackListClient from "./TrackListClient";

export default async function MyTracksPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data, error } = await supabase
    .from("tracks")
    .select("id,title,audio_path,bpm,key,genre,has_lyrics,is_explicit")
    .eq("artist_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load tracks.");
  }

  const tracks = data ?? [];

  return (
    <div className="w-full max-w-[1600px] mx-auto text-white px-6 py-6 lg:px-10 lg:py-8 pb-40 lg:pb-48">
      <div className="mt-2">
        <h1 className="text-4xl font-semibold tracking-tight">My Tracks</h1>
        <p className="mt-3 text-sm text-white/60">
          Approved tracks ready to be added to releases.
        </p>

        <div className="mt-6 max-w-[900px] mx-auto rounded-2xl border border-[#00FFC6]/25 bg-[#00FFC6]/[0.04] p-5 sm:p-6 ring-1 ring-[#00FFC6]/15">
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
              className="shrink-0 inline-flex items-center justify-center rounded-xl border border-[#00FFC6]/30 bg-[#00FFC6]/10 px-5 py-2.5 text-sm font-semibold text-[#00FFC6] transition hover:bg-[#00FFC6]/15 hover:border-[#00FFC6]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
            >
              Go to Releases
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-6 max-w-[900px] mx-auto">
          <div className="flex items-baseline gap-4">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Tracks
            </div>
            <div className="text-base font-medium text-[#00FFC6]">
              {tracks.length} approved
            </div>
          </div>
        </div>

        <TrackListClient tracks={tracks} />
      </div>
    </div>
  );
}


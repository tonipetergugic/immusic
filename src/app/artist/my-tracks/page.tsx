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
    .select("id,title,audio_path,bpm,key,genre")
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


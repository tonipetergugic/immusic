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
    .select("id,title,audio_path")
    .eq("artist_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load tracks.");
  }

  const tracks = data ?? [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-white text-2xl font-semibold">My Tracks</h1>
      <TrackListClient tracks={tracks} />
    </div>
  );
}


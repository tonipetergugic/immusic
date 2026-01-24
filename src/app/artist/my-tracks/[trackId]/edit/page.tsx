import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EditTrackClient from "./EditTrackClient";

export default async function EditTrackPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: track, error } = await supabase
    .from("tracks")
    .select("id,title,version,bpm,key,genre,has_lyrics,is_explicit,artist_id")
    .eq("id", trackId)
    .eq("artist_id", user.id)
    .single();

  if (error || !track) {
    notFound();
  }

  return (
    <div className="relative min-h-screen overflow-hidden -mt-16 pt-16">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-[#00FFC6]/12 blur-[160px]" />
        <div className="absolute top-[20%] right-[5%] h-[420px] w-[420px] rounded-full bg-white/6 blur-[140px]" />
      </div>

      <div className="relative z-10">
        <EditTrackClient
          track={{
            id: track.id,
            title: track.title,
            version: track.version ?? "None",
            bpm: track.bpm,
            key: track.key,
            genre: track.genre,
            has_lyrics: Boolean(track.has_lyrics),
            is_explicit: Boolean(track.is_explicit),
            artist_id: track.artist_id,
          }}
        />
      </div>
    </div>
  );
}

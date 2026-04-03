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
    .select(
      "id,title,version,bpm,key,genre,lyrics,has_lyrics,is_explicit,artist_id,audio_path,source_queue_id",
    )
    .eq("id", trackId)
    .eq("artist_id", user.id)
    .single();

  if (error || !track) {
    notFound();
  }

  let queueId: string | null = track.source_queue_id ?? null;

  if (!queueId && track.audio_path) {
    const { data: queueRows } = await supabase
      .from("tracks_ai_queue")
      .select("id")
      .eq("user_id", user.id)
      .eq("audio_path", track.audio_path)
      .order("created_at", { ascending: false })
      .limit(1);

    queueId = queueRows?.[0]?.id ?? null;
  }

  const [{ data: pendingInvites }, { data: acceptedCollabs }] = await Promise.all([
    supabase
      .from("track_collaboration_invites")
      .select("id,role,invitee_display_name,created_at")
      .eq("track_id", track.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("track_collaborators")
      .select("id,role,profiles:profile_id(display_name)")
      .eq("track_id", track.id)
      .in("role", ["CO_OWNER", "FEATURED"]),
  ]);

  return (
    <div className="relative min-h-screen overflow-hidden -mt-16 pt-16">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#00FFC6]/5 blur-[190px]" />
        <div className="absolute top-[18%] right-[6%] h-[360px] w-[360px] rounded-full bg-white/4 blur-[160px]" />
      </div>

      <div className="relative z-10">
        <EditTrackClient
          track={{
            id: track.id,
            title: track.title,
            version: track.version && track.version !== "None" ? track.version : "",
            bpm: track.bpm,
            key: track.key,
            genre: track.genre,
            lyrics: track.lyrics ?? null,
            has_lyrics: Boolean(track.has_lyrics),
            is_explicit: Boolean(track.is_explicit),
            artist_id: track.artist_id,
            audio_path: track.audio_path,
            queue_id: queueId,
          }}
          initialPendingInvites={(pendingInvites ?? []).map((r: any) => ({
            id: r.id,
            role: r.role,
            invitee_display_name: r.invitee_display_name ?? null,
            created_at: r.created_at,
          }))}
          initialAcceptedCollabs={(acceptedCollabs ?? []).map((r: any) => ({
            id: r.id,
            role: r.role,
            display_name: r.profiles?.display_name ?? null,
          }))}
        />
      </div>
    </div>
  );
}

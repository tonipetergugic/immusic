import { notFound } from "next/navigation";
import Image from "next/image";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toPlayerTrack } from "@/lib/playerTrack";
import PlayButton from "./PlayButton";
import LyricsEditor from "./LyricsEditor";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: trackData, error: trackErr } = await supabase
    .from("tracks")
    .select(
      `
        id,
        title,
        lyrics,
        audio_path,
        artist_id,
        releases:releases!tracks_release_id_fkey(
          id,
          title,
          cover_path,
          status,
          release_date
        ),
        artist_profile:profiles!tracks_artist_id_fkey(
          display_name
        )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (trackErr) {
    console.error("TrackPage query error:", trackErr);
    return notFound();
  }

  const trackDataNormalized = trackData
    ? {
        ...trackData,
        releases: Array.isArray(trackData.releases)
          ? trackData.releases[0] ?? null
          : trackData.releases ?? null,
        artist_profile: Array.isArray(trackData.artist_profile)
          ? trackData.artist_profile[0] ?? null
          : trackData.artist_profile ?? null,
      }
    : null;

  if (!trackDataNormalized) return notFound();

  const cover_url =
    trackDataNormalized?.releases?.cover_path
      ? supabase.storage
          .from("release_covers")
          .getPublicUrl(trackDataNormalized.releases.cover_path).data.publicUrl ?? null
      : null;

  const audio_url =
    trackDataNormalized?.audio_path
      ? supabase.storage
          .from("tracks")
          .getPublicUrl(trackDataNormalized.audio_path).data.publicUrl
      : null;

  if (!audio_url) {
    throw new Error(
      `TrackPage: missing audio_url for track ${trackDataNormalized.id}`
    );
  }

  const playerTrack = toPlayerTrack({
    id: trackDataNormalized.id,
    title: trackDataNormalized.title ?? null,
    artist_id: trackDataNormalized.artist_id ?? null,
    audio_url,
    cover_url,
    bpm: (trackDataNormalized as any).bpm ?? null,
    key: (trackDataNormalized as any).key ?? null,
    artist_profile: trackDataNormalized.artist_profile ?? null,
    profiles: (trackDataNormalized as any).profiles ?? null,
    artist: (trackDataNormalized as any).artist ?? null,
  });

  const coverPublicUrl = playerTrack.cover_url ?? null;

  const { data: auth } = await supabase.auth.getUser();
  const viewerId = auth?.user?.id ?? null;

  let viewerRole: string | null = null;
  if (viewerId) {
    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", viewerId)
      .maybeSingle();

    viewerRole = (viewerProfile?.role as string | null) ?? null;
  }

  const canEditLyrics =
    !!viewerId && (viewerId === trackDataNormalized.artist_id || viewerRole === "admin");

  const title = playerTrack.title;
  const artistName = playerTrack.profiles?.display_name ?? "Unknown Artist";
  const releaseTitle = trackDataNormalized.releases?.title ?? null;
  const releaseDateRaw = trackDataNormalized.releases?.release_date ?? null;
  const releaseDate = releaseDateRaw
    ? new Date(releaseDateRaw).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : null;

  return (
    <div className="w-full">
      {/* HERO */}
      <div className="relative rounded-xl overflow-hidden">
        {/* BACKGROUND BLOOM (wie Playlist) */}
        <div
          className="
            absolute inset-0 bg-cover bg-center
            blur-[50px] opacity-80 brightness-125 saturate-125
            pointer-events-none
          "
          style={{
            backgroundImage: coverPublicUrl ? `url('${coverPublicUrl}')` : undefined,
          }}
        />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)] pointer-events-none" />

        {/* SOFT FADE GRADIENT (nach unten auslaufend) */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-b
            from-[rgba(0,0,0,0.00)]
            via-[rgba(0,0,0,0.25)]
            via-[rgba(0,0,0,0.45)]
            to-[rgba(14,14,16,0.95)]
            pointer-events-none
          "
        />

        {/* CONTENT */}
        <div className="relative px-4 md:px-8 pt-10 pb-14">
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            {/* Cover */}
            <div className="shrink-0">
              {playerTrack.cover_url ? (
                <Image
                  src={playerTrack.cover_url}
                  alt={`${title} cover`}
                  width={320}
                  height={320}
                  priority
                  className="rounded-xl shadow-2xl object-cover w-[220px] h-[220px] md:w-[280px] md:h-[280px]"
                />
              ) : (
                <div className="rounded-xl bg-neutral-800 w-[220px] h-[220px] md:w-[280px] md:h-[280px] shadow-2xl" />
              )}
            </div>

            {/* Title / Meta */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/70 font-medium mb-2">Song</div>

              <h1 className="text-5xl md:text-7xl font-black text-white leading-none break-words">
                {title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/75">
                <a
                  href={`/dashboard/artist/${trackDataNormalized.artist_id}`}
                  className="text-white font-semibold text-base md:text-lg hover:text-[#00FFC6] transition-colors"
                >
                  {artistName}
                </a>

                {releaseDate ? (
                  <>
                    <span className="text-white/40">•</span>
                    <span>{releaseDate}</span>
                  </>
                ) : null}
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center gap-4">
                <PlayButton track={playerTrack} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 md:px-8 pb-16">
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-14">
          {/* LEFT: Lyrics */}
          <div className="lg:col-span-2">
            <LyricsEditor
              trackId={playerTrack.id}
              initialLyrics={trackDataNormalized.lyrics ?? null}
              canEdit={canEditLyrics}
              variant="plain"
            />
          </div>

          {/* RIGHT: Details (ohne Box) */}
          <aside className="lg:col-span-1">
            <div className="text-white/90 font-semibold mb-4">Details</div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/40">Artist</span>
                <span className="text-white/80 truncate">{artistName}</span>
              </div>

              {releaseTitle ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/40">Release</span>
                  <span className="text-white/80 truncate">{releaseTitle}</span>
                </div>
              ) : null}

              {releaseDate ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/40">Release date</span>
                  <span className="text-white/80">{releaseDate}</span>
                </div>
              ) : null}

              {playerTrack.bpm ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/40">BPM</span>
                  <span className="text-white/80">{playerTrack.bpm}</span>
                </div>
              ) : null}

              {playerTrack.key ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/40">Key</span>
                  <span className="text-white/80">{playerTrack.key}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4">
                <span className="text-white/40">Track ID</span>
                <span className="text-white/80 font-mono text-xs truncate">
                  {playerTrack.id}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

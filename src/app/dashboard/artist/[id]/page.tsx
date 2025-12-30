import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Instagram, Facebook, Twitter, Music2 } from "lucide-react";
import ClientTrackRows from "./ClientTrackRows";
import ReleasePlayButton from "./ReleasePlayButton";
import SaveArtistButton from "./SaveArtistButton";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) return notFound();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: artist } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", id)
    .maybeSingle();

  const { data: releases } = await supabase
    .from("releases")
    .select("id, title, cover_path, release_type, status")
    .eq("artist_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const { data: releaseTracks } = await supabase
    .from("release_tracks")
    .select(
      `
        id,
        release_id,
        position,
        track_title,
        tracks:tracks!release_tracks_track_id_fkey(
          id,
          title,
          audio_path,
          artist_id
        ),
        releases:releases!release_tracks_release_id_fkey(
          id,
          cover_path,
          title,
          status,
          artist_id
        )
      `
    )
    .eq("releases.artist_id", id)
    .eq("releases.status", "published");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (profileError) {
    throw new Error("Artist profile not found");
  }

  const tracksByRelease: Record<string, any[]> = {};
  (releaseTracks ?? []).forEach((rt) => {
    if (!tracksByRelease[rt.release_id]) tracksByRelease[rt.release_id] = [];
    tracksByRelease[rt.release_id].push(rt);
  });

  if (!artist) return notFound();

  const canSaveArtist = !!user?.id && user.id !== id;

  let initialSaved = false;
  if (canSaveArtist) {
    const { data: savedRow, error } = await supabase
      .from("library_artists")
      .select("artist_id")
      .eq("user_id", user!.id)
      .eq("artist_id", id)
      .maybeSingle();

    if (error) {
      console.error("Failed to read library_artists:", error);
    } else {
      initialSaved = !!savedRow;
    }
  }

  const bannerSrc = profile.banner_url ? `${profile.banner_url}?t=${Date.now()}` : null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full h-64 rounded-lg overflow-hidden">
        {profile.banner_url && (
          <img
            src={`${profile.banner_url}?t=${Date.now()}`}
            alt="Artist Banner"
            className="w-full h-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80"></div>

        <div className="absolute left-12 top-1/2 -translate-y-1/2 flex items-center gap-6">
          <img
            src={`${profile.avatar_url}?t=${Date.now()}`}
            alt={profile.display_name}
            className="w-40 h-40 rounded-full object-cover border-4 border-white/20 shadow-2xl"
          />

          <div className="flex flex-col">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-5xl font-bold text-white drop-shadow-xl">
                {profile.display_name}
              </h1>
            </div>

            {profile.location && (
              <p className="text-lg text-white/80 drop-shadow-md">
                {profile.location}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1200px] mx-auto px-6 mt-4 flex items-center gap-4">
        {canSaveArtist ? (
          <SaveArtistButton artistId={id} initialSaved={initialSaved} />
        ) : null}
      </div>

      <div className="mt-10 max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {profile.location && (
            <p className="text-sm text-[#B3B3B3]">{profile.location}</p>
          )}

          {profile.bio && (
            <p className="text-white whitespace-pre-line">{profile.bio}</p>
          )}

          <div className="flex flex-col space-y-2">
            {profile.instagram && (
              <a
                href={profile.instagram}
                target="_blank"
                className="flex items-center gap-2 text-sm text-[#00FFC6] hover:text-[#00E0B0] transition-colors justify-center"
              >
                <Instagram size={16} />
                Instagram
              </a>
            )}
            {profile.tiktok && (
              <a
                href={profile.tiktok}
                target="_blank"
                className="flex items-center gap-2 text-sm text-[#00FFC6] hover:text-[#00E0B0] transition-colors justify-center"
              >
                <Music2 size={16} />
                TikTok
              </a>
            )}
            {profile.facebook && (
              <a
                href={profile.facebook}
                target="_blank"
                className="flex items-center gap-2 text-sm text-[#00FFC6] hover:text-[#00E0B0] transition-colors justify-center"
              >
                <Facebook size={16} />
                Facebook
              </a>
            )}
            {profile.x && (
              <a
                href={profile.x}
                target="_blank"
                className="flex items-center gap-2 text-sm text-[#00FFC6] hover:text-[#00E0B0] transition-colors justify-center"
              >
                <Twitter size={16} />
                X
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 w-full">
        <h2 className="text-2xl font-semibold mb-6">Releases</h2>

        {releases && releases.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {releases.map((rel) => {
              const coverUrl = rel.cover_path
                ? supabase.storage
                    .from("release_covers")
                    .getPublicUrl(rel.cover_path).data.publicUrl
                : null;

              return (
                <div
                  key={rel.id}
                  className="rounded-2xl bg-white/5 backdrop-blur-sm hover:bg-white/[0.08] transition border border-white/10 p-6 flex flex-col gap-4 shadow-sm"
                >
                  <div className="relative group overflow-hidden rounded-lg">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-neutral-800 rounded-lg" />
                    )}

                    <ReleasePlayButton tracks={tracksByRelease[rel.id] || []} />
                  </div>

                  <h3 className="text-lg font-semibold text-white truncate">
                    {rel.title}
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    {rel.release_type}
                  </p>

                  <hr className="mt-3 border-white/10" />

                  <ClientTrackRows
                    releaseId={rel.id}
                    tracks={tracksByRelease[rel.id] || []}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm">No releases yet.</p>
        )}
      </div>
    </div>
  );
}


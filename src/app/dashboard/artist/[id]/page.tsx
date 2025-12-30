import { notFound } from "next/navigation";
import Link from "next/link";
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

  // Single source of truth: profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (profileError || !profile) return notFound();

  const { data: releases } = await supabase
    .from("releases")
    .select("id, title, cover_path, release_type, status, created_at")
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

  const tracksByRelease: Record<string, any[]> = {};
  (releaseTracks ?? []).forEach((rt) => {
    if (!tracksByRelease[rt.release_id]) tracksByRelease[rt.release_id] = [];
    tracksByRelease[rt.release_id].push(rt);
  });

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

  // NOTE: Do NOT use Date.now() in src (causes constant reloads). Cache-busting belongs in upload flow.
  const bannerUrl = profile.banner_url || null;
  const avatarUrl = profile.avatar_url || null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="w-full max-w-[1200px] mx-auto px-6 pt-6">
        <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Artist Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-white/5 via-white/[0.06] to-white/5" />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />

          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 flex items-center gap-6">
            <div className="shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.display_name}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-white/15 shadow-2xl"
                />
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/10 border-4 border-white/10" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-xl truncate">
                {profile.display_name}
              </h1>

              {profile.location ? (
                <p className="mt-2 text-sm md:text-base text-white/70 drop-shadow-md">
                  {profile.location}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Actions + Social (inline) + Bio */}
      <div className="w-full max-w-[1200px] mx-auto px-6 mt-6">
        <div className="flex flex-wrap items-center gap-5">
          {canSaveArtist ? (
            <SaveArtistButton artistId={id} initialSaved={initialSaved} />
          ) : null}

          <div className="flex items-center gap-4">
            {profile.instagram ? (
              <a
                href={profile.instagram}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Instagram"
                className="flex items-center gap-1 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
              >
                <Instagram size={16} />
                Instagram
              </a>
            ) : null}

            {profile.tiktok ? (
              <a
                href={profile.tiktok}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="TikTok"
                className="flex items-center gap-1 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
              >
                <Music2 size={16} />
                TikTok
              </a>
            ) : null}

            {profile.facebook ? (
              <a
                href={profile.facebook}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Facebook"
                className="flex items-center gap-1 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
              >
                <Facebook size={16} />
                Facebook
              </a>
            ) : null}

            {profile.x ? (
              <a
                href={profile.x}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="X"
                className="flex items-center gap-1 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
              >
                <Twitter size={16} />
                X
              </a>
            ) : null}
          </div>
        </div>

        {profile.bio ? (
          <p className="mt-6 max-w-3xl text-white/90 whitespace-pre-line leading-relaxed">
            {profile.bio}
          </p>
        ) : null}
      </div>

      {/* Releases */}
      <div className="w-full max-w-[1200px] mx-auto px-6 mt-10 pb-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold text-white">Releases</h2>
          <div className="text-sm text-[#B3B3B3]">
            {(releases?.length ?? 0) > 0 ? `${releases!.length} published` : ""}
          </div>
        </div>

        {releases && releases.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {releases.map((rel) => {
              const coverUrl = rel.cover_path
                ? supabase.storage
                    .from("release_covers")
                    .getPublicUrl(rel.cover_path).data.publicUrl
                : null;

              const relTracks = tracksByRelease[rel.id] || [];

              return (
                <div
                  key={rel.id}
                  className="rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] transition-colors border border-white/10 hover:border-white/20 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md"
                >
                  <div className="relative">
                    <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      <Link href={`/dashboard/release/${rel.id}`} className="block">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={rel.title}
                            className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-neutral-800" />
                        )}
                      </Link>

                      {/* Play Overlay – exakt bounded to cover */}
                      <div
                        className="
                          absolute inset-0 flex items-center justify-center
                          opacity-0 group-hover:opacity-100
                          transition-all duration-300
                        "
                      >
                        <ReleasePlayButton tracks={relTracks} />
                      </div>
                    </div>

                    <Link href={`/dashboard/release/${rel.id}`} className="block">
                      <div className="min-w-0 mt-4">
                        <h3 className="text-base font-semibold text-white truncate">
                          {rel.title}
                        </h3>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-white/50">
                          {rel.release_type}
                        </p>
                      </div>
                    </Link>
                  </div>

                  <div className="h-px bg-white/10 my-1" />

                  <ClientTrackRows releaseId={rel.id} tracks={relTracks} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-neutral-400 text-sm">No releases yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { Instagram, Facebook, Twitter, Music2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";

type SpotlightProfile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  x: string | null;
  updated_at: string | null;
};

type SocialLink = {
  label: string;
  href: string;
};

export default function HomeArtistSpotlightCard({
  tracks,
}: {
  tracks: PlayerTrack[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { currentTrack, isPlaying } = usePlayer();

  const [profile, setProfile] = useState<SpotlightProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const spotlightTrack = useMemo(() => {
    if (!tracks.length) return null;

    if (currentTrack && tracks.some((track) => track.id === currentTrack.id)) {
      return tracks.find((track) => track.id === currentTrack.id) ?? tracks[0];
    }

    return tracks[0];
  }, [currentTrack, tracks]);

  const spotlightArtistId =
    spotlightTrack?.artist_id ?? spotlightTrack?.artists?.[0]?.id ?? null;

  const displayName =
    profile?.display_name?.trim() ||
    spotlightTrack?.artists?.[0]?.display_name?.trim() ||
    spotlightTrack?.profiles?.display_name?.trim() ||
    "Unknown artist";

  const avatarUrl = useMemo(() => {
    const base = profile?.avatar_url ?? null;
    const updatedAt = profile?.updated_at ?? null;

    if (!base) return null;
    if (!updatedAt) return base;

    const sep = String(base).includes("?") ? "&" : "?";
    return `${base}${sep}v=${encodeURIComponent(String(updatedAt))}`;
  }, [profile?.avatar_url, profile?.updated_at]);

  const bioText = useMemo(() => {
    const raw = profile?.bio?.trim() ?? "";
    if (!raw) return "No bio yet.";

    if (raw.length <= 260) return raw;
    return `${raw.slice(0, 260).trim()}…`;
  }, [profile?.bio]);

  const socialLinks = useMemo(() => {
    const items: SocialLink[] = [];

    if (profile?.instagram) items.push({ label: "Instagram", href: profile.instagram });
    if (profile?.tiktok) items.push({ label: "TikTok", href: profile.tiktok });
    if (profile?.facebook) items.push({ label: "Facebook", href: profile.facebook });
    if (profile?.x) items.push({ label: "X", href: profile.x });

    return items;
  }, [profile?.instagram, profile?.tiktok, profile?.facebook, profile?.x]);

  const isNowPlayingArtist =
    !!currentTrack &&
    !!spotlightTrack &&
    currentTrack.id === spotlightTrack.id &&
    isPlaying;

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!spotlightArtistId) {
        setProfile(null);
        setHasError(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setHasError(false);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, bio, avatar_url, instagram, tiktok, facebook, x, updated_at"
        )
        .eq("id", spotlightArtistId)
        .maybeSingle<SpotlightProfile>();

      if (cancelled) return;

      if (error) {
        console.error("HomeArtistSpotlightCard profile load error:", error);
        setProfile(null);
        setHasError(true);
        setLoading(false);
        return;
      }

      setProfile(data ?? null);
      setHasError(false);
      setLoading(false);
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [spotlightArtistId, supabase]);

  if (!tracks.length || !spotlightTrack) {
    return null;
  }

  return (
    <aside className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,17,18,0.92),rgba(10,10,11,0.98))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(0,255,198,0.10),transparent_70%)]" />

      <div className="relative">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
          {isNowPlayingArtist ? "Now playing artist" : "Artist spotlight"}
        </div>

        <div className="mt-2 text-xs text-white/45">
          From{" "}
          <span className="text-white/70">
            {spotlightTrack.title ?? "Untitled track"}
          </span>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="space-y-4">
              <div className="h-[76px] w-[76px] rounded-2xl bg-white/10 animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-40 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
                <div className="h-3 w-[92%] rounded bg-white/10 animate-pulse" />
                <div className="h-3 w-[80%] rounded bg-white/10 animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="relative h-[220px] w-full overflow-hidden rounded-[28px] bg-black/30 shadow-[0_14px_34px_rgba(0,0,0,0.30)]">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      fill
                      sizes="(min-width: 1280px) 340px, 100vw"
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-white/55">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  {spotlightArtistId ? (
                    <Link
                      href={`/dashboard/artist/${spotlightArtistId}`}
                      className="block text-[38px] font-semibold leading-[0.98] tracking-[-0.03em] text-white transition-colors hover:text-[#00FFC6]"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <div className="text-[38px] font-semibold leading-[0.98] tracking-[-0.03em] text-white">
                      {displayName}
                    </div>
                  )}

                  <div className="mt-3 text-[15px] leading-6 text-white/45">
                    {isNowPlayingArtist
                      ? "Currently playing on this page"
                      : "Featured from current development list"}
                  </div>
                </div>
              </div>

              <div className="mt-5 h-px bg-white/8" />

              <div className="mt-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                  About
                </div>
                <div className="mt-3 max-h-[260px] overflow-y-auto pr-2">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-white/72">
                    {hasError ? "Artist details could not be loaded right now." : bioText}
                  </p>
                </div>
              </div>

              {socialLinks.length > 0 ? (
                <>
                  <div className="mt-5 h-px bg-white/8" />

                  <div className="mt-5">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                      Socials
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {profile?.instagram ? (
                        <a
                          href={profile.instagram}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label="Instagram"
                          className="flex items-center gap-2 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
                        >
                          <Instagram size={18} />
                          Instagram
                        </a>
                      ) : null}

                      {profile?.tiktok ? (
                        <a
                          href={profile.tiktok}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label="TikTok"
                          className="flex items-center gap-2 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
                        >
                          <Music2 size={18} />
                          TikTok
                        </a>
                      ) : null}

                      {profile?.facebook ? (
                        <a
                          href={profile.facebook}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label="Facebook"
                          className="flex items-center gap-2 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
                        >
                          <Facebook size={18} />
                          Facebook
                        </a>
                      ) : null}

                      {profile?.x ? (
                        <a
                          href={profile.x}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label="X"
                          className="flex items-center gap-2 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
                        >
                          <Twitter size={18} />
                          X
                        </a>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

"use client";

import {
  Instagram,
  Facebook,
  Twitter,
  Music2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePlayer } from "@/context/PlayerContext";
import FollowArtistButton from "@/app/dashboard/artist/[id]/_components/_actions/FollowArtistButton";
import type { PlayerTrack } from "@/types/playerTrack";

type SpotlightProfile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_pos_x: number | null;
  avatar_pos_y: number | null;
  avatar_zoom: number | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  x: string | null;
  updated_at: string | null;
};

type SocialLink = {
  label: string;
  href: string;
  icon: LucideIcon;
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

  const [canFollow, setCanFollow] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

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

  const avatarPosX = profile?.avatar_pos_x ?? 50;
  const avatarPosY = profile?.avatar_pos_y ?? 50;
  const avatarZoom = profile?.avatar_zoom ?? 100;

  const bioText = useMemo(() => {
    const raw = profile?.bio?.trim() ?? "";
    if (!raw) return "No bio yet.";

    if (raw.length <= 260) return raw;
    return `${raw.slice(0, 260).trim()}…`;
  }, [profile?.bio]);

  const socialLinks = useMemo(() => {
    const items: SocialLink[] = [];

    if (profile?.instagram) {
      items.push({ label: "Instagram", href: profile.instagram, icon: Instagram });
    }
    if (profile?.tiktok) {
      items.push({ label: "TikTok", href: profile.tiktok, icon: Music2 });
    }
    if (profile?.facebook) {
      items.push({ label: "Facebook", href: profile.facebook, icon: Facebook });
    }
    if (profile?.x) {
      items.push({ label: "X", href: profile.x, icon: Twitter });
    }

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
          "id, display_name, bio, avatar_url, avatar_pos_x, avatar_pos_y, avatar_zoom, instagram, tiktok, facebook, x, updated_at"
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

  useEffect(() => {
    let cancelled = false;

    async function loadFollowState() {
      if (!spotlightArtistId) {
        setCanFollow(false);
        setIsFollowing(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setCanFollow(false);
        setIsFollowing(false);
        return;
      }

      if (user.id === spotlightArtistId) {
        setCanFollow(false);
        setIsFollowing(false);
        return;
      }

      setCanFollow(true);

      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("following_id", spotlightArtistId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("HomeArtistSpotlightCard follow state load error:", error);
        setIsFollowing(false);
        return;
      }

      setIsFollowing(!!data);
    }

    void loadFollowState();

    return () => {
      cancelled = true;
    };
  }, [spotlightArtistId, supabase]);

  if (!tracks.length || !spotlightTrack) {
    return null;
  }

  return (
    <aside className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,17,18,0.92),rgba(10,10,11,0.98))] p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 sm:h-24 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(0,255,198,0.10),transparent_70%)]" />

      <div className="relative">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
          {isNowPlayingArtist ? "Now playing artist" : "Artist spotlight"}
        </div>

        <div className="mt-1.5 text-[11px] text-white/45 sm:mt-2 sm:text-xs">
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
                <div className="relative mx-auto aspect-square w-full max-w-[190px] overflow-hidden rounded-[22px] bg-[#0C0C0E] shadow-[0_14px_34px_rgba(0,0,0,0.30)] sm:max-w-[240px] sm:rounded-[24px] md:max-w-[300px] lg:max-w-[400px] lg:rounded-[28px]">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover will-change-transform"
                      style={{
                        objectPosition: `${avatarPosX}% ${avatarPosY}%`,
                        transform: `scale(${avatarZoom / 100})`,
                        transformOrigin: `${avatarPosX}% ${avatarPosY}%`,
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-white/55">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="mt-4 sm:mt-5">
                  {spotlightArtistId ? (
                    <Link
                      href={`/dashboard/artist/${spotlightArtistId}`}
                      className="block text-[28px] font-semibold leading-[1.02] tracking-[-0.03em] text-white transition-colors hover:text-[#00FFC6] sm:text-[32px] md:text-[36px] lg:text-[38px]"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <div className="text-[28px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-[32px] md:text-[36px] lg:text-[38px]">
                      {displayName}
                    </div>
                  )}

                  <div className="mt-2 text-[13px] leading-5 text-white/45 sm:mt-3 sm:text-[15px] sm:leading-6">
                    {isNowPlayingArtist
                      ? "Currently playing on this page"
                      : "Featured from current development list"}
                  </div>

                  {canFollow && spotlightArtistId ? (
                    <div className="mt-3 sm:mt-4">
                      <FollowArtistButton
                        artistId={spotlightArtistId}
                        isFollowing={isFollowing}
                        onChange={setIsFollowing}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 h-px bg-white/8 sm:mt-5" />

              <div className="mt-4 sm:mt-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                  About
                </div>
                <div className="mt-2.5 max-h-[180px] overflow-y-auto pr-1.5 sm:mt-3 sm:max-h-[220px] sm:pr-2">
                  <p className="whitespace-pre-wrap text-[13px] leading-6 text-white/72 sm:text-sm sm:leading-7">
                    {hasError ? "Artist details could not be loaded right now." : bioText}
                  </p>
                </div>
              </div>

              {socialLinks.length > 0 ? (
                <>
                  <div className="mt-4 h-px bg-white/8 sm:mt-5" />

                  <div className="mt-4 sm:mt-5">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                      Socials
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-3 sm:mt-3 sm:gap-4">
                      {socialLinks.map((social) => {
                        const Icon = social.icon;

                        return (
                          <a
                            key={social.label}
                            href={social.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={social.label}
                            className="flex items-center gap-2 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-[13px] sm:text-sm"
                          >
                            <Icon size={18} />
                            {social.label}
                          </a>
                        );
                      })}
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

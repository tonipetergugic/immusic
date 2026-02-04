"use client";

import { Instagram, Facebook, Twitter, Music2 } from "lucide-react";
import BackLink from "@/components/BackLink";
import FollowCountsClient from "./_actions/FollowCountsClient";
import ArtistHeaderActions from "./ArtistHeaderActions";
import type { ArtistCoreDto, ViewerDto } from "../_types/artistPageDto";

export default function ArtistHeader({
  artist,
  viewer,
  counts,
  initialStates,
  shareUrl,
}: {
  artist: ArtistCoreDto;
  viewer: ViewerDto;
  counts: { followers: number; following: number };
  initialStates: { isFollowing: boolean; isSaved: boolean };
  shareUrl: string;
}) {
  const bannerUrl = artist.bannerUrl ?? null;
  const avatarUrl = artist.avatarUrl ?? null;
  const bannerPosY = artist.bannerPosY ?? 50;

  return (
    <div className="w-full">
      {/* Header (full-bleed banner) */}
      <div className="relative left-1/2 right-1/2 -translate-x-1/2 w-screen">
        {/* Full-width bloom background */}
        <div className="pointer-events-none absolute inset-0 bg-[#0E0E10]" />
        <div
          className="
            pointer-events-none
            absolute inset-0
            opacity-80
            blur-[60px]
            bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,198,0.18),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(0,255,198,0.10),transparent_55%)]
          "
        />

        {/* Banner: full-bleed, no card */}
        <div className="relative w-full overflow-hidden aspect-[16/9] min-h-[260px] max-h-[520px]">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt="Artist Banner"
              className="w-full h-full object-cover"
              style={{ objectPosition: `50% ${bannerPosY}%` }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-white/5 via-white/[0.06] to-white/5" />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />

          {/* Back button inside banner */}
          <div className="absolute left-4 top-6 md:left-40 z-50 pointer-events-auto group">
            <div
              className="
                inline-flex items-center rounded-full
                bg-black/55 backdrop-blur-md
                border border-white/15
                px-3 py-1.5
                shadow-lg
                transition-all duration-200
                hover:border-[#00FFC6]/60
                hover:shadow-[0_0_18px_rgba(0,255,198,0.35)]
                active:shadow-[0_0_26px_rgba(0,255,198,0.55)]
              "
            >
              <BackLink
                label="Back"
                className="
                  mb-0
                  text-white/90
                  transition-all
                  group-hover:text-[#00FFC6]
                  group-hover:drop-shadow-[0_0_10px_rgba(0,255,198,0.6)]
                  active:drop-shadow-[0_0_14px_rgba(0,255,198,0.8)]
                "
              />
            </div>
          </div>

          {/* Banner content */}
          <div className="absolute left-4 right-6 bottom-4 md:left-40 md:right-16 md:top-1/2 md:bottom-auto md:-translate-y-1/2 flex items-start md:items-center gap-4 md:gap-6">
            <div className="shrink-0 hidden md:block">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={artist.displayName}
                  className="w-44 h-44 md:w-48 md:h-48 rounded-full object-cover border-4 border-white/15 shadow-2xl"
                />
              ) : (
                <div className="w-44 h-44 md:w-48 md:h-48 rounded-full bg-white/10 border-4 border-white/10" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white drop-shadow-xl truncate leading-tight">
                {artist.displayName}
              </h1>

              {artist.city || artist.country ? (
                <p className="mt-1 text-base md:text-lg text-white/70 drop-shadow-md">
                  {[artist.city, artist.country].filter(Boolean).join(", ")}
                </p>
              ) : null}

              <div className="mt-2 md:mt-3">
                <FollowCountsClient
                  profileId={artist.id}
                  followerCount={counts.followers}
                  followingCount={counts.following}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions + Social (inline) + Bio */}
      <div className="w-full px-0 mt-6">
        <div className="flex items-start justify-between gap-6">
          {/* Socials (bigger) */}
          <div className="flex flex-wrap items-center gap-5">
            {artist.socials.instagram ? (
              <a
                href={artist.socials.instagram}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Instagram"
                className="flex items-center gap-2 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-base"
              >
                <Instagram size={20} />
                Instagram
              </a>
            ) : null}

            {artist.socials.tiktok ? (
              <a
                href={artist.socials.tiktok}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="TikTok"
                className="flex items-center gap-2 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-base"
              >
                <Music2 size={20} />
                TikTok
              </a>
            ) : null}

            {artist.socials.facebook ? (
              <a
                href={artist.socials.facebook}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Facebook"
                className="flex items-center gap-2 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-base"
              >
                <Facebook size={20} />
                Facebook
              </a>
            ) : null}

            {artist.socials.x ? (
              <a
                href={artist.socials.x}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="X"
                className="flex items-center gap-2 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-base"
              >
                <Twitter size={20} />
                X
              </a>
            ) : null}
          </div>

          {/* Actions (right) */}
          <div className="min-w-[220px] flex justify-end">
            <ArtistHeaderActions
              artistId={artist.id}
              artistName={artist.displayName}
              shareUrl={shareUrl}
              viewer={{ id: viewer.id, canFollow: viewer.canFollow, canSave: viewer.canSave }}
              initialStates={initialStates}
            />
          </div>
        </div>

        {artist.bio ? (
          <p className="mt-6 max-w-3xl text-white/90 whitespace-pre-line leading-relaxed">
            {artist.bio}
          </p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useArtistProfile } from "@/app/artist/_components/ArtistProfileProvider";

export default function ArtistDashboardHero({
  publicArtistHref,
}: {
  publicArtistHref: string;
}) {
  const { displayName, bannerUrl, artistOnboardingStatus } = useArtistProfile();

  const artistName = displayName?.trim() ? displayName : "Artist";
  const isProfileIncomplete =
    !bannerUrl || !artistOnboardingStatus || artistOnboardingStatus !== "complete";

  return (
    <div className="rounded-xl bg-[#121216] border border-white/5 overflow-hidden">
      <div className="relative h-56 md:h-72">
        {bannerUrl ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#00FFC6]/15 via-white/5 to-[#00FFC6]/10" />
        )}

        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

        <div className="absolute inset-0 flex items-end px-6 md:px-10 pb-6 md:pb-8">
          <div className="w-full">
            {!bannerUrl ? (
              <p className="text-xs text-white/60 mb-2">Banner not set yet</p>
            ) : (
              <p className="text-xs text-white/60 mb-2">
                Public page:{" "}
                <Link
                  href={publicArtistHref}
                  className="text-[#00FFC6] hover:text-[#00E0B0] transition-colors"
                >
                  Open →
                </Link>
              </p>
            )}

            <p className="text-sm text-white/80">Welcome to ImMusic</p>

            <p className="mt-1 text-4xl md:text-6xl xl:text-7xl font-semibold text-white leading-tight tracking-tight">
              {artistName}
            </p>

            <p className="mt-2 text-sm text-white/70">
              Your hub for releases, uploads and analytics.
            </p>

            {isProfileIncomplete ? (
              <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-[#B3B3B3]">
                  Tip: Complete your artist profile for a better public page.
                  <Link
                    href="/artist/profile"
                    className="ml-2 text-[#00FFC6] hover:text-[#00E0B0] transition-colors"
                  >
                    Go to Profile →
                  </Link>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

import PlaylistCard from "@/components/PlaylistCard";
import BackLink from "@/components/BackLink";
import FollowSection from "./FollowSection";
import type { PublicProfile, PublicPlaylist } from "../_types/public-profile";

function versionedUrl(base: string | null, updatedAt: string | null | undefined) {
  if (!base) return null;
  if (!updatedAt) return base;
  return `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(updatedAt)}`;
}

export default function PublicProfileView({
  profile,
  playlists,
  profileId,
  canFollow,
  followerCount,
  followingCount,
  isFollowingInitial,
}: {
  profile: PublicProfile;
  playlists: PublicPlaylist[];
  profileId: string;
  canFollow: boolean;
  followerCount: number;
  followingCount: number;
  isFollowingInitial: boolean;
}) {
  const avatarUrl = versionedUrl(profile.avatar_url, profile.updated_at);

  return (
    <div className="w-full min-h-screen bg-[#0E0E10] text-white">
      {/* Header area (old-style) */}
      <div className="w-full max-w-[1200px] mx-auto px-6 pt-6">
        <div className="mb-6">
          <BackLink />
        </div>

        <h1 className="mt-4 mb-6 text-5xl md:text-6xl font-extrabold tracking-tight text-white">
          Public profile
        </h1>

        <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
          {/* BACKGROUND BLOOM */}
          <div
            className="
              absolute inset-0 bg-cover bg-center
              blur-[40px] opacity-80 brightness-125 saturate-125
              pointer-events-none
            "
            style={avatarUrl ? { backgroundImage: "url(" + avatarUrl + ")" } : undefined}
          />

          {/* DARK OVERLAY */}
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.35)] pointer-events-none" />

          {/* SOFT FADE GRADIENT */}
          <div
            className="
              absolute inset-0
              bg-gradient-to-b
              from-[rgba(0,0,0,0.00)]
              via-[rgba(0,0,0,0.25)]
              to-[rgba(14,14,16,0.92)]
              pointer-events-none
            "
          />

          {/* Fallback banner */}
          <div className="w-full h-full bg-gradient-to-r from-white/5 via-white/[0.06] to-white/5" />

          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 flex items-center gap-6">
            <div className="shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={profile.display_name ?? "Avatar"}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-white/15 shadow-2xl"
                />
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/10 border-4 border-white/10" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-xl truncate">
                {profile.display_name ?? "Unknown"}
              </h1>

              <p className="mt-2 text-sm md:text-base text-white/70 drop-shadow-md">
                {profile.role ?? "listener"}
              </p>

              <FollowSection
                profileId={profileId}
                canFollow={canFollow}
                isFollowingInitial={isFollowingInitial}
                followerCountInitial={followerCount}
                followingCountInitial={followingCount}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Playlists */}
      <div className="w-full max-w-[1200px] mx-auto px-6 mt-10 pb-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold text-white">Playlists</h2>
          <div className="text-sm text-[#B3B3B3]">
            {playlists.length > 0 ? `${playlists.length} total` : ""}
          </div>
        </div>

        {playlists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {playlists.map((pl) => (
              <PlaylistCard
                key={pl.id}
                id={pl.id}
                title={pl.title}
                description={pl.is_public ? "Public playlist" : "Private playlist"}
                cover_url={pl.cover_url ?? null}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-neutral-400 text-sm">No playlists yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

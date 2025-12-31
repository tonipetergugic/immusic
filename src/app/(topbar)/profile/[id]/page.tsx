"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { followProfile, unfollowProfile, isFollowingProfile } from "../actions";
import PlaylistPlayOverlayButton from "@/app/dashboard/artist/[id]/PlaylistPlayOverlayButton";

type PublicProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  location: string | null;
  bio: string | null;
  role: string | null;
};

type PublicPlaylist = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
};

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const profileId = (params?.id ?? "") as string;

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [playlists, setPlaylists] = useState<PublicPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const isSelf = !!viewerId && !!profileId && viewerId === profileId;
  const canFollow = !!viewerId && !isSelf;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;
        setViewerId(user?.id ?? null);

        if (!profileId) {
          setProfile(null);
          setPlaylists([]);
          return;
        }

        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, banner_url, location, bio, role")
          .eq("id", profileId)
          .maybeSingle();

        if (pErr) throw pErr;

        if (!mounted) return;
        setProfile((p as any) ?? null);

        // follower/following counts
        const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", profileId),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", profileId),
        ]);

        if (!mounted) return;
        setFollowerCount(followerCount ?? 0);
        setFollowingCount(followingCount ?? 0);

        // follow state (only if logged in and not self)
        if (user?.id && user.id !== profileId) {
          const res = await isFollowingProfile(profileId);
          if (!mounted) return;
          setFollowing(!!res.following);
        } else {
          setFollowing(false);
        }

        // playlists: public only unless owner
        const base = supabase
          .from("playlists")
          .select("id, title, description, cover_url, is_public, created_at")
          .eq("created_by", profileId)
          .order("created_at", { ascending: false });

        const { data: pls, error: plsErr } =
          user?.id && user.id === profileId
            ? await base
            : await base.eq("is_public", true);

        if (plsErr) throw plsErr;

        if (!mounted) return;
        setPlaylists((pls as any) ?? []);
      } catch (err) {
        console.log("PublicProfilePage load error", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [profileId, supabase]);

  async function toggleFollow() {
    if (!profileId) return;
    if (!canFollow) return;

    try {
      setFollowBusy(true);
      if (following) {
        await unfollowProfile(profileId);
        setFollowing(false);
      } else {
        await followProfile(profileId);
        setFollowing(true);
      }
    } catch (err: any) {
      console.log("toggleFollow error", err);
      alert(err?.message ?? "Something went wrong");
    } finally {
      setFollowBusy(false);
    }
  }

  const bannerUrl = profile?.banner_url ?? null;
  const avatarUrl = profile?.avatar_url ?? null;

  const colorSourceUrl = bannerUrl ?? avatarUrl ?? null;

  return (
    <div className="w-full min-h-screen bg-[#0E0E10] text-white">
      {/* Header area (Artist-like) */}
      <div className="w-full max-w-[1200px] mx-auto px-6 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="
              inline-flex items-center justify-center
              w-10 h-10 rounded-xl
              bg-[#111113]
              border border-[#1A1A1C]
              text-[#B3B3B3]
              hover:border-[#00FFC6]
              hover:text-[#00FFC6]
              transition
            "
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-sm text-white/70">
            Public profile
          </div>
        </div>

        <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
          {/* BACKGROUND BLOOM */}
          <div
            className="
              absolute inset-0 bg-cover bg-center
              blur-[40px] opacity-80 brightness-125 saturate-125
              pointer-events-none
            "
            style={{
              backgroundImage: colorSourceUrl ? `url('${colorSourceUrl}')` : undefined,
            }}
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

          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-white/5 via-white/[0.06] to-white/5" />
          )}

          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 flex items-center gap-6">
            <div className="shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={profile?.display_name ?? "Avatar"}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-white/15 shadow-2xl"
                />
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/10 border-4 border-white/10" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-xl truncate">
                {profile?.display_name ?? (loading ? "Loading..." : "Unknown")}
              </h1>

              {profile?.location ? (
                <p className="mt-2 text-sm md:text-base text-white/70 drop-shadow-md">
                  {profile.location}
                </p>
              ) : null}

              <div className="mt-3 flex items-center gap-6 text-sm text-white/70">
                <span>
                  <span className="text-white/90 font-semibold tabular-nums">
                    {followerCount}
                  </span>{" "}
                  Followers
                </span>
                <span>
                  <span className="text-white/90 font-semibold tabular-nums">
                    {followingCount}
                  </span>{" "}
                  Following
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions + Bio */}
      <div className="w-full max-w-[1200px] mx-auto px-6 mt-6">
        <div className="flex flex-wrap items-center gap-3">
          {canFollow ? (
            <button
              type="button"
              onClick={toggleFollow}
              disabled={followBusy || loading || !profile}
              className="
                inline-flex items-center justify-center
                h-10 px-4 rounded-full
                bg-transparent border border-white/10
                text-[#B3B3B3] text-sm font-medium
                hover:text-white hover:border-white/20
                transition
                disabled:opacity-60 disabled:cursor-wait
              "
            >
              {followBusy ? "..." : following ? "Following" : "Follow"}
            </button>
          ) : null}
        </div>

        {profile?.bio ? (
          <p className="mt-6 max-w-3xl text-white/90 whitespace-pre-line leading-relaxed">
            {profile.bio}
          </p>
        ) : null}
      </div>

      {/* Playlists */}
      <div className="w-full max-w-[1200px] mx-auto px-6 mt-10 pb-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold text-white">Playlists</h2>
          <div className="text-sm text-[#B3B3B3]">
            {(playlists?.length ?? 0) > 0 ? `${playlists.length} total` : ""}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-neutral-400 text-sm">Loading...</p>
          </div>
        ) : !profile ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-neutral-400 text-sm">Profile not found.</p>
          </div>
        ) : playlists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {playlists.map((pl) => {
              const coverSrc =
                pl.cover_url &&
                (pl.cover_url.startsWith("http://") || pl.cover_url.startsWith("https://"))
                  ? pl.cover_url
                  : pl.cover_url
                  ? supabase.storage
                      .from("playlist-covers")
                      .getPublicUrl(pl.cover_url).data.publicUrl
                  : null;

              return (
                <div
                  key={pl.id}
                  className="rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] transition-colors border border-white/10 hover:border-white/20 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md"
                >
                  <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    <Link href={`/dashboard/playlist/${pl.id}`} className="block">
                      {coverSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverSrc}
                          alt={pl.title}
                          className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-neutral-800" />
                      )}
                    </Link>
                    <PlaylistPlayOverlayButton playlistId={pl.id} size="lg" />
                  </div>

                  <Link href={`/dashboard/playlist/${pl.id}`} className="block">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-white truncate">
                        {pl.title}
                      </h3>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-white/50">
                        {pl.is_public ? "Public" : "Private"}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { followProfile, unfollowProfile, isFollowingProfile } from "../actions";
import PlaylistPlayOverlayButton from "@/app/dashboard/artist/[id]/PlaylistPlayOverlayButton";
import FollowersModal from "@/components/FollowersModal";

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

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Followers");
  const [modalProfiles, setModalProfiles] = useState<
    { id: string; display_name: string | null; avatar_url: string | null; role: string | null }[]
  >([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [viewerFollowingIds, setViewerFollowingIds] = useState<Set<string>>(new Set());
  const [toggleBusyIds, setToggleBusyIds] = useState<Set<string>>(new Set());

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

  async function refreshViewerFollowingIds(uid: string) {
    const { data, error } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", uid);

    if (error) {
      console.log("refreshViewerFollowingIds error", error);
      setViewerFollowingIds(new Set());
      return;
    }

    const ids = (data ?? []).map((r: any) => r.following_id).filter(Boolean);
    setViewerFollowingIds(new Set(ids));
  }

  async function toggleFollow() {
    if (!profileId) return;
    if (!canFollow) return;

    const wasFollowingSnapshot = following;
    const prevFollowerCountSnapshot = followerCount;

    try {
      setFollowBusy(true);

      // optimistic
      if (wasFollowingSnapshot) {
        setFollowing(false);
        setFollowerCount(Math.max(0, prevFollowerCountSnapshot - 1));
      } else {
        setFollowing(true);
        setFollowerCount(prevFollowerCountSnapshot + 1);
      }

      if (wasFollowingSnapshot) {
        await unfollowProfile(profileId);
      } else {
        await followProfile(profileId);
      }
    } catch (err: any) {
      console.log("toggleFollow error", err);

      // rollback to snapshots
      setFollowing(wasFollowingSnapshot);
      setFollowerCount(prevFollowerCountSnapshot);

      alert(err?.message ?? "Something went wrong");
    } finally {
      setFollowBusy(false);
    }
  }

  async function toggleFollowInModal(targetId: string) {
    if (!viewerId) return;
    if (viewerId === targetId) return;

    if (toggleBusyIds.has(targetId)) return;

    const prev = new Set(viewerFollowingIds);
    const next = new Set(viewerFollowingIds);

    const isFollowing = next.has(targetId);
    if (isFollowing) next.delete(targetId);
    else next.add(targetId);

    setViewerFollowingIds(next);
    setToggleBusyIds(new Set([...toggleBusyIds, targetId]));

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", viewerId)
          .eq("following_id", targetId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: viewerId, following_id: targetId });

        if (error) throw error;
      }
    } catch (err) {
      console.log("toggleFollowInModal error", err);
      setViewerFollowingIds(prev);
    } finally {
      const busy = new Set(toggleBusyIds);
      busy.delete(targetId);
      setToggleBusyIds(busy);
    }
  }

  async function openFollowList(kind: "followers" | "following") {
    if (!profileId) return;

    try {
      setModalLoading(true);
      setModalTitle(kind === "followers" ? "Followers" : "Following");
      setModalProfiles([]);
      setModalOpen(true);

      if (viewerId) {
        await refreshViewerFollowingIds(viewerId);
      }

      if (kind === "followers") {
        const { data: rows, error } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", profileId);

        if (error) throw error;

        const ids = (rows ?? []).map((r: any) => r.follower_id).filter(Boolean);
        if (ids.length === 0) {
          setModalProfiles([]);
          return;
        }

        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, role")
          .in("id", ids);

        if (pErr) throw pErr;

        const map = new Map<string, any>(((profs as any) ?? []).map((p: any) => [p.id, p]));
        setModalProfiles(ids.map((id: string) => map.get(id)).filter(Boolean));
      } else {
        const { data: rows, error } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", profileId);

        if (error) throw error;

        const ids = (rows ?? []).map((r: any) => r.following_id).filter(Boolean);
        if (ids.length === 0) {
          setModalProfiles([]);
          return;
        }

        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, role")
          .in("id", ids);

        if (pErr) throw pErr;

        const map = new Map<string, any>(((profs as any) ?? []).map((p: any) => [p.id, p]));
        setModalProfiles(ids.map((id: string) => map.get(id)).filter(Boolean));
      }
    } catch (err) {
      console.log("openFollowList error", err);
      setModalProfiles([]);
    } finally {
      setModalLoading(false);
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
                <button
                  type="button"
                  onClick={() => openFollowList("followers")}
                  className="hover:text-white transition"
                >
                  <span className="text-white/90 font-semibold tabular-nums">
                    {followerCount}
                  </span>{" "}
                  Followers
                </button>
                <button
                  type="button"
                  onClick={() => openFollowList("following")}
                  className="hover:text-white transition"
                >
                  <span className="text-white/90 font-semibold tabular-nums">
                    {followingCount}
                  </span>{" "}
                  Following
                </button>
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
              className={`
                inline-flex items-center justify-center
                h-10 px-4 rounded-full
                border
                text-sm font-semibold
                transition
                disabled:opacity-60 disabled:cursor-wait
                ${
                  followBusy
                    ? "border-white/10 bg-white/[0.04] text-white/70"
                    : following
                    ? "border-white/15 bg-transparent text-white/80 hover:border-white/25 hover:bg-white/[0.04]"
                    : "border-[#00FFC6]/40 bg-[#00FFC6]/10 text-[#00FFC6] hover:bg-[#00FFC6]/15 hover:border-[#00FFC6]/60"
                }
              `}
            >
              {followBusy ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
                  <span>Saving</span>
                </span>
              ) : (
                (following ? "Following" : "Follow")
              )}
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

      <FollowersModal
        open={modalOpen}
        title={modalTitle}
        loading={modalLoading}
        profiles={modalProfiles}
        viewerId={viewerId}
        followingIds={viewerFollowingIds}
        onToggleFollow={toggleFollowInModal}
        busyIds={toggleBusyIds}
        onClose={() => setModalOpen(false)}
        onProfileClick={(pid, role) => {
          setModalOpen(false);
          if (role === "artist") {
            router.push(`/dashboard/artist/${pid}`);
          } else {
            router.push(`/profile/${pid}`);
          }
        }}
      />
    </div>
  );
}

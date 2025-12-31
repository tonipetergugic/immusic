"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { followProfile, unfollowProfile, isFollowingProfile } from "@/app/(topbar)/profile/actions";

export default function FollowArtistButton({ artistId }: { artistId: string }) {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

        // only load follow state if logged in and not self
        if (user?.id && user.id !== artistId) {
          const res = await isFollowingProfile(artistId);
          if (!mounted) return;
          setFollowing(!!res.following);
        }
      } catch (e) {
        console.log("FollowArtistButton load error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [artistId]);

  const isSelf = viewerId && viewerId === artistId;
  const canShow = !!viewerId && !isSelf;

  async function toggle() {
    if (!canShow) return;

    try {
      setBusy(true);
      if (following) {
        await unfollowProfile(artistId);
        setFollowing(false);
      } else {
        await followProfile(artistId);
        setFollowing(true);
      }
    } catch (e: any) {
      console.log("FollowArtistButton toggle error", e);
      alert(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;
  if (!canShow) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
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
      {busy ? "..." : following ? "Following" : "Follow"}
    </button>
  );
}


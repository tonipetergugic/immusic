"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import FollowersModal from "@/components/FollowersModal";

export default function FollowCountsClient({
  profileId,
  followerCount,
  followingCount,
}: {
  profileId: string;
  followerCount: number;
  followingCount: number;
}) {
  const router = useRouter();

  const [localFollowerCount, setLocalFollowerCount] = useState(followerCount);
  const [localFollowingCount, setLocalFollowingCount] = useState(followingCount);

  const supabase = useMemo(() => {
    return createSupabaseBrowserClient();
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Followers");
  const [modalProfiles, setModalProfiles] = useState<
    { id: string; display_name: string | null; avatar_url: string | null; role: string | null }[]
  >([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerFollowingIds, setViewerFollowingIds] = useState<Set<string>>(new Set());
  const [toggleBusyIds, setToggleBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      if (mounted) setViewerId(uid);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    setLocalFollowerCount(followerCount);
  }, [followerCount]);

  useEffect(() => {
    setLocalFollowingCount(followingCount);
  }, [followingCount]);

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

  async function toggleFollow(targetId: string) {
    if (!viewerId) return;
    if (viewerId === targetId) return;

    if (toggleBusyIds.has(targetId)) return;

    const wasFollowingSnapshot = viewerFollowingIds.has(targetId);
    const prevFollowingCountSnapshot = localFollowingCount;

    const prev = new Set(viewerFollowingIds);
    const next = new Set(viewerFollowingIds);

    if (wasFollowingSnapshot) next.delete(targetId);
    else next.add(targetId);

    setViewerFollowingIds(next);

    // optimistic header counts (following only)
    if (wasFollowingSnapshot) {
      setLocalFollowingCount(Math.max(0, prevFollowingCountSnapshot - 1));
    } else {
      setLocalFollowingCount(prevFollowingCountSnapshot + 1);
    }

    setToggleBusyIds(new Set([...toggleBusyIds, targetId]));

    try {
      if (wasFollowingSnapshot) {
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
      console.log("toggleFollow error", err);
      // rollback
      setViewerFollowingIds(prev);
      setLocalFollowingCount(prevFollowingCountSnapshot);
    } finally {
      const busy = new Set(toggleBusyIds);
      busy.delete(targetId);
      setToggleBusyIds(busy);
    }
  }

  async function openFollowList(kind: "followers" | "following") {
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

  return (
    <>
      {/* Variante A: ohne Trenner */}
      <div className="mt-3 flex items-center gap-6 text-sm text-white/70">
        <button
          type="button"
          onClick={() => openFollowList("followers")}
          className="hover:text-white transition"
        >
          <span className="text-white/90 font-semibold tabular-nums">
            {localFollowerCount}
          </span>{" "}
          Followers
        </button>

        <button
          type="button"
          onClick={() => openFollowList("following")}
          className="hover:text-white transition"
        >
          <span className="text-white/90 font-semibold tabular-nums">
            {localFollowingCount}
          </span>{" "}
          Following
        </button>
      </div>

      <FollowersModal
        open={modalOpen}
        title={modalTitle}
        loading={modalLoading}
        profiles={modalProfiles}
        viewerId={viewerId}
        followingIds={viewerFollowingIds}
        onToggleFollow={toggleFollow}
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
    </>
  );
}


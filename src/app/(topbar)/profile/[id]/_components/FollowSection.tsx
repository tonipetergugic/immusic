"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FollowersModal from "@/components/FollowersModal";
import { followProfile, unfollowProfile } from "../../actions";

export default function FollowSection({
  profileId,
  canFollow,
  isFollowingInitial,
  followerCountInitial,
  followingCountInitial,
}: {
  profileId: string;
  canFollow: boolean;
  isFollowingInitial: boolean;
  followerCountInitial: number;
  followingCountInitial: number;
}) {
  const [following, setFollowing] = useState(isFollowingInitial);
  const [busy, setBusy] = useState(false);
  const [followerCount, setFollowerCount] = useState(followerCountInitial);

  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Followers");
  const [modalProfiles, setModalProfiles] = useState<
    { id: string; display_name: string | null; avatar_url: string | null; role: string | null }[]
  >([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerFollowingIds, setViewerFollowingIds] = useState<Set<string>>(new Set());
  const [toggleBusyIds, setToggleBusyIds] = useState<Set<string>>(new Set());

  async function openList(kind: "followers" | "following") {
    setModalTitle(kind === "followers" ? "Followers" : "Following");
    setModalProfiles([]);
    setModalOpen(true);
    setModalLoading(true);

    try {
      const res = await fetch(`/api/profiles/${profileId}/${kind}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error ?? "Failed to load list");

      setViewerId(json?.viewerId ?? null);
      setViewerFollowingIds(new Set((json?.viewerFollowingIds ?? []) as string[]));
      setModalProfiles((json?.profiles ?? []) as any);
    } catch (e) {
      console.log("openList error", e);
      setViewerId(null);
      setViewerFollowingIds(new Set());
      setModalProfiles([]);
    } finally {
      setModalLoading(false);
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
        await unfollowProfile(targetId);
      } else {
        await followProfile(targetId);
      }
    } catch (e) {
      console.log("toggleFollowInModal error", e);
      setViewerFollowingIds(prev);
    } finally {
      setToggleBusyIds((cur) => {
        const n = new Set(cur);
        n.delete(targetId);
        return n;
      });
    }
  }

  async function toggleFollow() {
    if (!canFollow) return;
    if (busy) return;

    const was = following;
    const prevCount = followerCount;

    try {
      setBusy(true);

      // optimistic
      if (was) {
        setFollowing(false);
        setFollowerCount(Math.max(0, prevCount - 1));
        await unfollowProfile(profileId);
      } else {
        setFollowing(true);
        setFollowerCount(prevCount + 1);
        await followProfile(profileId);
      }
    } catch (e: any) {
      // rollback
      setFollowing(was);
      setFollowerCount(prevCount);
      alert(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-6">
      <div className="flex items-center gap-6 text-sm text-white/70">
        <button
          type="button"
          onClick={() => openList("followers")}
          className="hover:text-white transition"
        >
          <span className="text-white/90 font-semibold tabular-nums">
            {followerCount}
          </span>{" "}
          Followers
        </button>

        <button
          type="button"
          onClick={() => openList("following")}
          className="hover:text-white transition"
        >
          <span className="text-white/90 font-semibold tabular-nums">
            {followingCountInitial}
          </span>{" "}
          Following
        </button>
      </div>

      {canFollow ? (
        <button
          type="button"
          onClick={toggleFollow}
          disabled={busy}
          className={`
            inline-flex items-center justify-center
            h-10 px-4 rounded-full
            border
            text-sm font-semibold
            transition
            disabled:opacity-60 disabled:cursor-wait
            ${
              busy
                ? "border-white/10 bg-white/[0.04] text-white/70"
                : following
                ? "border-white/15 bg-transparent text-white/80 hover:border-white/25 hover:bg-white/[0.04]"
                : "border-[#00FFC6]/40 bg-[#00FFC6]/10 text-[#00FFC6] hover:bg-[#00FFC6]/15 hover:border-[#00FFC6]/60"
            }
          `}
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
              <span>Saving</span>
            </span>
          ) : following ? (
            "Following"
          ) : (
            "Follow"
          )}
        </button>
      ) : null}

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

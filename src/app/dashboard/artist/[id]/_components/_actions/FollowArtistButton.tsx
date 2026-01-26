"use client";

import { useState } from "react";
import { followProfile, unfollowProfile } from "@/app/(topbar)/profile/actions";

export default function FollowArtistButton({
  artistId,
  isFollowing,
  onChange,
  className,
}: {
  artistId: string;
  isFollowing: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const canShow = true;

  async function toggle() {
    if (!canShow) return;

    try {
      setBusy(true);
      if (isFollowing) {
        await unfollowProfile(artistId);
        onChange(false);
      } else {
        await followProfile(artistId);
        onChange(true);
      }
    } catch (e: any) {
      console.log("FollowArtistButton toggle error", e);
      alert(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (!canShow) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`
        inline-flex items-center justify-center
        h-10 px-4 rounded-full
        bg-transparent border border-white/10
        text-[#B3B3B3] text-sm font-medium
        hover:text-white hover:border-white/20
        transition
        disabled:opacity-60 disabled:cursor-wait
        ${className ?? ""}
      `.trim()}
    >
      {busy ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}

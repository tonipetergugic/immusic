"use client";

import { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { followProfile, unfollowProfile } from "@/app/(topbar)/profile/actions";

function showNotice(message: string) {
  window.dispatchEvent(
    new CustomEvent("immusic:notice", { detail: { message } })
  );
}

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
    } catch (error: unknown) {
      console.error("FollowArtistButton toggle error:", error);
      showNotice(
        error instanceof Error ? error.message : "Something went wrong."
      );
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
  inline-flex min-w-[120px] cursor-pointer items-center justify-center gap-2
  h-10 px-4 rounded-full
  bg-transparent border border-white/10
  text-[#B3B3B3] text-sm font-medium
  hover:text-white hover:border-white/20
  transition
  disabled:opacity-60 disabled:cursor-wait
  ${className ?? ""}
`.trim()}
    >
      {busy ? (
        "..."
      ) : isFollowing ? (
        <>
          <Check size={16} aria-hidden="true" />
          Following
        </>
      ) : (
        <>
          <UserPlus size={16} aria-hidden="true" />
          Follow
        </>
      )}
    </button>
  );
}

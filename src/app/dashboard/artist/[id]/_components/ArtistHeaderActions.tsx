"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Check, Bookmark, Share2 } from "lucide-react";
import FollowArtistButton from "./_actions/FollowArtistButton";
import SaveArtistButton from "./_actions/SaveArtistButton";

type Props = {
  artistId: string;
  artistName?: string | null;
  shareUrl: string;
  viewer: { id: string | null; canFollow: boolean; canSave: boolean };
  initialStates: { isFollowing: boolean; isSaved: boolean };
};

export default function ArtistHeaderActions({
  artistId,
  artistName,
  shareUrl,
  viewer,
  initialStates,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialStates.isFollowing);
  const [isSaved, setIsSaved] = useState(initialStates.isSaved);

  const primaryLabel = isFollowing ? "Following" : "Follow";

  async function handleShare() {
    try {
      const url = shareUrl;
      const title = artistName ? `${artistName} on ImMusic` : "ImMusic";

      // Native share first
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }

      // Fallback: copy to clipboard
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } finally {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="
          inline-flex items-center gap-2
          h-10 px-4
          rounded-full
          bg-[#111112]
          border border-white/10
          text-white/90 text-sm font-semibold
          hover:border-[#00FFC622]
          hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
          transition-all
        "
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {primaryLabel}
        <ChevronDown size={16} className="text-white/60" />
      </button>

      {open ? (
        <>
          {/* click outside */}
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />

          <div
            className="
              absolute right-0 mt-2 z-50 w-64
              rounded-xl bg-[#111112]
              border border-white/10
              shadow-xl
              overflow-hidden
            "
            role="menu"
          >
            <div className="p-2">
              {/* Follow (flat) */}
              <div className="px-1 py-1">
                {viewer.canFollow ? (
                  <FollowArtistButton
                    artistId={artistId}
                    isFollowing={isFollowing}
                    onChange={setIsFollowing}
                    className="w-full justify-start !bg-transparent !border-0 !shadow-none hover:!bg-white/5 rounded-lg px-3 py-2"
                  />
                ) : (
                  <div className="opacity-50">
                    <FollowArtistButton
                      artistId={artistId}
                      isFollowing={false}
                      onChange={setIsFollowing}
                      className="w-full justify-start !bg-transparent !border-0 !shadow-none hover:!bg-white/5 rounded-lg px-3 py-2"
                    />
                  </div>
                )}
              </div>

              {/* Divider between Follow & Save */}
              <div className="my-1 border-t border-white/10" />

              {/* Save (flat) */}
              {viewer.canSave ? (
                <div className="px-1 py-1">
                  <SaveArtistButton
                    artistId={artistId}
                    viewerId={viewer.id}
                    isSaved={isSaved}
                    onChange={setIsSaved}
                    className="w-full justify-start !bg-transparent !border-0 !shadow-none hover:!bg-white/5 rounded-lg px-3 py-2"
                  />
                </div>
              ) : null}

              {/* Divider */}
              <div className="my-2 border-t border-white/10" />

              {/* Share (menu item) */}
              <button
                type="button"
                onClick={handleShare}
                className="
                  w-full flex items-center gap-3
                  px-3 py-2 rounded-lg
                  text-sm text-white/80
                  hover:bg-white/5 hover:text-white
                  transition-colors
                "
                role="menuitem"
              >
                <Share2 size={16} className="text-white/60" />
                Share
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

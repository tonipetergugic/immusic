"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { PlayerTrack } from "@/types/playerTrack";

type TrackOptionsMenuProps = {
  track: PlayerTrack;
  onClose: () => void;
  onRemove?: () => void;
  onAddToPlaylist?: () => void;
  position: {
    top: number;
    left: number;
    openUpwards: boolean;
  };
  showGoToArtist?: boolean;
  showGoToRelease?: boolean;
  releaseId?: string | null;
};

type MenuAction =
  | "add_to_playlist"
  | "toggle_library"
  | "share"
  | "go_artist"
  | "go_track"
  | "go_release"
  | "remove";

type MenuItem = { label: string; action: MenuAction };

export default function TrackOptionsMenu({
  track,
  onClose,
  onRemove,
  onAddToPlaylist,
  position,
  showGoToArtist = true,
  showGoToRelease = false,
  releaseId = null,
}: TrackOptionsMenuProps) {
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const trackId = (track as any)?.id as string | undefined;
  const artistId =
    ((track as any)?.artist_id as string | undefined) ??
    ((track as any)?.artistId as string | undefined);

  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load saved state from DB
  useEffect(() => {
    let cancelled = false;

    async function loadSavedState() {
      if (!trackId) return;

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) return;

      const { data, error } = await supabase
        .from("library_tracks")
        .select("track_id")
        .eq("user_id", user.id)
        .eq("track_id", trackId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Failed to read library_tracks:", error);
        return;
      }

      setIsSaved(!!data);
    }

    void loadSavedState();

    return () => {
      cancelled = true;
    };
  }, [supabase, trackId]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      { label: "Add to playlist", action: "add_to_playlist" },
      {
        label: isSaved ? "Remove from Library" : "Save to Library",
        action: "toggle_library",
      },
      { label: "Share Track", action: "share" },
    ];

    if (showGoToArtist) {
      items.push({ label: "Go to Artist", action: "go_artist" });
    }

    if (showGoToRelease && releaseId) {
      items.push({ label: "Go to Release Page", action: "go_release" });
    }

    items.push({ label: "Go to Track Page", action: "go_track" });

    if (onRemove) {
      items.push({ label: "Remove from Playlist", action: "remove" });
    }

    return items;
  }, [isSaved, onRemove, showGoToArtist, showGoToRelease, releaseId]);

  const getShareUrl = () => {
    if (!trackId) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/dashboard/track/${trackId}`;
  };

  const copyToClipboard = async (text: string) => {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const toggleLibrary = async () => {
    if (!trackId) {
      setToast("Missing track id.");
      return;
    }
    if (busy) return;

    setBusy(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setBusy(false);
      setToast("Not authenticated.");
      return;
    }

    if (isSaved) {
      const { error } = await supabase
        .from("library_tracks")
        .delete()
        .eq("user_id", user.id)
        .eq("track_id", trackId);

      if (error) {
        console.error("Failed to delete from library_tracks:", error);
        setToast("Could not remove. Check console.");
        setBusy(false);
        return;
      }

      setIsSaved(false);
      setToast("Removed from Library");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("library_tracks").insert({
      user_id: user.id,
      track_id: trackId,
    });

    if (error) {
      console.error("Failed to insert into library_tracks:", error);
      setToast("Could not save. Check console.");
      setBusy(false);
      return;
    }

    setIsSaved(true);
    setToast("Saved to Library");
    setBusy(false);
  };

  const handleItemClick = async (action: MenuAction) => {
    try {
      if (action === "remove") {
        onRemove?.();
        onClose();
        return;
      }

      if (action === "add_to_playlist") {
        onAddToPlaylist?.();
        onClose();
        return;
      }

      if (action === "toggle_library") {
        await toggleLibrary();
        // keep menu open briefly so toast is visible
        return;
      }

      if (action === "go_track") {
        if (!trackId) {
          setToast("Track ID missing.");
          return;
        }
        router.push(`/dashboard/track/${trackId}`);
        onClose();
        return;
      }

      if (action === "go_artist") {
        if (!artistId) {
          setToast("Artist ID missing.");
          return;
        }
        router.push(`/dashboard/artist/${artistId}`);
        onClose();
        return;
      }

      if (action === "go_release") {
        if (!releaseId) {
          setToast("Release ID missing.");
          return;
        }
        router.push(`/dashboard/release/${releaseId}`);
        onClose();
        return;
      }

      if (action === "share") {
        const url = getShareUrl();
        if (!url) {
          setToast("Cannot generate share link.");
          return;
        }
        await copyToClipboard(url);
        setToast("Share link copied");
        return;
      }
    } catch (err) {
      console.error(err);
      setToast("Action failed. Check console.");
    }
  };

  return (
    <div
      data-track-options-menu
      role="menu"
      aria-label={`Options for ${track?.title || "track"}`}
      className="absolute z-50 w-56 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl p-2"
      style={{
        top: position.top,
        left: position.left,
        transform: position.openUpwards ? "translateY(-100%)" : undefined,
      }}
    >
      <div className="flex flex-col gap-1">
        {menuItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => void handleItemClick(item.action)}
            role="menuitem"
            className="px-3 py-2 text-sm text-white/80 rounded-md hover:bg-neutral-800/50 transition text-left cursor-pointer w-full"
          >
            {item.label}
          </button>
        ))}
      </div>

      {toast ? (
        <div className="mt-2 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white/70">
          {toast}
        </div>
      ) : null}
    </div>
  );
}


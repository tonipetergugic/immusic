"use client";

import Portal from "@/components/Portal";
import { X } from "lucide-react";
import { useEffect, useMemo } from "react";

type MiniProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export default function FollowersModal({
  open,
  title,
  profiles,
  loading = false,
  viewerId = null,
  followingIds,
  onToggleFollow,
  busyIds,
  onClose,
  onProfileClick,
}: {
  open: boolean;
  title: string;
  profiles: MiniProfile[];
  loading?: boolean;
  viewerId?: string | null;
  followingIds?: Set<string>;
  onToggleFollow?: (targetId: string) => void | Promise<void>;
  busyIds?: Set<string>;
  onClose: () => void;
  onProfileClick?: (profileId: string, role: string | null) => void;
}) {
  const sortedProfiles = useMemo(() => {
    const toLabel = (p: MiniProfile) =>
      p.display_name ?? (p.role === "artist" ? "Artist" : "User");

    return [...profiles].sort((a, b) => {
      const la = toLabel(a).trim().toLocaleLowerCase();
      const lb = toLabel(b).trim().toLocaleLowerCase();

      const cmp = la.localeCompare(lb, undefined, { sensitivity: "base" });
      if (cmp !== 0) return cmp;

      // Stable tie-breaker
      return a.id.localeCompare(b.id);
    });
  }, [profiles]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close modal"
          onClick={onClose}
          className="absolute inset-0 bg-black/70"
        />

        {/* Modal */}
        <div
          className="
            relative w-full max-w-lg
            rounded-2xl
            border border-white/10
            bg-[#0B0B0D]
            shadow-[0_20px_80px_rgba(0,0,0,0.65)]
            overflow-hidden
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="text-white font-semibold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="
                inline-flex items-center justify-center
                w-9 h-9 rounded-xl
                bg-[#111113]
                border border-[#1A1A1C]
                text-[#B3B3B3]
                hover:border-[#00FFC6]
                hover:text-[#00FFC6]
                transition
              "
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {loading ? (
              <div className="p-10 flex flex-col items-center justify-center gap-3 text-white/60">
                <div
                  className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin"
                  aria-label="Loading"
                />
                <div className="text-sm">Loading…</div>
              </div>
            ) : profiles.length > 0 ? (
              <div className="flex flex-col gap-2 p-2">
                {sortedProfiles.map((p) => {
                  const label =
                    p.display_name ?? (p.role === "artist" ? "Artist" : "User");
                  const isSelf = !!viewerId && viewerId === p.id;
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (isSelf) return;
                        onProfileClick?.(p.id, p.role);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (isSelf) return;
                          onProfileClick?.(p.id, p.role);
                        }
                      }}
                      className="
                        w-full
                        flex items-center gap-3
                        px-3 py-2.5
                        rounded-2xl
                        border border-white/10
                        bg-white/[0.03]
                        hover:bg-white/[0.06]
                        hover:border-white/20
                        transition
                        text-left
                        cursor-pointer
                        outline-none
                        focus:ring-2 focus:ring-[#00FFC6]/40
                      "
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1A1A1C] border border-white/10 flex items-center justify-center shrink-0">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={label}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm text-[#00FFC6] font-medium">
                            {label.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-white/90 font-medium truncate">
                          {label}
                        </div>
                        <div className="text-xs text-white/50 mt-0.5">
                          {p.role ?? "listener"}
                        </div>
                      </div>

                      {viewerId && viewerId !== p.id && onToggleFollow ? (
                        (() => {
                          const isBusy = !!busyIds?.has(p.id);
                          const isFollowing = !!followingIds?.has(p.id);
                          return (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isBusy) return;
                                onToggleFollow(p.id);
                              }}
                              className={`
                                inline-flex items-center justify-center
                                h-8 px-3
                                rounded-full
                                border
                                text-xs font-semibold
                                transition
                                shrink-0
                                ${
                                  isBusy
                                    ? "opacity-60 cursor-wait border-white/10 bg-white/[0.04] text-white/70"
                                    : isFollowing
                                    ? "border-white/15 bg-transparent text-white/80 hover:border-white/25 hover:bg-white/[0.04]"
                                    : "border-[#00FFC6]/40 bg-[#00FFC6]/10 text-[#00FFC6] hover:bg-[#00FFC6]/15 hover:border-[#00FFC6]/60"
                                }
                              `}
                            >
                              {isBusy ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
                                  <span className="text-white/70">Saving</span>
                                </span>
                              ) : (
                                (isFollowing ? "Following" : "Follow")
                              )}
                            </button>
                          );
                        })()
                      ) : (
                        <div className="text-xs text-white/40">{isSelf ? "You" : "View"}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-white/50">
                No profiles yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}


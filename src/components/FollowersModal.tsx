"use client";

import Portal from "@/components/Portal";
import { X } from "lucide-react";

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
  onClose,
  onProfileClick,
}: {
  open: boolean;
  title: string;
  profiles: MiniProfile[];
  onClose: () => void;
  onProfileClick?: (profileId: string, role: string | null) => void;
}) {
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
            {profiles.length > 0 ? (
              <div className="flex flex-col gap-2 p-2">
                {profiles.map((p) => {
                  const label =
                    p.display_name ?? (p.role === "artist" ? "Artist" : "User");
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onProfileClick?.(p.id, p.role)}
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

                      <div className="text-xs text-white/40">
                        View
                      </div>
                    </button>
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


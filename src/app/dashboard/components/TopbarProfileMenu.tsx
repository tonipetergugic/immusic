"use client";

import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import type { RefObject } from "react";
import { profileSectionItems, type ProfileSectionKey } from "@/components/profileSectionItems";

type TopbarProfileMenuProps = {
  avatarMenuRef: RefObject<HTMLDivElement>;
  avatarUrl: string | null;
  displayName: string | null;
  userEmail: string | null;
  role: string | null;
  activeSection: ProfileSectionKey | null;
  onClose: () => void;
  onLogout: () => void | Promise<void>;
};

export default function TopbarProfileMenu({
  avatarMenuRef,
  avatarUrl,
  displayName,
  userEmail,
  role,
  activeSection,
  onClose,
  onLogout,
}: TopbarProfileMenuProps) {
  return (
    <div
      ref={avatarMenuRef}
      role="menu"
      className="
        absolute top-14 right-4 sm:right-6 lg:right-8 z-50
        w-64
        bg-[#0B0B0D] border border-[#1A1A1C]
        rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)]
        p-2
      "
    >
      <div className="px-2 py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1A1A1C] border border-[#00FFC622] flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm text-[#00FFC6] font-medium">
                {(displayName ?? userEmail ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/90 font-medium truncate">
                {displayName ?? "Your Profile"}
              </span>

              {role === "admin" && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-[2px] rounded-full border border-[#00FFC622] text-[#00FFC6]/90 bg-[#00FFC608]">
                  <Shield size={12} />
                  Admin
                </span>
              )}
            </div>

            <div className="text-xs text-[#B3B3B3] truncate">
              {userEmail ?? ""}
            </div>
          </div>
        </div>
      </div>

      <div className="my-2 h-px bg-[#1A1A1C]" />

      <div className="flex flex-col text-sm">
        {profileSectionItems.map((item) => {
          const Icon = item.icon;

          const isActive = item.key === activeSection;

          return (
            <Link
              key={item.key}
              href={item.href}
              role="menuitem"
              className={`
                flex items-center ${item.key === "messages" ? "gap-3" : "gap-2"}
                w-full px-3 py-2 rounded-lg transition
                ${
                  isActive
                    ? "bg-[#00FFC60D] text-[#00FFC6] border border-[#00FFC622]"
                    : item.key === "messages"
                      ? "text-white/80 hover:bg-white/5"
                      : "text-[#B3B3B3] hover:bg-[#111113] hover:text-white"
                }
              `}
              onClick={onClose}
            >
              <Icon
                size={16}
                className={
                  item.key === "messages"
                    ? isActive
                      ? "text-[#00FFC6]"
                      : "text-white/70"
                    : undefined
                }
              />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="my-2 h-px bg-[#1A1A1C]" />

        <button
          type="button"
          role="menuitem"
          onClick={onLogout}
          className="
            flex items-center gap-2
            w-full text-left px-3 py-2 rounded-lg
            text-red-400 cursor-pointer
            hover:bg-[#111113] hover:text-red-300 transition
          "
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}

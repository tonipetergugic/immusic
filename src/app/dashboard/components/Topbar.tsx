"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, CreditCard, Settings, LogOut, Shield, Mail } from "lucide-react";

function versionedUrl(base: string | null, updatedAt: string | null | undefined) {
  if (!base) return null;
  if (!updatedAt) return base;
  return `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(updatedAt)}`;
}

type TopbarProps = {
  userEmail?: string | null;
  displayName?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  avatarUpdatedAt?: string | null;
};

export default function Topbar({
  userEmail: initialUserEmail = null,
  displayName: initialDisplayName = null,
  role: initialRole = null,
  avatarUrl: initialAvatarUrl = null,
  avatarUpdatedAt: initialAvatarUpdatedAt = null,
}: TopbarProps) {
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail);
  const [displayName, setDisplayName] = useState<string | null>(initialDisplayName);
  const [role, setRole] = useState<string | null>(initialRole);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    versionedUrl(initialAvatarUrl, initialAvatarUpdatedAt)
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const supabase = useMemo(() => {
    return createSupabaseBrowserClient();
  }, []);

  useEffect(() => {
    if (role) {
      window.dispatchEvent(new CustomEvent("roleUpdated", { detail: role }));
    }
  }, [role]);

  useEffect(() => {
    function handleNameUpdate(e: CustomEvent) {
      if (typeof e.detail === "string") {
        setDisplayName(e.detail);
      }
    }

    window.addEventListener(
      "displayNameUpdated",
      handleNameUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "displayNameUpdated",
        handleNameUpdate as EventListener
      );
    };
  }, []);

  useEffect(() => {
    function handleAvatarUpdate(e: Event) {
      const custom = e as CustomEvent;
      const nextUrl =
        custom.detail && typeof custom.detail === "object" && "avatar_url" in custom.detail
          ? (custom.detail.avatar_url as string | null)
          : null;

      if (!nextUrl) {
        setAvatarUrl(null);
        return;
      }

      // local cache-bust ohne DB-Refetch
      setAvatarUrl(versionedUrl(nextUrl, new Date().toISOString()));
    }

    window.addEventListener("avatarUpdated", handleAvatarUpdate as EventListener);

    return () => {
      window.removeEventListener("avatarUpdated", handleAvatarUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const menu = document.getElementById("avatar-menu");
      const avatar = document.getElementById("avatar-button");
      if (
        isMenuOpen &&
        menu &&
        !menu.contains(e.target as Node) &&
        avatar &&
        !avatar.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div
      className="
        w-full h-14
        bg-[#0B0B0D]
        border-b border-[#1A1A1C]
        flex items-center justify-between
        px-4 sm:px-6 lg:px-8
        shadow-[0_1px_20px_0_rgba(0,255,198,0.08)]
        relative
        z-40
      "
    >
      <span className="text-white/90 font-semibold tracking-wide text-sm">
        ImMusic Dashboard
      </span>

      <div className="flex items-center gap-5">

        <button
          id="avatar-button"
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          className="
            w-9 h-9 rounded-full border border-[#00FFC622]
            overflow-hidden cursor-pointer
            transition-shadow duration-200
            hover:shadow-[0_0_10px_2px_rgba(0,255,198,0.35)]
            focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/40
            flex items-center justify-center bg-[#1A1A1C]
          "
        >
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
        </button>

        {isMenuOpen && (
          <div
            id="avatar-menu"
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
              <Link
                href="/profile"
                role="menuitem"
                className="
                  flex items-center gap-2
                  w-full px-3 py-2 rounded-lg
                  text-[#B3B3B3]
                  hover:bg-[#111113] hover:text-white transition
                "
                onClick={() => setIsMenuOpen(false)}
              >
                <User size={16} />
                Profile
              </Link>

              <Link
                href="/account"
                role="menuitem"
                className="
                  flex items-center gap-2
                  w-full px-3 py-2 rounded-lg
                  text-[#B3B3B3]
                  hover:bg-[#111113] hover:text-white transition
                "
                onClick={() => setIsMenuOpen(false)}
              >
                <CreditCard size={16} />
                Account
              </Link>

              <Link
                href="/settings"
                role="menuitem"
                className="
                  flex items-center gap-2
                  w-full px-3 py-2 rounded-lg
                  text-[#B3B3B3]
                  hover:bg-[#111113] hover:text-white transition
                "
                onClick={() => setIsMenuOpen(false)}
              >
                <Settings size={16} />
                Settings
              </Link>

              <Link
                href="/artist/invites"
                role="menuitem"
                className="
                  flex items-center gap-3
                  px-3 py-2
                  rounded-lg
                  text-sm text-white/80
                  hover:bg-white/5
                  transition
                "
                onClick={() => setIsMenuOpen(false)}
              >
                <Mail size={16} className="text-white/70" />
                <span>Messages</span>
              </Link>

              <div className="my-2 h-px bg-[#1A1A1C]" />

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="
                  flex items-center gap-2
                  w-full text-left px-3 py-2 rounded-lg
                  text-red-400
                  hover:bg-[#111113] hover:text-red-300 transition
                "
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}

        <span className="hidden md:inline text-white/85 text-sm font-light">
          {displayName ?? (userEmail ? userEmail.split("@")[0] : "")}
        </span>

        {role === "admin" && (
          <Link
            href="/dashboard/admin"
            className="text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
          >
            Admin Panel
          </Link>
        )}

      </div>
    </div>
  );
}

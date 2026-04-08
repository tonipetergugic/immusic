"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TopbarProfileMenu from "./TopbarProfileMenu";
import type { ProfileSectionKey } from "@/components/profileSectionItems";

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
  const userEmail = initialUserEmail;
  const [displayName, setDisplayName] = useState<string | null>(initialDisplayName);
  const role = initialRole;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    versionedUrl(initialAvatarUrl, initialAvatarUpdatedAt)
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const avatarButtonRef = useRef<HTMLButtonElement | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  const supabase = useMemo(() => {
    return createSupabaseBrowserClient();
  }, []);

  const topbarTitle = useMemo(() => {
    if (!pathname) return "Dashboard";

    if (pathname.startsWith("/dashboard/profile")) return "Profile";
    if (pathname.startsWith("/dashboard/account")) return "Account";
    if (pathname.startsWith("/dashboard/settings")) return "Settings";
    if (pathname.startsWith("/dashboard/admin")) return "Admin";
    if (pathname.startsWith("/dashboard/library")) return "Library";
    if (pathname.startsWith("/dashboard/search")) return "Search";
    if (pathname.startsWith("/dashboard/create")) return "Create";
    if (pathname.startsWith("/dashboard/playlist")) return "Playlist";
    if (pathname.startsWith("/dashboard/artist/")) return "Artist";
    if (pathname.startsWith("/dashboard/messages")) return "Messages";
    if (pathname.startsWith("/artist/invites")) return "Messages";
    if (pathname.startsWith("/artist/dashboard")) return "Artist Dashboard";
    if (pathname.startsWith("/artist/releases")) return "Releases";
    if (pathname.startsWith("/artist/upload")) return "Upload";
    if (pathname.startsWith("/artist/my-tracks")) return "My Tracks";
    if (pathname.startsWith("/artist/analytics")) return "Analytics";
    if (pathname.startsWith("/artist/profile")) return "Artist Profile";
    if (pathname.startsWith("/artist/onboarding")) return "Onboarding";
    if (pathname.startsWith("/artist")) return "Artist";

    if (pathname.startsWith("/dashboard")) return "Dashboard";

    return "ImMusic";
  }, [pathname]);

  const activeSection: ProfileSectionKey | null =
    pathname?.startsWith("/dashboard/profile")
      ? "profile"
      : pathname?.startsWith("/dashboard/account")
        ? "account"
        : pathname?.startsWith("/dashboard/settings")
          ? "settings"
          : pathname?.startsWith("/dashboard/messages") ||
              pathname?.startsWith("/artist/invites")
            ? "messages"
            : null;

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
      const target = e.target as Node;

      if (
        isMenuOpen &&
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(target) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(target)
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
    window.location.href = "/login";
  };

  return (
    <div
      className="
        relative z-40
        flex h-16 w-full items-center justify-between
        border-b border-[#1A1A1C]
        bg-[#0B0B0D]
        px-4 sm:px-6 lg:h-14 lg:px-8
        shadow-[0_1px_20px_0_rgba(0,255,198,0.08)]
      "
    >
      <span className="min-w-0 truncate pr-3 text-[15px] font-semibold tracking-[0.02em] sm:text-sm">
        <span className="text-white/90">ImMusic</span>
        <span className="text-[#00FFC6]"> · {topbarTitle}</span>
      </span>

      <div className="flex items-center gap-3 sm:gap-5">

        <button
          ref={avatarButtonRef}
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          className="
            flex h-10 w-10 items-center justify-center
            overflow-hidden rounded-full border border-[#00FFC622]
            bg-[#1A1A1C]
            cursor-pointer
            transition-shadow duration-200
            hover:shadow-[0_0_10px_2px_rgba(0,255,198,0.35)]
            focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/40
            lg:h-9 lg:w-9
          "
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[15px] font-medium text-[#00FFC6] lg:text-sm">
              {(displayName ?? userEmail ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
        </button>

        {isMenuOpen && (
          <TopbarProfileMenu
            avatarMenuRef={avatarMenuRef}
            avatarUrl={avatarUrl}
            displayName={displayName}
            userEmail={userEmail}
            role={role}
            activeSection={activeSection}
            onClose={() => setIsMenuOpen(false)}
            onLogout={handleLogout}
          />
        )}

        <span className="hidden lg:inline text-white/85 text-sm font-light">
          {displayName ?? (userEmail ? userEmail.split("@")[0] : "")}
        </span>

        {role === "admin" && (
          <Link
            href="/dashboard/admin"
            className="hidden lg:inline text-sm text-[#B3B3B3] transition-colors hover:text-[#00FFC6]"
          >
            Admin Panel
          </Link>
        )}

      </div>
    </div>
  );
}

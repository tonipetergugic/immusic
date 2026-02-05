"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Library, PlusCircle, Mic } from "lucide-react";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";

export default function Sidebar({
  variant = "desktop",
  onNavigate,
}: {
  variant?: "desktop" | "drawer";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(true);

  const isDrawer = variant === "drawer";

  useEffect(() => {
    // Init role from cache (needed for Mobile Drawer re-mount)
    try {
      const cached = window.localStorage.getItem("immusic:role");
      if (cached && (cached === "artist" || cached === "admin" || cached === "listener")) {
        setRole(cached);
      }
    } catch {
      // ignore (private mode / blocked storage)
    }

    // Viewport gate: treat < lg as "non-desktop" (tablet + mobile)
    function updateViewport() {
      setIsDesktopViewport(window.matchMedia("(min-width: 1024px)").matches);
    }
    updateViewport();
    window.addEventListener("resize", updateViewport);

    function handleRoleUpdate(e: Event) {
      const ce = e as CustomEvent;
      const nextRole = typeof ce.detail === "string" ? ce.detail : null;
      setRole(nextRole);
    }

    window.addEventListener("roleUpdated", handleRoleUpdate as EventListener);

    return () => {
      window.removeEventListener("roleUpdated", handleRoleUpdate as EventListener);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  return (
    <div
      className={[
        isDrawer
          ? `
            relative
            h-full
            w-full
            bg-transparent
            p-4
            flex
            flex-col
            gap-2
          `
          : `
            fixed
            top-0
            left-0
            h-full
            w-60
            bg-[#0B0B0D]
            border-r border-[#1A1A1C]
            p-4
            flex
            flex-col
            gap-2
            z-30
          `,
      ].join(" ")}
    >

      <SidebarItem
        href="/dashboard"
        icon={<Home size={20} />}
        label="Home"
        onClick={() => onNavigate?.()}
      />
      <SidebarItem
        href="/dashboard/library"
        icon={<Library size={20} />}
        label="Library"
        matchPrefix
        onClick={() => onNavigate?.()}
      />
      <SidebarItem
        icon={<PlusCircle size={20} />}
        label="Create Playlist"
        onClick={() => setIsCreateOpen(true)}
      />

      {/* Artist Bereich */}
      {isDrawer || !isDesktopViewport ? (
        <div className="flex items-center gap-3 p-3 rounded-md text-[#B3B3B3] opacity-80 select-none cursor-not-allowed">
          <Mic size={20} />
          <span className="text-sm">Artist (Desktop only)</span>
        </div>
      ) : role === "artist" || role === "admin" ? (
        <SidebarItem
          href="/artist/dashboard"
          icon={<Mic size={20} />}
          label="Artist"
          matchPrefix
        />
      ) : (
        <Link
          href="/artist/onboarding"
          className={`
            flex items-center gap-3 p-3 rounded-md text-white 
            hover:bg-[#161619] hover:text-[#00FFC6] transition-colors cursor-pointer
            ${
              pathname === "/artist/onboarding" ||
              pathname.startsWith("/artist/onboarding/")
                ? "bg-[#161619] text-[#00FFC6]"
                : ""
            }
          `}
        >
          <Mic size={20} />
          <span className="text-sm">Become Artist</span>
        </Link>
      )}

      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => window.location.reload()}
      />
    </div>
  );
}

function SidebarItem({
  href,
  icon,
  label,
  onClick,
  matchPrefix = false,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  matchPrefix?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = href
    ? matchPrefix
      ? pathname === href || pathname.startsWith(`${href}/`)
      : pathname === href
    : false;

  const clickHandler = () => {
    if (onClick) {
      onClick();
    }
    if (href) {
      router.push(href);
    }
  };

  return (
    <div
      onClick={clickHandler}
      className={`
        flex items-center gap-3 p-3 rounded-md text-white 
        hover:bg-[#161619] hover:text-[#00FFC6] transition-colors cursor-pointer
        ${isActive ? "bg-[#161619] text-[#00FFC6]" : ""}
      `}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </div>
  );
}

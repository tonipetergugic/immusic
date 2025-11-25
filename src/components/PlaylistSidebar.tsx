"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftCircle, ListMusic, Home, Library } from "lucide-react";

export default function PlaylistSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-60 h-full bg-[#0B0B0D] border-r border-[#1A1A1C] p-4 flex flex-col gap-2">
      <PlaylistSidebarItem
        href="/dashboard/library?tab=playlists"
        icon={<ArrowLeftCircle size={20} />}
        label="Back to Library"
        active={pathname.startsWith("/dashboard/library")}
      />

      <PlaylistSidebarItem
        href="/dashboard"
        icon={<Home size={20} />}
        label="Home"
        active={pathname === "/dashboard"}
      />

      <PlaylistSidebarItem
        href="/dashboard/library?tab=tracks"
        icon={<ListMusic size={20} />}
        label="Tracks"
        active={pathname.includes("tab=tracks")}
      />

      <PlaylistSidebarItem
        href="/dashboard/library?tab=artists"
        icon={<Library size={20} />}
        label="Artists"
        active={pathname.includes("tab=artists")}
      />
    </div>
  );
}

function PlaylistSidebarItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 p-3 rounded-md text-white 
        hover:bg-[#161619] hover:text-[#00FFC6] transition-colors
        ${active ? "bg-[#161619] text-[#00FFC6]" : ""}
      `}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
}


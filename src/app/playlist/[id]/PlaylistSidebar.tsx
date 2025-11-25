"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftCircle, ListMusic, Home, Library } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard/library?tab=playlists",
    label: "Back to Library",
    icon: <ArrowLeftCircle size={20} />,
    isActive: (pathname) => pathname.startsWith("/playlist"),
  },
  {
    href: "/dashboard",
    label: "Home",
    icon: <Home size={20} />,
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/dashboard/library?tab=tracks",
    label: "Tracks",
    icon: <ListMusic size={20} />,
    isActive: () => false,
  },
  {
    href: "/dashboard/library?tab=artists",
    label: "Artists",
    icon: <Library size={20} />,
    isActive: () => false,
  },
];

export default function PlaylistSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-60 h-full bg-[#0B0B0D] border-l border-[#1A1A1C] p-4 flex flex-col gap-2">
      {navItems.map((item) => (
        <PlaylistSidebarItem
          key={item.label}
          href={item.href}
          icon={item.icon}
          label={item.label}
          active={item.isActive(pathname)}
        />
      ))}
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
  icon: ReactNode;
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


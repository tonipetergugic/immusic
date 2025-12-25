"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  FileMusic,
  Disc3,
  Upload,
  BarChart3,
  User,
  Home
} from "lucide-react";

export default function ArtistSidebar() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const navItems = [
    {
      label: "Dashboard",
      href: "/artist/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: "Releases",
      href: "/artist/releases",
      icon: <Disc3 size={20} />,
    },
    {
      label: "Upload",
      href: "/artist/upload",
      icon: <Upload size={20} />,
    },
    {
      label: "My Tracks",
      href: "/artist/my-tracks",
      icon: <FileMusic size={20} />,
    },
    {
      label: "Analytics",
      href: "/artist/analytics",
      icon: <BarChart3 size={20} />,
    },
    {
      label: "Profile",
      href: "/artist/profile",
      icon: <User size={20} />,
    },
  ];

  return (
    <div
      ref={containerRef}
      className="h-screen w-full bg-[#0F0F12] border-r border-white/10 flex flex-col py-6 px-4 pb-24 overflow-y-auto"
    >
      
      {/* Navigation oben */}
      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition
                ${active ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Home Link – ganz unten, abgetrennt */}
      <div className="pt-4 border-t border-white/10">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition text-white/60 hover:text-white hover:bg-white/5`}
        >
          <Home size={20} />
          <span>Home</span>
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Music,
  Upload,
  User,
  BarChart3,
  Home,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/logout/action";

const menu = [
  { label: "Dashboard", href: "/artist/dashboard", icon: LayoutDashboard },
  { label: "Your Tracks", href: "/artist/dashboard/tracks", icon: Music },
  { label: "Upload Track", href: "/artist/upload", icon: Upload },
  { label: "Profile", href: "/artist/dashboard/profile", icon: User },
  { label: "Analytics", href: "/artist/dashboard/analytics", icon: BarChart3 },
];

const secondaryMenu = [{ label: "Back to Listener", href: "/dashboard", icon: Home }];

export default function ArtistSidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 bg-[#0E0E10] border-r border-zinc-800 flex flex-col justify-between p-6">
      {/* Main Navigation */}
      <nav className="space-y-1">
        {menu.map((item) => {
          const Icon = item.icon;
          let isActive = false;

          if (item.href === "/artist/dashboard") {
            isActive = pathname === "/artist/dashboard";
          } else {
            isActive = pathname.startsWith(item.href);
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition
                ${
                  isActive
                    ? "bg-zinc-800 text-white border-l-2 border-[#00FFC6]"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }
              `}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-zinc-800 pt-6" />

      {/* Secondary Navigation */}
      <nav className="space-y-1">
        {secondaryMenu.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}

        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition w-full text-left"
          >
            <LogOut size={18} />
            Logout
          </button>
        </form>
      </nav>
    </aside>
  );
}


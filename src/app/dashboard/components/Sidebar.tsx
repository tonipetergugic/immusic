"use client";

import Link from "next/link";
import { Home, Library, PlusCircle, Mic } from "lucide-react";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function Sidebar() {
  const [role, setRole] = useState<string | null>(null);

  // TEMPORARY until we implement real user loading
  // Later: replace with real Supabase user.role load
  useEffect(() => {
    setRole("artist"); // simulate logged-in artist
  }, []);

  return (
    <div className="w-60 h-full bg-[#0B0B0D] border-r border-[#1A1A1C] p-4 flex flex-col gap-2">

      {/* Home */}
      <SidebarItem 
        href="/dashboard"
        icon={<Home size={20} />}
        label="Home"
      />

      {/* Library */}
      <SidebarItem 
        href="/dashboard/library"
        icon={<Library size={20} />}
        label="Library"
      />

      {/* Create */}
      <SidebarItem 
        href="/dashboard/create"
        icon={<PlusCircle size={20} />}
        label="Create"
      />

      {/* Artist (only visible if user is artist) */}
      {role === "artist" && (
        <SidebarItem 
          href="/dashboard/artist"
          icon={<Mic size={20} />}
          label="Artist"
        />
      )}

    </div>
  );
}

/* Reusable component */
function SidebarItem({
  href,
  icon,
  label
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-md text-white hover:bg-[#161619] hover:text-[#00FFC6] transition-colors"
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
}

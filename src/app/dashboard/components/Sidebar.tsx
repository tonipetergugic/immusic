"use client";

import Link from "next/link";
import { Home, Library, PlusCircle, Mic } from "lucide-react";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function Sidebar() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function loadRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (data?.role) setRole(data.role);
    }

    loadRole();
  }, []);

  return (
    <div className="w-60 h-full bg-[#0B0B0D] border-r border-[#1A1A1C] p-4 flex flex-col gap-2">

      <SidebarItem href="/dashboard" icon={<Home size={20} />} label="Home" />
      <SidebarItem href="/dashboard/library" icon={<Library size={20} />} label="Library" />
      <SidebarItem href="/dashboard/create" icon={<PlusCircle size={20} />} label="Create" />

      {/* Artist Bereich */}
      {role === "artist" || role === "admin" ? (
        <SidebarItem href="/artist/dashboard" icon={<Mic size={20} />} label="Artist" />
      ) : (
        <SidebarItem href="/artist/become" icon={<Mic size={20} />} label="Become Artist" />
      )}

    </div>
  );
}

function SidebarItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
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

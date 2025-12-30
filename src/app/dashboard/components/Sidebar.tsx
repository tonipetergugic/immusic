"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Library, PlusCircle, Mic } from "lucide-react";
import { useEffect } from "react";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import { createBrowserClient } from "@supabase/ssr";

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
    <div
      className="
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
      "
    >

      <SidebarItem href="/dashboard" icon={<Home size={20} />} label="Home" />
      <SidebarItem
        href="/dashboard/library"
        icon={<Library size={20} />}
        label="Library"
        matchPrefix
      />
      <SidebarItem
        icon={<PlusCircle size={20} />}
        label="Create Playlist"
        onClick={() => setIsCreateOpen(true)}
      />

      {/* Artist Bereich */}
      {role === "artist" || role === "admin" ? (
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

  const clickHandler =
    onClick ??
    (href
      ? () => {
          router.push(href);
        }
      : undefined);

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

"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Library, PlusCircle, Mic } from "lucide-react";
import { useEffect } from "react";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import { createBrowserClient } from "@supabase/ssr";

export default function Sidebar() {
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
    <div className="w-60 h-full bg-[#0B0B0D] border-r border-[#1A1A1C] p-4 flex flex-col gap-2">

      <SidebarItem href="/dashboard" icon={<Home size={20} />} label="Home" />
      <SidebarItem href="/dashboard/library" icon={<Library size={20} />} label="Library" />
      <div className="relative group">
        <SidebarItem
          icon={<PlusCircle size={20} />}
          label="Create"
          onClick={() => {}}
        />

        {/* Hover Dropdown */}
        <div
          className="
            absolute top-0 left-full ml-4
            hidden group-hover:flex
            flex-col
            bg-[#0B0B0D]
            border border-[#1A1A1C]
            rounded-lg
            shadow-xl
            p-2
            w-48
            z-50
            before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-4 before:content-['']
          "
        >
          <div
            onClick={() => setIsCreateOpen(true)}
            className="
              p-2 rounded-md text-sm text-white
              hover:bg-[#161619] hover:text-[#00FFC6]
              cursor-pointer transition
            "
          >
            Create Playlist
          </div>
        </div>
      </div>

      {/* Artist Bereich */}
      {role === "artist" || role === "admin" ? (
        <SidebarItem href="/artist/dashboard" icon={<Mic size={20} />} label="Artist" />
      ) : (
        <SidebarItem href="/artist/become" icon={<Mic size={20} />} label="Become Artist" />
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
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = href ? pathname.startsWith(href) : false;

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

"use client";

import PlaylistSidebar from "./PlaylistSidebar";

export default function PlaylistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0E0E10] text-white">
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
      <PlaylistSidebar />
    </div>
  );
}


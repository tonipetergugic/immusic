"use client";

import { PlayerProvider } from "@/context/PlayerContext";
import PlayerBar from "@/components/PlayerBar";

export default function ArtistPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <div className="min-h-screen bg-[#0E0E10] text-white flex flex-col">

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>

        {/* Global Player */}
        <div
          className="
            h-24
            fixed bottom-0 left-0 right-0 z-50
            border-t border-[#1A1A1C]
            bg-[#0B0B0D]/80
            backdrop-blur-xl
            shadow-[0_-2px_25px_rgba(0,255,198,0.06)]
            flex items-center
            px-6
          "
        >
          <PlayerBar />
        </div>

      </div>
    </PlayerProvider>
  );
}


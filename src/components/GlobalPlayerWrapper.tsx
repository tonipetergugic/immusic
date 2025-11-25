"use client";

import PlayerBar from "@/components/PlayerBar";
import { PlayerProvider } from "@/context/PlayerContext";

export default function GlobalPlayerWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlayerProvider>
      <div className="min-h-screen pb-24">
        {children}
      </div>

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
    </PlayerProvider>
  );
}


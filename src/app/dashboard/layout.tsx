"use client";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import { PlayerProvider } from "@/context/PlayerContext";
import PlayerBar from "@/components/PlayerBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <div className="flex h-screen w-full bg-[#0E0E10] text-white">

        {/* Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Topbar */}
          <Topbar />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
            <div className="max-w-[1600px] mx-auto w-full">
              {children}
            </div>
          </main>

          {/* PlayerBar */}
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
      </div>
    </PlayerProvider>
  );
}

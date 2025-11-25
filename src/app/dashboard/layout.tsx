"use client";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#0E0E10] text-white overflow-hidden">

      {/* FIX: Sidebar bekommt eine feste Breite */}
      <div className="w-60 shrink-0">
        <Sidebar />
      </div>

      {/* Rechter Bereich */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* FIX: Topbar soll nicht schieben */}
        <div className="shrink-0">
          <Topbar />
        </div>

        {/* Hauptinhalt */}
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}

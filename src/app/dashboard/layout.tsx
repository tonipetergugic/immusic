"use client";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-[#0E0E10] text-white">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="flex flex-col flex-1">

        {/* Topbar */}
        <Topbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}

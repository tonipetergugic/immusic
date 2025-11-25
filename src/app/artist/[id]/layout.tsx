"use client";

export default function ArtistPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0E0E10] text-white flex flex-col">

      {/* Page Content */}
      <div className="flex-1">
        {children}
      </div>

    </div>
  );
}


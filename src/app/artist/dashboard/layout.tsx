import ArtistSidebar from "@/components/ArtistSidebar";

export default function ArtistDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#0E0E10] text-white">
      {/* Sidebar */}
      <ArtistSidebar />

      {/* Page Content */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-5xl mx-auto">{children}</div>
      </div>
    </div>
  );
}


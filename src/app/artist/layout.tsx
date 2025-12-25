import Sidebar from "./components/ArtistSidebar";
import Topbar from "../dashboard/components/Topbar";
import ScrollToTopOnRouteChange from "./components/ScrollToTopOnRouteChange";

export default function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#0E0E10] text-white overflow-hidden">

      {/* Artist Sidebar */}
      <div className="w-60 shrink-0">
        <Sidebar />
      </div>

      {/* Right Content */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Topbar (shared with dashboard) */}
          <div className="sticky top-0 z-50">
            <Topbar />
          </div>

          {/* Padded content */}
          <div className="px-6 py-6 lg:px-10 lg:py-8">
            <div className="max-w-[1600px] mx-auto w-full pb-40 lg:pb-48">
              {children}
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}

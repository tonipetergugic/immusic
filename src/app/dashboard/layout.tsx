import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MobileSidebarDrawer from "./components/MobileSidebarDrawer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#0E0E10] text-white overflow-hidden">

      {/* Sidebar (Desktop only) */}
      <div className="hidden md:block md:w-60 shrink-0">
        <Sidebar />
      </div>

      {/* Right Side */}
      <div className="flex flex-col flex-1 overflow-hidden">

        <div className="shrink-0">
          {/* Mobile menu + Topbar row */}
          <div className="flex items-center gap-3 px-4 pt-4 md:px-0 md:pt-0">
            <MobileSidebarDrawer />
            <div className="flex-1">
              <Topbar />
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
          <div className="max-w-[1600px] mx-auto w-full pb-40 lg:pb-48">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


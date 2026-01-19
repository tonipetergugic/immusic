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

        <header className="shrink-0">
          <div className="flex items-center">
            <div className="md:hidden pl-4">
              <MobileSidebarDrawer />
            </div>
            <div className="flex-1">
              <Topbar />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          <div className="w-full pb-40 lg:pb-48">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


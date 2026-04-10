import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MobileSidebarDrawer from "./components/MobileSidebarDrawer";
import AppShell from "@/components/layout/AppShell";
import HomeScreenInstallHint from "@/components/mobile/HomeScreenInstallHint";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      innerClassName="w-full max-w-[1600px] mx-auto px-3 pb-40 sm:px-4 lg:px-6 lg:pb-48"
      sidebar={
        <>
          {/* Sidebar (Desktop only) */}
          <div className="hidden lg:block lg:w-60 shrink-0">
            <Sidebar />
          </div>
        </>
      }
      header={
        <div className="relative z-50 flex items-center">
          <div className="lg:hidden pl-4">
            <MobileSidebarDrawer />
          </div>
          <div className="flex-1">
            <Topbar />
          </div>
        </div>
      }
    >
      <HomeScreenInstallHint />
      {children}
    </AppShell>
  );
}


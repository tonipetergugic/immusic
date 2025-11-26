import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#0E0E10] text-white overflow-hidden">

      {/* Sidebar (Client Component, aber Layout bleibt Server) */}
      <div className="w-60 shrink-0">
        <Sidebar />
      </div>

      {/* Right Side */}
      <div className="flex flex-col flex-1 overflow-hidden">

        <div className="shrink-0">
          <Topbar />
        </div>

        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
          <div className="max-w-[1600px] mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}


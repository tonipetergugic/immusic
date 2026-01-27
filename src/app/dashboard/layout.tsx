import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MobileSidebarDrawer from "./components/MobileSidebarDrawer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let topbarProps: {
    userEmail: string | null;
    displayName: string | null;
    role: string | null;
    avatarUrl: string | null;
    avatarUpdatedAt: string | null;
  } = {
    userEmail: user?.email ?? null,
    displayName: null,
    role: null,
    avatarUrl: null,
    avatarUpdatedAt: null,
  };

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name, avatar_url, updated_at")
      .eq("id", user.id)
      .single();

    topbarProps = {
      userEmail: user.email ?? null,
      displayName: profile?.display_name ?? null,
      role: profile?.role ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      avatarUpdatedAt: profile?.updated_at ?? null,
    };
  }

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
              <Topbar
                userEmail={topbarProps.userEmail}
                displayName={topbarProps.displayName}
                role={topbarProps.role}
                avatarUrl={topbarProps.avatarUrl}
                avatarUpdatedAt={topbarProps.avatarUpdatedAt}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-0 pb-4 sm:px-4 sm:pb-6 lg:px-8 lg:pb-8">
          <div className="w-full pb-40 lg:pb-48">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


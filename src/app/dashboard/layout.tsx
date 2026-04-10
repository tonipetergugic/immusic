import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MobileSidebarDrawer from "./components/MobileSidebarDrawer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";
import HomeScreenInstallHint from "@/components/mobile/HomeScreenInstallHint";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const layoutStart = Date.now();
  const logStep = (label: string, startedAt: number) => {
    console.log(`[dashboard-layout-ssr] ${label}: ${Date.now() - startedAt}ms`);
  };

  const supabase = await createSupabaseServerClient();

  const getUserStart = Date.now();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  logStep("auth.getUser", getUserStart);

  const profileFetchStart = Date.now();
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

  logStep("profile lookup", profileFetchStart);
  logStep("dashboard layout total", layoutStart);

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
            <Topbar
              userEmail={topbarProps.userEmail}
              displayName={topbarProps.displayName}
              role={topbarProps.role}
              avatarUrl={topbarProps.avatarUrl}
              avatarUpdatedAt={topbarProps.avatarUpdatedAt}
            />
          </div>
        </div>
      }
    >
      <HomeScreenInstallHint />
      {children}
    </AppShell>
  );
}


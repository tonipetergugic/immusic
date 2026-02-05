import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MobileSidebarDrawer from "./components/MobileSidebarDrawer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";

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
    <AppShell
      sidebar={
        <>
          {/* Sidebar (Desktop only) */}
          <div className="hidden lg:block lg:w-60 shrink-0">
            <Sidebar />
          </div>
        </>
      }
      header={
        <div className="flex items-center">
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
      {children}
    </AppShell>
  );
}


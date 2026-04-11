import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MobileSidebarDrawer from "./components/MobileSidebarDrawer";
import AppShell from "@/components/layout/AppShell";
import HomeScreenInstallHint from "@/components/mobile/HomeScreenInstallHint";
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
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role, display_name, avatar_url, avatar_path, avatar_preview_path, updated_at")
      .eq("id", user.id)
      .single();

    const preferredAvatarPath =
      profileRow?.avatar_preview_path ?? profileRow?.avatar_path ?? null;

    const topbarAvatarUrl = preferredAvatarPath
      ? supabase.storage.from("avatars").getPublicUrl(preferredAvatarPath).data.publicUrl ??
        profileRow?.avatar_url ??
        null
      : profileRow?.avatar_url ?? null;

    topbarProps = {
      userEmail: user.email ?? null,
      displayName: profileRow?.display_name ?? null,
      role: profileRow?.role ?? null,
      avatarUrl: topbarAvatarUrl,
      avatarUpdatedAt: profileRow?.updated_at ?? null,
    };
  }

  return (
    <AppShell
      innerClassName="w-full max-w-[1600px] mx-auto px-3 pb-40 sm:px-4 lg:px-6 lg:pb-48"
      sidebar={
        <>
          {/* Sidebar (Desktop only) */}
          <div className="hidden lg:block lg:w-60 shrink-0">
            <Sidebar role={topbarProps.role} />
          </div>
        </>
      }
      header={
        <div className="relative z-50 flex items-center">
          <div className="lg:hidden pl-4">
            <MobileSidebarDrawer role={topbarProps.role} />
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

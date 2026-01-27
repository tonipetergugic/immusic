import Sidebar from "./components/ArtistSidebar";
import Topbar from "../dashboard/components/Topbar";
import ScrollToTopOnRouteChange from "./components/ScrollToTopOnRouteChange";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ArtistLayout({
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
    artistOnboardingStatus: string | null;
  } = {
    userEmail: user?.email ?? null,
    displayName: null,
    role: null,
    avatarUrl: null,
    avatarUpdatedAt: null,
    artistOnboardingStatus: null,
  };

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name, avatar_url, updated_at, artist_onboarding_status")
      .eq("id", user.id)
      .single();

    topbarProps = {
      userEmail: user.email ?? null,
      displayName: profile?.display_name ?? null,
      role: profile?.role ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      avatarUpdatedAt: profile?.updated_at ?? null,
      artistOnboardingStatus: profile?.artist_onboarding_status ?? null,
    };
  }

  return (
    <div className="flex h-screen w-full bg-[#0E0E10] text-white overflow-hidden">

      {/* Artist Sidebar */}
      <div className="w-60 shrink-0">
        <Sidebar
          role={topbarProps.role}
          artistOnboardingStatus={topbarProps.artistOnboardingStatus}
        />
      </div>

      {/* Right Content */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Topbar (shared with dashboard) */}
          <div className="sticky top-0 z-50">
            <Topbar
              userEmail={topbarProps.userEmail}
              displayName={topbarProps.displayName}
              role={topbarProps.role}
              avatarUrl={topbarProps.avatarUrl}
              avatarUpdatedAt={topbarProps.avatarUpdatedAt}
            />
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

import Sidebar from "./components/ArtistSidebar";
import Topbar from "../dashboard/components/Topbar";
import ScrollToTopOnRouteChange from "./components/ScrollToTopOnRouteChange";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArtistProfileProvider } from "@/app/artist/_components/ArtistProfileProvider";
import AppShell from "@/components/layout/AppShell";

export default async function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile:
    | {
        display_name: string | null;
        banner_url: string | null;
        artist_onboarding_status: string | null;
      }
    | null = null;

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
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role, display_name, avatar_url, banner_url, updated_at, artist_onboarding_status")
      .eq("id", user.id)
      .single();

    profile = profileRow
      ? {
          display_name: profileRow.display_name ?? null,
          banner_url: profileRow.banner_url ?? null,
          artist_onboarding_status: profileRow.artist_onboarding_status ?? null,
        }
      : null;

    topbarProps = {
      userEmail: user.email ?? null,
      displayName: profileRow?.display_name ?? null,
      role: profileRow?.role ?? null,
      avatarUrl: profileRow?.avatar_url ?? null,
      avatarUpdatedAt: profileRow?.updated_at ?? null,
      artistOnboardingStatus: profileRow?.artist_onboarding_status ?? null,
    };
  }

  return (
    <AppShell
      sidebar={
        <div className="w-60 shrink-0">
          <Sidebar
            role={topbarProps.role}
            artistOnboardingStatus={topbarProps.artistOnboardingStatus}
          />
        </div>
      }
      header={
        <div className="sticky top-0 z-50">
          <Topbar
            userEmail={topbarProps.userEmail}
            displayName={topbarProps.displayName}
            role={topbarProps.role}
            avatarUrl={topbarProps.avatarUrl}
            avatarUpdatedAt={topbarProps.avatarUpdatedAt}
          />
        </div>
      }
      mainClassName="flex-1 overflow-y-auto overflow-x-hidden"
      innerClassName="w-full max-w-[1600px] mx-auto px-3 pt-6 pb-40 sm:px-4 sm:pt-8 lg:px-6 lg:pb-48"
    >
      <ArtistProfileProvider
        value={{
          displayName: profile?.display_name ?? null,
          bannerUrl: profile?.banner_url ?? null,
          artistOnboardingStatus: profile?.artist_onboarding_status ?? null,
        }}
      >
        {children}
      </ArtistProfileProvider>
    </AppShell>
  );
}

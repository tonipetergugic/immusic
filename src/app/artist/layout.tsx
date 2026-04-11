import Sidebar from "./components/ArtistSidebar";
import Topbar from "../dashboard/components/Topbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCachedServerUser } from "@/lib/supabase/getCachedServerUser";
import { ArtistProfileProvider } from "@/app/artist/_components/ArtistProfileProvider";
import AppShell from "@/components/layout/AppShell";

export default async function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const user = await getCachedServerUser();

  let profile:
      | {
          display_name: string | null;
          banner_url: string | null;
          banner_path: string | null;
          banner_pos_y: number | null;
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
      .select(
        "role, display_name, avatar_url, avatar_path, avatar_preview_path, banner_url, banner_path, banner_pos_y, updated_at, artist_onboarding_status"
      )
      .eq("id", user.id)
      .single();

    const preferredAvatarPath =
      profileRow?.avatar_preview_path ?? profileRow?.avatar_path ?? null;

    const topbarAvatarUrl = preferredAvatarPath
      ? supabase.storage.from("avatars").getPublicUrl(preferredAvatarPath).data.publicUrl ??
        profileRow?.avatar_url ??
        null
      : profileRow?.avatar_url ?? null;

    const artistBannerUrl = profileRow?.banner_path
      ? supabase.storage.from("profile-banners").getPublicUrl(profileRow.banner_path).data
          .publicUrl ?? profileRow?.banner_url ?? null
      : profileRow?.banner_url ?? null;

    profile = profileRow
      ? {
          display_name: profileRow.display_name ?? null,
          banner_url: artistBannerUrl,
          banner_path: profileRow.banner_path ?? null,
          banner_pos_y: profileRow.banner_pos_y ?? 50,
          artist_onboarding_status: profileRow.artist_onboarding_status ?? null,
        }
      : null;

    topbarProps = {
      userEmail: user.email ?? null,
      displayName: profileRow?.display_name ?? null,
      role: profileRow?.role ?? null,
      avatarUrl: topbarAvatarUrl,
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
          bannerPosY: profile?.banner_pos_y ?? 50,
          artistOnboardingStatus: profile?.artist_onboarding_status ?? null,
        }}
      >
        {children}
      </ArtistProfileProvider>
    </AppShell>
  );
}

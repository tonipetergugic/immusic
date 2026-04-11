export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { ImageIcon, User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateArtistProfileAction } from "./actions";
import BannerUpload from "./BannerUpload";
import ProfileForm from "./ProfileForm";
import ProfileSuccessToast from "./ProfileSuccessToast";

type ProfileRow = {
  id: string;
  display_name: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  x: string | null;
  banner_url: string | null;
  banner_path: string | null;
  banner_pos_y: number | null;
};

export default async function ArtistProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, country, city, bio, instagram, tiktok, facebook, x, banner_url, banner_path, banner_pos_y"
    )
    .eq("id", user.id)
    .single<ProfileRow>();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new Error("Profile not found");
  }

  const resolvedBannerUrl = profile.banner_path
    ? supabase.storage.from("profile-banners").getPublicUrl(profile.banner_path).data
        .publicUrl ?? profile.banner_url ?? null
    : profile.banner_url ?? null;

  const params = await searchParams;
  const successMessage =
    params?.success === "1"
      ? "Profile saved"
      : params?.["banner-updated"] === "1"
        ? "Banner updated"
        : params?.["banner-deleted"] === "1"
          ? "Banner deleted"
          : null;

  return (
    <div className="w-full text-white">
      <div className="mx-auto w-full max-w-[920px] space-y-10">
        <div className="border-b border-white/10 pb-8">
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-white">
            <User className="h-7 w-7 text-[#00FFC6]" />
            Artist profile
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-[#B3B3B3]">
            Update your public artist page details.
          </p>
        </div>

        {successMessage ? <ProfileSuccessToast message={successMessage} /> : null}

        <section className="border-b border-white/10 pb-10">
          <div>
            <div className="flex items-center gap-3">
              <ImageIcon className="h-5 w-5 text-[#00FFC6]" />
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Banner
              </h2>
            </div>
            <p className="mt-2 text-sm text-[#B3B3B3]">
              This image appears at the top of your public artist page.
            </p>
          </div>

          <div className="mt-6">
            <BannerUpload
              userId={profile.id}
              currentBannerUrl={resolvedBannerUrl}
              currentBannerPosY={
                Number.isFinite(profile.banner_pos_y)
                  ? (profile.banner_pos_y as number)
                  : 50
              }
            />
          </div>
        </section>

        <ProfileForm
          profile={profile}
          updateAction={updateArtistProfileAction}
        />
      </div>
    </div>
  );
}


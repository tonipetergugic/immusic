export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateArtistProfileAction } from "./actions";
import BannerUpload from "./BannerUpload";
import ProfileForm from "./ProfileForm";
import ProfileSuccessToast from "./ProfileSuccessToast";

type ProfileRow = {
  id: string;
  role: string | null;
  display_name: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  x: string | null;
  banner_url: string | null;
  banner_pos_y: number | null;
  collecting_society_member: boolean | null;
  collecting_society_name: string | null;
  collecting_society_number: string | null;
};

export default async function ArtistProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, role, display_name, country, city, bio, instagram, tiktok, facebook, x, banner_url, banner_pos_y, collecting_society_member, collecting_society_name, collecting_society_number"
    )
    .eq("id", user.id)
    .single<ProfileRow>();

  if (!profile) {
    throw new Error("Profile not found");
  }

  const needsCollectingSocietyConfirmation =
    profile.role === "artist" &&
    profile.collecting_society_member === null;

  const params = await searchParams;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8 relative">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[700px] rounded-full bg-[#00FFC6]/10 blur-3xl" />
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-white">
            <User className="h-7 w-7 text-[#00FFC6]" />
            Artist profile
          </h1>
          <p className="text-sm text-[#B3B3B3] mt-1">
            Update your public artist page details.
          </p>
        </div>
      </div>
      {needsCollectingSocietyConfirmation && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-amber-200">
            Action required: Collecting society status
          </p>
          <p className="text-sm text-[#B3B3B3] mt-1">
            Please confirm whether you are a member of a collecting society.
            This information is required for rights clarity, but does not block
            uploads or releases.
          </p>
          <p className="text-xs text-[#B3B3B3] mt-2">
            Once confirmed, you will not be asked again.
          </p>
        </div>
      )}
      {params?.success === "1" && <ProfileSuccessToast />}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/90">Banner</p>
            <p className="text-xs text-[#B3B3B3] mt-1">
              This image appears at the top of your public artist page.
            </p>
          </div>

        </div>

      <div className="mt-4">
        <BannerUpload
          userId={profile.id}
          currentBannerUrl={profile.banner_url}
          currentBannerPosY={Number.isFinite(profile.banner_pos_y) ? (profile.banner_pos_y as number) : 50}
        />
      </div>
      </div>
      <ProfileForm profile={profile} updateAction={updateArtistProfileAction} />
    </div>
  );
}


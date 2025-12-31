export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateArtistProfileAction } from "./actions";
import BannerUpload from "./BannerUpload";
import ProfileForm from "./ProfileForm";
import ProfileSuccessToast from "./ProfileSuccessToast";

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
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("Profile not found");
  }

  const needsCollectingSocietyConfirmation =
    profile.role === "artist" &&
    profile.collecting_society_member === null;

  const params = await searchParams;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Artist profile</h1>
          <p className="text-sm text-[#B3B3B3] mt-1">
            Update your public artist page details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[#B3B3B3]">
            UI: Live
          </span>
          <span className="text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[#B3B3B3]">
            Preview later
          </span>
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
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/90">Banner</p>
            <p className="text-xs text-[#B3B3B3] mt-1">
              This image appears at the top of your public artist page.
            </p>
          </div>

          <span className="text-xs px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-[#B3B3B3]">
            Recommended: 1600×400
          </span>
        </div>

        <div className="mt-4">
          <BannerUpload userId={profile.id} currentBannerUrl={profile.banner_url} />
        </div>
      </div>
      <ProfileForm profile={profile} updateAction={updateArtistProfileAction} />
    </div>
  );
}


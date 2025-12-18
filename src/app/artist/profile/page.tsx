export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateArtistProfileAction } from "./actions";
import BannerUpload from "./BannerUpload";

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

  const params = await searchParams;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <h1 className="text-2xl font-semibold text-white">
        Artist Profile Settings
      </h1>
      <p className="text-sm text-white/60">
        Update your public artist profile information.
      </p>
      {params?.success === "1" && (
        <div className="rounded-lg border border-[#00FFC6]/30 bg-[#00FFC6]/10 px-4 py-3 text-sm text-[#00FFC6]">
          Profile saved successfully!
        </div>
      )}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold text-white/80 mb-3">Banner</h2>
        <BannerUpload userId={profile.id} currentBannerUrl={profile.banner_url} />
      </div>
      <form
        action={updateArtistProfileAction}
        className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-6"
      >
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="display_name"
            className="text-sm font-medium text-white/80"
          >
            Display Name
          </label>
          <input
            id="display_name"
            type="text"
            name="display_name"
            defaultValue={profile.display_name ?? ""}
            className="bg-[#1a1a1d] border border-[#333] rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/50 focus:border-[#00FFC6]/50"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label htmlFor="bio" className="text-sm font-medium text-white/80">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={5}
            defaultValue={profile.bio ?? ""}
            className="bg-[#1a1a1d] border border-[#333] rounded-lg p-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/50 focus:border-[#00FFC6]/50"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="location"
            className="text-sm font-medium text-white/80"
          >
            Location
          </label>
          <input
            id="location"
            type="text"
            name="location"
            defaultValue={profile.location ?? ""}
            className="bg-[#1a1a1d] border border-[#333] rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/50 focus:border-[#00FFC6]/50"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="instagram"
            className="text-sm font-medium text-white/80"
          >
            Instagram
          </label>
          <input
            id="instagram"
            type="text"
            name="instagram"
            defaultValue={profile.instagram ?? ""}
            placeholder="https://instagram.com/yourname"
            className="bg-[#1a1a1d] border border-[#333] rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/50 focus:border-[#00FFC6]/50"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label htmlFor="tiktok" className="text-sm font-medium text-white/80">
            TikTok
          </label>
          <input
            id="tiktok"
            type="text"
            name="tiktok"
            defaultValue={profile.tiktok ?? ""}
            placeholder="https://tiktok.com/@yourname"
            className="bg-[#1a1a1d] border border-[#333] rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/50 focus:border-[#00FFC6]/50"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="facebook"
            className="text-sm font-medium text-white/80"
          >
            Facebook
          </label>
          <input
            id="facebook"
            type="text"
            name="facebook"
            defaultValue={profile.facebook ?? ""}
            placeholder="https://facebook.com/yourpage"
            className="bg-[#1a1a1d] border border-[#333] rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/50 focus:border-[#00FFC6]/50"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label htmlFor="x" className="text-sm font-medium text-white/80">
            X
          </label>
          <input
            id="x"
            type="text"
            name="x"
            defaultValue={profile.x ?? ""}
            placeholder="https://x.com/yourhandle"
            className="bg-[#1a1a1d] border border-[#333] rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/50 focus:border-[#00FFC6]/50"
          />
        </div>
        <div>
          <button
            type="submit"
            className="bg-[#00FFC6] hover:bg-[#00E0B0] text-black font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/60 focus:ring-offset-2 focus:ring-offset-black"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}


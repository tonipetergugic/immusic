import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmBecomeArtistAction } from "./actions";

export default async function ArtistOnboardingPage() {
  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) redirect("/login");

  const { data, error: pErr } = await supabase
    .from("profiles")
    .select("role, artist_onboarding_status")
    .eq("id", authData.user.id)
    .single();

  if (pErr || !data) {
    throw new Error(`ONBOARDING_PROFILE_LOAD_ERROR: ${pErr?.message ?? "no profile"}`);
  }

  // NOTE: supabase types are currently outdated (artist_onboarding_status missing in src/types/supabase.ts).
  // We keep this cast local & minimal to avoid spreading "any" across the codebase.
  const profile = data as unknown as {
    role: "listener" | "artist" | "admin";
    artist_onboarding_status: string | null;
  };

  // Already an artist → onboarding is irrelevant
  if (profile.role === "artist") redirect("/artist/dashboard");

  // Already started onboarding → go straight to upload
  if (profile.artist_onboarding_status === "pending_upload") redirect("/artist/upload");

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold mb-3">Become an Artist</h1>
      <p className="text-[#B3B3B3] mb-6 leading-relaxed">
        As an artist, you can upload tracks and releases to ImMusic. Your first upload will be reviewed by our AI.
        If approved, your account will automatically be upgraded to an Artist account.
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6">
        <ul className="list-disc pl-5 space-y-2 text-sm text-[#B3B3B3]">
          <li>Your first track will be uploaded now.</li>
          <li>AI review status: pending → approved / rejected.</li>
          <li>After approval, you become an Artist automatically.</li>
        </ul>
      </div>

      <form action={confirmBecomeArtistAction}>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-[#00FFC6] text-black font-medium px-5 py-2.5 hover:bg-[#00E0B0] transition"
        >
          Yes, I want to become an Artist
        </button>
      </form>
    </div>
  );
}

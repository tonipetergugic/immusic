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
    <div className="relative">
      {/* Full-bleed background layer (like landing page) */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url('/artist-onboarding-hero.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* cinematic overlay + vignette */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/55 to-black/80" />
        <div className="absolute inset-0 [box-shadow:inset_0_0_340px_rgba(0,0,0,0.95)]" />
      </div>

      {/* Content (compact, centered, no banner/card) */}
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
          Become an Artist
        </h1>

        <p className="mt-5 max-w-4xl text-base md:text-xl leading-relaxed text-white/75">
          Upload your tracks and releases to ImMusic from a desktop computer.
          Your first upload will be reviewed by our AI. Upon approval, your account
          will be upgraded to an Artist account.
        </p>

        <ul className="mt-8 list-disc pl-6 space-y-3 text-sm md:text-lg text-white/70">
          <li>Upload and AI-powered review only available on desktop.</li>
          <li>Your first track will be reviewed: pending → approved / rejected.</li>
          <li>Upon approval, you become an Artist automatically.</li>
        </ul>

        <form action={confirmBecomeArtistAction} className="mt-14">
          <button
            type="submit"
            className="
              inline-flex items-center justify-center
              rounded-2xl px-10 py-4
              text-sm md:text-lg font-semibold
              text-[#00FFC6]
              bg-black/30 backdrop-blur-md
              border border-[#00FFC6]/60
              shadow-[0_0_0_1px_rgba(0,255,198,0.20),0_0_40px_rgba(0,255,198,0.25),0_0_90px_rgba(0,255,198,0.12)]
              hover:bg-black/40 hover:border-[#00FFC6]/80
              transition
              cursor-pointer
            "
          >
            Yes, I want to become an Artist
          </button>
        </form>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmBecomeArtistAction } from "./actions";

type OnboardingProfile = {
  role: "listener" | "artist" | "admin";
  artist_onboarding_status: string | null;
};

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
  // Keep the cast local to this page until the generated types are updated.
  const profile = data as unknown as OnboardingProfile;

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
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-6xl items-start justify-center px-6 py-16 md:py-20 lg:items-center">
        <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
          Become an <span className="text-[#00FFC6]">Artist</span>
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-8 text-white/78 md:text-lg">
          Upload your music to ImMusic from a desktop computer.
          Your first track will be reviewed by our AI. Once approved, your account will
          automatically unlock the Artist dashboard.
        </p>

        <ul className="mt-7 list-disc space-y-3 pl-6 text-sm text-white/78 md:text-base">
          <li>Upload and AI-powered review only available on desktop.</li>
          <li>Your first track will be reviewed: pending → approved / rejected.</li>
          <li>Upon approval, you become an Artist automatically.</li>
        </ul>

        <form action={confirmBecomeArtistAction} className="mt-10 md:mt-12">
          <button
            type="submit"
            className="
              inline-flex items-center justify-center
              rounded-2xl px-10 py-4 md:px-12 md:py-4.5
              text-sm font-semibold md:text-lg
              text-[#00FFC6]
              bg-black/35 backdrop-blur-md
              border border-[#00FFC6]/60
              shadow-none
              hover:bg-black/45 hover:border-[#00FFC6]/90 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.35),0_0_40px_rgba(0,255,198,0.35),0_0_80px_rgba(0,255,198,0.2)]
              transition
              cursor-pointer
            "
          >
            Yes, I want to become an Artist
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}

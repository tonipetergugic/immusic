import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import UploadForm from "./UploadForm";

export default async function ArtistUploadPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Wenn kein User eingeloggt → zurück zum Login
  if (!user) {
    redirect("/login");
  }

  // Profil mit Rolle laden
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  // Falls es Probleme mit dem Profil gibt → zurück zum Dashboard
  if (error || !profile) {
    redirect("/dashboard");
  }

  // Nur Artists dürfen hier bleiben
  if (profile.role !== "artist" && profile.role !== "admin") {
    // Optional: später eigene Seite bauen: "Werde Artist" etc.
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen px-8 py-10 text-white bg-[#0E0E10]">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Upload a new track
        </h1>
        <p className="text-sm text-neutral-400 mb-8">
          Upload your track and cover image to ImMusic.
        </p>

        <Link
          href="/artist/dashboard"
          className="flex items-center gap-2 text-zinc-400 hover:text-[#00FFC6] transition mb-8"
        >
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </Link>

        <section className="rounded-xl bg-[#1A1A1A] p-8 mb-12 space-y-6">
          <UploadForm />
        </section>
      </div>
    </div>
  );
}

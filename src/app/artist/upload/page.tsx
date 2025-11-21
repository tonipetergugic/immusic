import { redirect } from "next/navigation";
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
    <div className="min-h-[calc(100vh-80px)] px-6 py-8 text-white bg-[#0E0E10]">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">
          Upload a new track
        </h1>
        <p className="text-sm text-zinc-400 mb-6">
          Only artists can upload tracks on ImMusic.
        </p>

        {/* Hier kommt im nächsten Schritt das UploadForm hin */}
        <UploadForm />
      </div>
    </div>
  );
}

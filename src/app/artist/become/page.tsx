import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BecomeArtistForm } from "./BecomeArtistForm";

export default async function BecomeArtistPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Schon Artist → Dashboard
  if (profile?.role === "artist" || profile?.role === "admin") {
    redirect("/artist/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] p-8 text-white max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Apply as Artist</h1>
      <p className="text-zinc-400 mb-6">
        Fill out this short form. Your application will be reviewed by an admin.
      </p>

      <BecomeArtistForm userId={user.id} />
    </div>
  );
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProcessingClient from "./ProcessingClient";

export default async function ProcessingPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0E10] text-white">
        <p className="text-white/70">Not authenticated.</p>
      </div>
    );
  }

  const { data: creditsRow, error: creditsErr } = await supabase
    .from("artist_credits")
    .select("balance")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (creditsErr) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0E10] text-white">
        <p className="text-white/70">Failed to load credits.</p>
      </div>
    );
  }

  const credits = typeof creditsRow?.balance === "number" ? creditsRow.balance : 0;

  return <ProcessingClient credits={credits} />;
}

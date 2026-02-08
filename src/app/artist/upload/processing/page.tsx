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

  return <ProcessingClient />;
}

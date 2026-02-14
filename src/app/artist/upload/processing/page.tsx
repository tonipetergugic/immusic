import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProcessingClient from "./ProcessingClient";

export default async function ProcessingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  const sp = await searchParams;
  const queueIdRaw = sp?.queue_id;
  const queueId = (Array.isArray(queueIdRaw) ? queueIdRaw[0] : queueIdRaw ?? "").trim();

  if (!queueId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0E10] text-white">
        <p className="text-white/70">Missing queue_id.</p>
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

  return <ProcessingClient credits={credits} queueId={queueId} />;
}

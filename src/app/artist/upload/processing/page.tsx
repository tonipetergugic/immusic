import { createSupabaseServerClient } from "@/lib/supabase/server";
import { processQueuedTrack, rejectQueueItemAction } from "./actions";

export default async function ProcessingPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // gleiche UX wie vorher: Seite lädt nicht für anon
    // (optional später redirect)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0E10] text-white">
        <p className="text-white/70">Not authenticated.</p>
      </div>
    );
  }

  // NUR den neuesten Queue-Eintrag DES Users (nicht global!)
  const { data: queueItem } = await supabase
    .from("tracks_ai_queue")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0E10] text-white">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">Processing your track</h1>
        <p className="text-white/60">This may take a moment...</p>
      </div>

      {queueItem && (
        <>
          <div className="flex items-center gap-4">
            <form
              action={async () => {
                "use server";
                await processQueuedTrack(queueItem.id, "approve");
              }}
            >
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
              >
                Approve Track
              </button>
            </form>

            <form action={rejectQueueItemAction}>
              <input type="hidden" name="queue_id" value={queueItem.id} />
              <input
                type="hidden"
                name="message"
                value="Rejected by reviewer"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium"
              >
                Reject
              </button>
            </form>
          </div>

          {queueItem.status === "rejected" && (
            <p className="text-red-500 font-medium mt-2">
              Rejected: {queueItem.message ?? "No reason provided"}
            </p>
          )}
        </>
      )}
    </div>
  );
}

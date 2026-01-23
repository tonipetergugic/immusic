import { createSupabaseServerClient } from "@/lib/supabase/server";
import { respondToInviteAction } from "./actions";

type InviteRow = {
  id: string;
  role: "CO_OWNER" | "FEATURED";
  status: "pending" | "accepted" | "rejected" | "revoked";
  inviter_display_name: string | null;
  created_at: string;
  expires_at: string;
  track: {
    id: string;
    title: string;
    version: string | null;
  } | null;
};

export default async function ArtistInvitesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Not authenticated.");
  }

  const { data, error } = await supabase
    .from("track_collaboration_invites")
    .select(
      "id,role,status,inviter_display_name,created_at,expires_at,track:track_id(id,title,version)"
    )
    .eq("invitee_profile_id", authData.user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load invites.");
  }

  const invites: InviteRow[] = (data ?? []).map((row: any) => ({
    ...row,
    track: Array.isArray(row.track) ? (row.track[0] ?? null) : (row.track ?? null),
  }));

  return (
    <div className="mx-auto max-w-[900px] px-6 py-10">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.12em] text-white/60">
          Inbox
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
          Messages
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Personal notifications and collaboration requests.
        </p>
      </div>

      {invites.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/70">
          No new messages.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white/90">
                    Track collaboration invite
                  </div>
                  <div className="mt-1 text-sm text-white/70">
                    From{" "}
                    <span className="text-white/90 font-medium">
                      {inv.inviter_display_name ?? "Unknown artist"}
                    </span>{" "}
                    • Role{" "}
                    <span className="text-white/90 font-medium">
                      {inv.role === "CO_OWNER" ? "Co-owner" : "Featured"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    Track:{" "}
                    <span className="text-white/80">
                      {inv.track?.title ?? "Unknown track"}
                      {inv.track?.version ? ` (${inv.track.version})` : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await respondToInviteAction({
                        inviteId: inv.id,
                        action: "rejected",
                      });
                    }}
                  >
                    <button
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.05]"
                      type="submit"
                    >
                      Reject
                    </button>
                  </form>

                  <form
                    action={async () => {
                      "use server";
                      await respondToInviteAction({
                        inviteId: inv.id,
                        action: "accepted",
                      });
                    }}
                  >
                    <button
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/[0.10] hover:border-[#00FFC6]/60"
                      type="submit"
                    >
                      Accept
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-3 text-xs text-white/50">
                Created: {new Date(inv.created_at).toLocaleString()} • Expires:{" "}
                {new Date(inv.expires_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


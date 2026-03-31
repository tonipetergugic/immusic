import { createSupabaseServerClient } from "@/lib/supabase/server";
import { respondToInviteAction } from "./actions";
import { formatTrackTitle } from "@/lib/formatTrackTitle";
import ProfileSectionLayout from "@/components/ProfileSectionLayout";

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

type ArtistInvitesPageProps = {
  showBackLink?: boolean;
};

export default async function ArtistInvitesPage({
  showBackLink = false,
}: ArtistInvitesPageProps) {
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
    <ProfileSectionLayout
      title="Messages"
      description="Personal notifications and collaboration requests."
      current="messages"
      showBackLink={showBackLink}
    >
            {invites.length === 0 ? (
              <div className="py-6 text-sm text-[#B3B3B3]">
                No new messages.
              </div>
            ) : (
          <div className="flex flex-col gap-3">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <h2 className="text-[18px] font-semibold text-white">
                      Track <span className="text-[#00FFC6]">collaboration</span> invite
                    </h2>
                    <div className="mt-2 text-sm text-white/70">
                      From{" "}
                      <span className="text-white/90 font-medium">
                        {inv.inviter_display_name ?? "Unknown artist"}
                      </span>{" "}
                      • Role{" "}
                      <span className="text-white/90 font-medium">
                        {inv.role === "CO_OWNER" ? "Co-owner" : "Featured"}
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] text-white/65">
                      Track: {formatTrackTitle(inv.track?.title, (inv.track as any)?.version)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
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
                        className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.05]"
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
                        className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.10] hover:border-[#00FFC6]/60"
                        type="submit"
                      >
                        Accept
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-5 text-xs text-white/50">
                  Created: {new Date(inv.created_at).toLocaleString()} • Expires:{" "}
                  {new Date(inv.expires_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
            )}
    </ProfileSectionLayout>
  );
}


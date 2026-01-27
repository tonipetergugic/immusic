"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function respondToInviteAction(args: {
  inviteId: string;
  action: "accepted" | "rejected";
}) {
  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Not authenticated.");
  }

  const { error } = await supabase
    .from("track_collaboration_invites")
    .update({ status: args.action })
    .eq("id", args.inviteId)
    .eq("invitee_profile_id", authData.user.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to respond: ${error.message}`);
  }

  revalidatePath("/artist/invites");
}


"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RenameTrackPayload = {
  title: string;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  has_lyrics: boolean;
  is_explicit: boolean;
  version?: string | null;
};

export type TrackCollabRole = "CO_OWNER" | "FEATURED";

export async function inviteTrackCollaboratorAction(args: {
  trackId: string;
  inviteeProfileId: string;
  role: TrackCollabRole;
  message?: string | null;
}) {
  const supabase = await createSupabaseServerClient();

  // current user
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Not authenticated.");
  }
  const inviterId = authData.user.id;

  // load display_name snapshots (optional but clean)
  const [
    { data: inviterProfile, error: inviterProfileErr },
    { data: inviteeProfile, error: inviteeProfileErr },
  ] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", inviterId).single(),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", args.inviteeProfileId)
      .single(),
  ]);

  if (inviterProfileErr) {
    throw new Error("Failed to load inviter profile.");
  }
  if (inviteeProfileErr) {
    throw new Error("Failed to load invitee profile.");
  }

  // Insert invite (RLS enforces: inviter must be PRIMARY of track)
  const { error } = await supabase.from("track_collaboration_invites").insert({
    track_id: args.trackId,
    inviter_profile_id: inviterId,
    invitee_profile_id: args.inviteeProfileId,
    role: args.role,
    status: "pending",
    message: args.message ?? null,
    inviter_display_name: inviterProfile?.display_name ?? null,
    invitee_display_name: inviteeProfile?.display_name ?? null,
  });

  if (error) {
    throw new Error(`Failed to create invite: ${error.message}`);
  }

  revalidatePath("/artist/my-tracks");
}

export async function deleteTrackAction(trackId: string, audioPath: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error: dbError } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId)
    .eq("artist_id", user.id);

  if (dbError) {
    throw new Error("Failed to delete track");
  }

  if (audioPath) {
    await supabase.storage.from("tracks").remove([audioPath]);
  }

  revalidatePath("/artist/my-tracks");
}

export async function renameTrackAction(
  trackId: string,
  payload: RenameTrackPayload
) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("tracks")
    .update({
      title: payload.title,
      bpm: payload.bpm,
      key: payload.key,
      genre: payload.genre,
      has_lyrics: payload.has_lyrics,
      is_explicit: payload.is_explicit,
      version: payload.version && payload.version.trim() !== "" ? payload.version.trim() : null,
    })
    .eq("id", trackId)
    .eq("artist_id", user.id);

  if (error) {
    throw new Error("Failed to rename track");
  }

  revalidatePath("/artist/my-tracks");
}


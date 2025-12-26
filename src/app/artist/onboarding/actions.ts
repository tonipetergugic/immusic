"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function confirmBecomeArtistAction() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Setze pending_upload + requested_at (requested_at nur wenn noch leer)
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("artist_requested_at")
    .eq("id", user.id)
    .single();

  if (pErr || !profile) {
    throw new Error(`ONBOARDING_PROFILE_LOAD_ERROR: ${pErr?.message ?? "no profile"}`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      artist_onboarding_status: "pending_upload",
      artist_requested_at: profile.artist_requested_at ?? new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(`ONBOARDING_CONFIRM_ERROR: ${error.message}`);
  }

  redirect("/artist/upload");
}


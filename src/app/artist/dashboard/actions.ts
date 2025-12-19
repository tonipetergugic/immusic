"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function testAddCreditsAction() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase.rpc("adjust_artist_credits", {
    p_profile_id: user.id,
    p_delta: 10,
    p_reason: "server_action_test",
    p_source: "artist_dashboard",
  });

  if (error) {
    throw error;
  }

  return data;
}


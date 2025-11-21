"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitArtistApplication(payload: {
  user_id: string;
  artist_name: string;
  full_name: string;
  country: string;
  genre: string;
}) {
  const supabase = await createSupabaseServerClient();

  await supabase.from("artist_applications").insert({
    ...payload,
    status: "pending",
  });

  redirect("/dashboard");
}

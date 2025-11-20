"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/getUser";

export async function becomeArtist() {
  const supabase = await createSupabaseServerClient();
  const user = await getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "artist" })
    .eq("id", user.id);

  if (error) {
    console.error(error);
    throw new Error("Role update failed");
  }

  return { success: true };
}

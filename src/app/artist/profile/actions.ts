"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function updateArtistProfileAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const display_name = (formData.get("display_name") as string | null) ?? null;
  const bio = (formData.get("bio") as string | null) ?? null;
  const location = (formData.get("location") as string | null) ?? null;
  const instagram = (formData.get("instagram") as string | null) ?? null;
  const tiktok = (formData.get("tiktok") as string | null) ?? null;
  const facebook = (formData.get("facebook") as string | null) ?? null;
  const x = (formData.get("x") as string | null) ?? null;

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, bio, location, instagram, tiktok, facebook, x })
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  redirect("/artist/profile?success=1");
}


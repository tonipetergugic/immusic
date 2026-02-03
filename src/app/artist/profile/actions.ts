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
  const country = formData.get("country") as string | null;
  const city = formData.get("city") as string | null;
  const instagram = (formData.get("instagram") as string | null) ?? null;
  const tiktok = (formData.get("tiktok") as string | null) ?? null;
  const facebook = (formData.get("facebook") as string | null) ?? null;
  const x = (formData.get("x") as string | null) ?? null;

  const collecting_society_member_on =
    (formData.get("collecting_society_member_on") as string | null) ?? "";

  const collecting_society_member =
    collecting_society_member_on === ""
      ? null
      : collecting_society_member_on === "1";

  const collecting_society_name_raw =
    (formData.get("collecting_society_name") as string | null) ?? "";
  const collecting_society_number_raw =
    (formData.get("collecting_society_number") as string | null) ?? "";

  const collecting_society_name = collecting_society_member === true
    ? (collecting_society_name_raw.trim() || null)
    : null;

  const collecting_society_number = collecting_society_member === true
    ? (collecting_society_number_raw.trim() || null)
    : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name,
      bio,
      country,
      city,
      instagram,
      tiktok,
      facebook,
      x,
      collecting_society_member,
      collecting_society_name,
      collecting_society_number,
    })
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  redirect("/artist/profile?success=1");
}


"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function normalizeOptionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

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
    redirect("/login");
  }

  const display_name = normalizeOptionalText(formData.get("display_name"));
  const bio = normalizeOptionalText(formData.get("bio"));
  const country = normalizeOptionalText(formData.get("country"));
  const city = normalizeOptionalText(formData.get("city"));
  const instagram = normalizeOptionalText(formData.get("instagram"));
  const tiktok = normalizeOptionalText(formData.get("tiktok"));
  const facebook = normalizeOptionalText(formData.get("facebook"));
  const x = normalizeOptionalText(formData.get("x"));

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
    })
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  redirect("/artist/profile?success=1");
}


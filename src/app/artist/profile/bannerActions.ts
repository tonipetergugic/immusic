"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateBannerAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const file = formData.get("banner");

  if (!(file instanceof File)) {
    throw new Error("No banner file provided");
  }

  const filePath = `banners/${user.id}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("profile-banners")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from("profile-banners")
    .getPublicUrl(filePath);

  const publicUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ banner_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    throw updateError;
  }

  return { success: true };
}

export async function setBannerUrlAction(url: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ banner_url: url })
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  return { success: true };
}



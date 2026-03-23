"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateBannerAction(formData: FormData) {
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

  const file = formData.get("banner");

  if (!(file instanceof File)) {
    throw new Error("No banner file provided");
  }

  const filePath = `banners/${user.id}/banner-${crypto.randomUUID()}.jpg`;

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
    .update({ banner_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    throw updateError;
  }

  return { success: true };
}

export async function setBannerUrlAction(url: string | null) {
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

  const updatedAt = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({ banner_url: url, updated_at: updatedAt })
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  return { success: true };
}

export async function clearBannerUrlAction() {
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

  const updatedAt = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({ banner_url: null, updated_at: updatedAt })
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  return { success: true };
}

export async function setBannerPosYAction(posY: number) {
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

  const updatedAt = new Date().toISOString();

  const n = Number.isFinite(posY) ? Math.round(posY) : 50;
  const clamped = Math.max(0, Math.min(100, n));

  const { error } = await supabase
    .from("profiles")
    .update({ banner_pos_y: clamped, updated_at: updatedAt })
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  return { success: true };
}

"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UpdateBannerInput = {
  bannerPath: string;
  bannerUrl: string;
} | null;

export async function setBannerUrlAction(input: UpdateBannerInput) {
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
    .update({
      banner_path: input?.bannerPath ?? null,
      banner_url: input?.bannerUrl ?? null,
      updated_at: updatedAt,
    })
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

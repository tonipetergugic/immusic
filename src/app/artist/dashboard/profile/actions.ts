"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";

export async function uploadAvatarAction(previousState: any, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  // 1) User laden
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const file = formData.get("avatar") as File | null;

  if (!file) {
    return { success: false, message: "No file received" };
  }

  // 2) Dateiname erstellen (eindeutig)
  const fileExt = file.name.split(".").pop();
  const fileName = `${uuid()}.${fileExt}`;

  const filePath = `${user.id}/${fileName}`;

  // 3) Datei hochladen
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
    });

  if (uploadError) {
    console.error(uploadError);
    return { success: false, message: "Upload failed" };
  }

  // 4) Public URL erzeugen
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  // 5) Profil aktualisieren
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    console.error(updateError);
    return { success: false, message: "Profile update failed" };
  }

  // 6) UI aktualisieren
  revalidatePath("/artist/dashboard/profile");

  return { success: true, message: "Avatar updated", avatar_url: publicUrl };
}

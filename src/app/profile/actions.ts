"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * updateAvatar
 * Called AFTER the client uploads the avatar image to Supabase Storage.
 * This action updates profiles.avatar_url securely on the server.
 */
export async function updateAvatar(avatarUrl: string) {
  if (!avatarUrl) {
    throw new Error("Missing avatarUrl");
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (err) {
            console.error("Cookie set error:", err);
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (err) {
            console.error("Cookie remove error:", err);
          }
        },
      },
    }
  );

  // Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log("SERVER ACTION — updateAvatar: Unauthorized", userError);
    throw new Error("Not authenticated");
  }

  // Update avatar_url in profiles table
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (updateError) {
    console.log("SERVER ACTION — updateAvatar: Update failed", updateError);
    throw new Error("Failed to update avatar");
  }

  return { success: true };
}

export async function deleteAvatar() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (err) {
            console.error("Cookie set error:", err);
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (err) {
            console.error("Cookie remove error:", err);
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log("SERVER ACTION — deleteAvatar: Unauthorized", userError);
    throw new Error("Not authenticated");
  }

  // Delete file in bucket
  const { error: deleteError } = await supabase.storage
    .from("avatars")
    .remove([`${user.id}/avatar.png`]);

  if (deleteError) {
    console.log("SERVER ACTION — deleteAvatar: Delete failed", deleteError);
    throw new Error("Failed to delete avatar file");
  }

  // Set avatar_url = null in database
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (updateError) {
    console.log("SERVER ACTION — deleteAvatar: DB update failed", updateError);
    throw new Error("Failed to clear avatar_url");
  }

  return { success: true };
}

export async function updateDisplayName(newName: string) {
  if (!newName || newName.trim().length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        },
      },
    }
  );

  // User
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  // Update
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ display_name: newName })
    .eq("id", user.id);

  if (updateError) {
    throw new Error("Failed to update display name");
  }

  return { success: true };
}


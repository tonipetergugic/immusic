"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type UpdateAvatarInput = {
  avatarPath: string;
  avatarPreviewPath: string | null;
  avatarUrl: string;
  avatarPosX?: number;
  avatarPosY?: number;
  avatarZoom?: number;
};

function extractAvatarStoragePathFromPublicUrl(
  publicUrl: string | null | undefined
) {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    const marker = "/storage/v1/object/public/avatars/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    const encodedPath = url.pathname.slice(markerIndex + marker.length);
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

/**
 * updateAvatar
 * Called AFTER the client uploads the avatar image to Supabase Storage.
 * This action updates profiles.avatar_url securely on the server.
 */
export async function updateAvatar({
  avatarPath,
  avatarPreviewPath,
  avatarUrl,
  avatarPosX = 50,
  avatarPosY = 50,
  avatarZoom = 120,
}: UpdateAvatarInput) {
  if (!avatarPath) {
    throw new Error("Missing avatarPath");
  }

  if (!avatarUrl) {
    throw new Error("Missing avatarUrl");
  }

  const cookieStore = await cookies();

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
    console.error("SERVER ACTION — updateAvatar: Unauthorized", userError);
    throw new Error("Not authenticated");
  }

  const x = Number.isFinite(avatarPosX) ? Math.round(avatarPosX) : 50;
  const y = Number.isFinite(avatarPosY) ? Math.round(avatarPosY) : 50;
  const z = Number.isFinite(avatarZoom) ? Math.round(avatarZoom) : 120;

  const clampedX = Math.max(0, Math.min(100, x));
  const clampedY = Math.max(0, Math.min(100, y));
  const clampedZoom = Math.max(100, Math.min(200, z));

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_path: avatarPath,
      avatar_preview_path: avatarPreviewPath,
      avatar_url: avatarUrl,
      avatar_pos_x: clampedX,
      avatar_pos_y: clampedY,
      avatar_zoom: clampedZoom,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("SERVER ACTION — updateAvatar: Update failed", updateError);
    throw new Error("Failed to update avatar");
  }

  return { success: true };
}

export async function updateAvatarPosition(
  avatarPosX: number,
  avatarPosY: number
) {
  const cookieStore = await cookies();

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
    console.error("SERVER ACTION — updateAvatarPosition: Unauthorized", userError);
    throw new Error("Not authenticated");
  }

  const x = Number.isFinite(avatarPosX) ? Math.round(avatarPosX) : 50;
  const y = Number.isFinite(avatarPosY) ? Math.round(avatarPosY) : 50;

  const clampedX = Math.max(0, Math.min(100, x));
  const clampedY = Math.max(0, Math.min(100, y));

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_pos_x: clampedX,
      avatar_pos_y: clampedY,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("SERVER ACTION — updateAvatarPosition: Update failed", updateError);
    throw new Error("Failed to update avatar position");
  }

  return { success: true };
}

export async function deleteAvatar() {
  const cookieStore = await cookies();

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
    console.error("SERVER ACTION — deleteAvatar: Unauthorized", userError);
    throw new Error("Not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_path, avatar_preview_path, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("SERVER ACTION — deleteAvatar: Profile read failed", profileError);
    throw new Error("Failed to load avatar paths");
  }

  const legacyAvatarPath = extractAvatarStoragePathFromPublicUrl(
    profile?.avatar_url ?? null
  );

  const pathsToDelete = Array.from(
    new Set(
      [
        profile?.avatar_path ?? null,
        profile?.avatar_preview_path ?? null,
        legacyAvatarPath,
      ].filter((value): value is string => Boolean(value))
    )
  );

  if (pathsToDelete.length > 0) {
    const { error: deleteError } = await supabase.storage
      .from("avatars")
      .remove(pathsToDelete);

    if (deleteError) {
      console.error("SERVER ACTION — deleteAvatar: Delete failed", deleteError);
      throw new Error("Failed to delete avatar file");
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_url: null,
      avatar_path: null,
      avatar_preview_path: null,
      avatar_pos_x: 50,
      avatar_pos_y: 50,
      avatar_zoom: 120,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("SERVER ACTION — deleteAvatar: DB update failed", updateError);
    throw new Error("Failed to clear avatar");
  }

  return { success: true };
}

export async function updateDisplayName(newName: string) {
  if (!newName || newName.trim().length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }

  const cookieStore = await cookies();

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

export async function updateHideExplicitTracks(hideExplicitTracks: boolean) {
  const cookieStore = await cookies();

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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ hide_explicit_tracks: hideExplicitTracks })
    .eq("id", user.id);

  if (updateError) {
    throw new Error("Failed to update explicit content preference");
  }

  return { success: true };
}

export async function followProfile(followingId: string) {
  if (!followingId) throw new Error("Missing followingId");

  const cookieStore = await cookies();

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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Not authenticated");

  const { error } = await supabase.from("follows").insert({
    follower_id: user.id,
    following_id: followingId,
  });

  if (error) {
    // duplicate follow: ignore
    if ((error as any).code === "23505") return { success: true };
    throw new Error(error.message);
  }

  return { success: true };
}

export async function unfollowProfile(followingId: string) {
  if (!followingId) throw new Error("Missing followingId");

  const cookieStore = await cookies();

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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", followingId);

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function isFollowingProfile(followingId: string) {
  if (!followingId) throw new Error("Missing followingId");

  const cookieStore = await cookies();

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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { following: false };

  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return { following: !!data };
}


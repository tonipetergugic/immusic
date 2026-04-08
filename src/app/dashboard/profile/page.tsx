"use client";

import { useState, useEffect } from "react";
import AvatarDropzone from "@/components/AvatarDropzone";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  updateAvatar,
  updateAvatarPosition,
  deleteAvatar,
  updateDisplayName,
} from "@/app/(topbar)/profile/actions";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import DeleteAvatarModal from "@/components/DeleteAvatarModal";
import ProfileSectionLayout from "@/components/ProfileSectionLayout";

function showNotice(message: string) {
  window.dispatchEvent(
    new CustomEvent("immusic:notice", { detail: { message } })
  );
}

export default function ProfilePage() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPosX, setAvatarPosX] = useState<number>(50);
  const [avatarPosY, setAvatarPosY] = useState<number>(50);
  const [avatarZoom, setAvatarZoom] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isDeleteAvatarModalOpen, setIsDeleteAvatarModalOpen] = useState(false);

  const supabase = createSupabaseBrowserClient();

  // Helper: best-effort cleanup of old files in a bucket prefix, keeping only the newest uploaded file
  async function cleanupOtherFilesInPrefix(params: {
    bucket: string;
    prefix: string; // e.g. `${user.id}`
    keepFullPath: string; // e.g. `${user.id}/xyz.png`
  }) {
    try {
      const { bucket, prefix, keepFullPath } = params;

      const { data: listed, error: listErr } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit: 100, offset: 0 });

      if (listErr) {
        console.error("[cleanup] list failed:", listErr);
        return;
      }

      const toDelete =
        (listed ?? [])
          .map((f) => `${prefix}/${f.name}`)
          .filter((fullPath) => fullPath !== keepFullPath);

      if (toDelete.length === 0) return;

      const { error: delErr } = await supabase.storage.from(bucket).remove(toDelete);
      if (delErr) {
        console.error("[cleanup] remove failed:", delErr);
        return;
      }

      console.info(`[cleanup] removed ${toDelete.length} old file(s) from ${bucket}/${prefix}`);
    } catch (e) {
      console.error("[cleanup] unexpected error:", e);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadAvatar() {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) {
          setUserEmail(user.email ?? "");
          setViewerId(user.id);
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("avatar_url, avatar_pos_x, avatar_pos_y, avatar_zoom, display_name, role, updated_at")
          .eq("id", user.id)
          .single();

        if (!error && isMounted) {
          const base = profile?.avatar_url ?? null;
          const ver = profile?.updated_at ? String(profile.updated_at) : null;

          setAvatarUrl(
            base && ver
              ? `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(ver)}`
              : base
          );
          setAvatarPosX(
            Number.isFinite(profile?.avatar_pos_x)
              ? Number(profile.avatar_pos_x)
              : 50
          );
          setAvatarPosY(
            Number.isFinite(profile?.avatar_pos_y)
              ? Number(profile.avatar_pos_y)
              : 50
          );
          setAvatarZoom(
            Number.isFinite(profile?.avatar_zoom)
              ? Number(profile.avatar_zoom)
              : 100
          );
          setRole(profile?.role ?? null);
          if (profile?.display_name) {
            setDisplayName(profile.display_name);
            setInitialName(profile.display_name);
          }
        }
      } catch (err) {
        console.error("loadAvatar error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAvatar();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!avatarUrl) {
      setAvatarPosX(50);
      setAvatarPosY(50);
      setAvatarZoom(100);
    }
  }, [avatarUrl]);

  return (
    <ProfileSectionLayout
      title="Profile"
      description="Change your display name and avatar."
      current="profile"
    >
      {/* Profile top row */}
      <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0">
          <div className="max-w-[620px]">
            <div className="pb-8">
              <div className="flex items-baseline justify-between gap-4">
                <label className="text-sm text-[#B3B3B3]">Display name</label>
                {role === "artist" ? (
                  <span className="text-xs text-[#B3B3B3]">
                    Visible as artist name
                  </span>
                ) : null}
              </div>

              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="
                  mt-3
                  w-full max-w-[520px]
                  border-0 border-b border-white/10
                  bg-transparent
                  px-0 pb-4 pt-2
                  text-[34px] leading-tight
                  text-white
                  placeholder-[#666]
                  focus:outline-none
                  focus:border-[#00FFC6]
                  transition
                "
                placeholder="Enter your display name..."
              />

              <button
                onClick={async () => {
                  setNameSaving(true);

                  await updateDisplayName(displayName);

                  window.dispatchEvent(
                    new CustomEvent("displayNameUpdated", { detail: displayName })
                  );

                  setInitialName(displayName);
                  setNameSaving(false);
                }}
                className="
                  mt-6
                  inline-flex items-center justify-center
                  min-w-[180px]
                  rounded-xl
                  px-5 py-3
                  bg-transparent
                  border border-white/10
                  text-white/80 font-medium
                  cursor-pointer
                  hover:border-[#00FFC6]
                  hover:text-[#00FFC6]
                  hover:bg-white/[0.03]
                  transition
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                  disabled:hover:border-white/10
                  disabled:hover:text-white/80
                  disabled:hover:bg-transparent
                "
                disabled={nameSaving || displayName === initialName}
              >
                {nameSaving ? "Saving..." : "Save changes"}
              </button>
            </div>

            <div className="py-8">
              <span className="block text-sm text-[#B3B3B3] mb-2">
                Email
              </span>
              <div className="text-[24px] leading-tight text-white font-medium break-words">
                {userEmail}
              </div>
            </div>

            {viewerId ? (
              <div className="pt-8">
                <Link
                  href={role === "artist" ? `/dashboard/artist/${viewerId}` : `/profile/${viewerId}`}
                  className="
                    inline-flex items-center gap-2
                    text-sm font-medium
                    text-[#00FFC6]
                    hover:text-[#00E0B0]
                    transition
                  "
                >
                  {role === "artist" ? "View your artist page" : "View your public profile"}
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="lg:justify-self-end">
          <div className="relative h-[280px] w-[280px] group sm:h-[300px] sm:w-[300px]">
            <AvatarDropzone
              avatarUrl={avatarUrl}
              avatarPosX={avatarPosX}
              avatarPosY={avatarPosY}
              avatarZoom={avatarZoom}
              onPositionChange={(x, y) => {
                setAvatarPosX(x);
                setAvatarPosY(y);
              }}
              onPositionCommit={async (x, y) => {
                await updateAvatarPosition(x, y);
              }}
              onFileSelected={async (file) => {
                if (!file) return;
                if (loading) return;

                setLoading(true);

                const {
                  data: { user },
                } = await supabase.auth.getUser();

                if (!user?.id) {
                  showNotice("You must be logged in.");
                  return;
                }

                const ext = (file.name.split(".").pop() || "png").toLowerCase();
                const filePath = `${user.id}/${Date.now()}.${ext}`;

                const { error: uploadError } = await supabase.storage
                  .from("avatars")
                  .upload(filePath, file, {
                    upsert: false,
                    contentType: file.type || undefined,
                  });

                if (uploadError) {
                  console.error("Avatar upload error:", uploadError);
                  showNotice("Upload failed.");
                  setLoading(false);
                  return;
                }

                await cleanupOtherFilesInPrefix({
                  bucket: "avatars",
                  prefix: user.id,
                  keepFullPath: filePath,
                });

                const { data: publicUrl } = supabase.storage
                  .from("avatars")
                  .getPublicUrl(filePath);

                const url = publicUrl.publicUrl;

                await updateAvatar(url, 50, 50, 100);
                setAvatarPosX(50);
                setAvatarPosY(50);
                setAvatarZoom(100);
                setAvatarUrl(url);

                window.dispatchEvent(new CustomEvent("avatarUpdated", { detail: { avatar_url: url } }));

                setLoading(false);
              }}
            />

            {avatarUrl ? (
              <button
                type="button"
                onClick={() => {
                  if (loading) return;
                  setIsDeleteAvatarModalOpen(true);
                }}
                aria-label="Delete avatar"
                className="
                  absolute top-1 right-1
                  p-1 rounded-full
                  bg-[#0E0E10]/80 backdrop-blur
                  hover:bg-red-500/40
                  transition
                  opacity-0 group-hover:opacity-100
                  cursor-pointer
                "
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            ) : null}

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="w-6 h-6 border-2 border-[#00FFC6] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

        <DeleteAvatarModal
          open={isDeleteAvatarModalOpen}
          busy={loading}
          onClose={() => {
            if (loading) return;
            setIsDeleteAvatarModalOpen(false);
          }}
          onConfirm={async () => {
            if (loading) return;

            setLoading(true);

            try {
              await deleteAvatar();
              setAvatarUrl(null);
              window.dispatchEvent(
                new CustomEvent("avatarUpdated", { detail: { avatar_url: null } })
              );
              setIsDeleteAvatarModalOpen(false);
            } finally {
              setLoading(false);
            }
          }}
        />
    </ProfileSectionLayout>
  );
}

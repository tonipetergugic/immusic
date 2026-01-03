"use client";

import { useState, useEffect } from "react";
import AvatarDropzone from "@/components/AvatarDropzone";
import { createBrowserClient } from "@supabase/ssr";
import { updateAvatar, deleteAvatar, updateDisplayName } from "./actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
        console.log("[cleanup] list failed:", listErr);
        return;
      }

      const toDelete =
        (listed ?? [])
          .map((f) => `${prefix}/${f.name}`)
          .filter((fullPath) => fullPath !== keepFullPath);

      if (toDelete.length === 0) return;

      const { error: delErr } = await supabase.storage.from(bucket).remove(toDelete);
      if (delErr) {
        console.log("[cleanup] remove failed:", delErr);
        return;
      }

      console.log(`[cleanup] removed ${toDelete.length} old file(s) from ${bucket}/${prefix}`);
    } catch (e) {
      console.log("[cleanup] unexpected error:", e);
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
          .select("avatar_url, display_name, role, updated_at")
          .eq("id", user.id)
          .single();

        if (!error && isMounted) {
          const base = profile?.avatar_url ?? null;
          const ver = profile?.updated_at ? String(profile.updated_at) : null;

          setAvatarUrl(
            base
              ? `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(ver ?? String(Date.now()))}`
              : null
          );
          setRole(profile?.role ?? null);
          if (profile?.display_name) {
            setDisplayName(profile.display_name);
            setInitialName(profile.display_name);
          }
        }
      } catch (err) {
        console.log("loadAvatar error", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAvatar();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#0E0E10] text-white p-10">
      <div
        className="
          max-w-xl mx-auto
          bg-[#0B0B0D]
          border border-[#1A1A1C]
          rounded-2xl
          p-8
          shadow-[0_20px_60px_rgba(0,0,0,0.6)]
        "
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="
              inline-flex items-center justify-center
              w-10 h-10 rounded-xl
              bg-[#111113]
              border border-[#1A1A1C]
              text-[#B3B3B3]
              hover:border-[#00FFC6]
              hover:text-[#00FFC6]
              transition
            "
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-2xl font-semibold leading-tight">Profile</h1>
            <p className="text-[#B3B3B3] mt-1">
              Change your display name and avatar.
            </p>
          </div>
        </div>

        {/* Avatar Upload */}
        <div className="relative w-52 h-52 mx-auto mb-14 group">
          <AvatarDropzone
            avatarUrl={avatarUrl}
            onFileSelected={async (file) => {
              if (!file) return;
              if (loading) return;

              setLoading(true);

              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user) {
                alert("Not authenticated.");
                setLoading(false);
                return;
              }

              // Upload file
              const ext = (file.name.split(".").pop() || "png").toLowerCase();
              const filePath = `${user.id}/${Date.now()}.${ext}`;

              const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, {
                  upsert: false,
                  contentType: file.type || undefined,
                });

              if (uploadError) {
                console.log(uploadError);
                alert("Upload failed");
                setLoading(false);
                return;
              }

              // BEST-EFFORT CLEANUP: delete old avatar files in this user folder (keep only the new one)
              await cleanupOtherFilesInPrefix({
                bucket: "avatars",
                prefix: user.id,
                keepFullPath: filePath,
              });

              // Get public URL
              const { data: publicUrl } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

              const url = publicUrl.publicUrl;

              // Update DB via Server Action (store the cache-busted URL)
              await updateAvatar(url);

              // Update UI
              setAvatarUrl(url);

              // notify Topbar (and any other listeners) to refetch versioned avatar_url
              window.dispatchEvent(new CustomEvent("avatarUpdated"));

              setLoading(false);
            }}
          />

          <div
            className="
              pointer-events-none
              absolute inset-0
              rounded-xl
              flex items-center justify-center
              bg-black/0
              opacity-0
              group-hover:opacity-100
              group-hover:bg-black/35
              transition
            "
          >
            <span
              className="
                text-xs font-medium
                text-white/90
                px-3 py-1.5
                rounded-full
                border border-white/10
                bg-black/35
                backdrop-blur
              "
            >
              Change avatar
            </span>
          </div>

          {/* Delete icon */}
          {avatarUrl && (
            <button
              onClick={async () => {
                if (loading) return;
                setLoading(true);
                await deleteAvatar();
                setAvatarUrl(null);
                window.dispatchEvent(new CustomEvent("avatarUpdated"));
                setLoading(false);
              }}
              className="
                absolute top-1 right-1
                p-1 rounded-full
                bg-[#0E0E10]/80 backdrop-blur
                hover:bg-red-500/40
                transition
                opacity-0 group-hover:opacity-100
              "
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-6 h-6 border-2 border-[#00FFC6] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Display Name Editing */}
        <div className="flex flex-col gap-2 mt-8">
          <div className="flex items-baseline justify-between">
            <label className="text-sm text-[#B3B3B3]">Display name</label>
            {role === "artist" && (
              <span className="text-xs text-[#B3B3B3]">
                Visible as artist name
              </span>
            )}
          </div>

          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="
              w-full
              bg-[#111113]
              border border-[#1A1A1C]
              rounded-xl
              px-4 py-3
              text-white placeholder-[#666]
              focus:outline-none
              focus:border-[#00FFC6]
              focus:shadow-[0_0_0_2px_rgba(0,255,198,0.15)]
              transition
            "
            placeholder="Enter your display name..."
          />

          {/* Save button only visible if changed */}
          {displayName !== initialName && (
            <button
              onClick={async () => {
                setNameSaving(true);

                await updateDisplayName(displayName);

                // Dispatch custom event so Topbar updates immediately
                window.dispatchEvent(
                  new CustomEvent("displayNameUpdated", { detail: displayName })
                );

                setInitialName(displayName);
                setNameSaving(false);
              }}
              className="
                mt-4 mx-auto
                inline-flex items-center justify-center
                w-[220px]
                rounded-lg
                px-5 py-2.5
                bg-[#111113]
                border border-[#1A1A1C]
                text-[#B3B3B3] font-medium
                hover:border-[#00FFC6]
                hover:text-[#00FFC6]
                transition
                disabled:opacity-40
                disabled:cursor-not-allowed
                disabled:hover:border-[#1A1A1C]
                disabled:hover:text-[#B3B3B3]
              "
              disabled={nameSaving}
            >
              {nameSaving ? "Saving..." : "Save changes"}
            </button>
          )}
        </div>

        {/* Email info */}
        <div className="mt-8">
          <span className="block text-sm text-[#B3B3B3] mb-1">
            Email
          </span>

          <div className="text-white/90 font-medium">
            {userEmail}
          </div>

          <Link
            href="/account"
            className="
              inline-block mt-2
              text-sm text-[#B3B3B3]
              hover:text-[#00FFC6]
              transition
            "
          >
            Manage login & security →
          </Link>
        </div>

        {/* Profile Link */}
        {viewerId ? (
          <div className="mt-8 pt-8 border-t border-[#1A1A1C]">
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
  );
}


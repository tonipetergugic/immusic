"use client";

import { useState, useEffect } from "react";
import AvatarDropzone from "@/components/AvatarDropzone";
import { createBrowserClient } from "@supabase/ssr";
import { updateAvatar, deleteAvatar, updateDisplayName } from "./actions";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("avatar_url, display_name")
          .eq("id", user.id)
          .single();

        if (!error && isMounted) {
          setAvatarUrl(profile?.avatar_url ?? null);
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
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="
            flex items-center gap-2 mb-8
            text-[#B3B3B3] hover:text-[#00FFC6]
            transition-colors duration-200
          "
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        {/* Title */}
        <h1 className="text-2xl font-semibold mb-2">Profile</h1>
        <p className="text-[#B3B3B3] mb-8">
          Change your display name and avatar.
        </p>

        {/* Avatar Upload */}
        <div className="relative w-30 h-30">
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
              const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(`${user.id}/avatar.png`, file, {
                  upsert: true,
                });

              if (uploadError) {
                console.log(uploadError);
                alert("Upload failed");
                setLoading(false);
                return;
              }

              // Get public URL
              const { data: publicUrl } = supabase.storage
                .from("avatars")
                .getPublicUrl(`${user.id}/avatar.png`);

              const url = publicUrl.publicUrl;

              // Update DB via Server Action
              await updateAvatar(url);

              setAvatarUrl(url);
              setLoading(false);
            }}
          />

          {/* Delete icon */}
          {avatarUrl && (
            <button
              onClick={async () => {
                if (loading) return;
                setLoading(true);
                await deleteAvatar();
                setAvatarUrl(null);
                setLoading(false);
              }}
              className="
                absolute top-1 right-1
                p-1 rounded-full
                bg-[#0E0E10]/80 backdrop-blur
                hover:bg-red-500/40
                transition
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
        <div className="flex flex-col gap-2 mt-10">
          <label className="text-sm text-[#B3B3B3]">Display name</label>

          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="
              w-full bg-[#1A1A1C] border border-[#1A1A1C] rounded-lg
              p-3 text-white placeholder-[#555]
              focus:outline-none focus:border-[#00FFC6]
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
                mt-2 inline-block
                bg-[#00FFC6] text-black font-medium
                px-4 py-2 rounded-lg
                hover:bg-[#00E0B0]
                transition
              "
              disabled={nameSaving}
            >
              {nameSaving ? "Saving..." : "Save changes"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}


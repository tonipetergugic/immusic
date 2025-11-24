"use client";

import { useState } from "react";
import AvatarDropzone from "@/components/AvatarDropzone";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { v4 as uuid } from "uuid";

export default function AvatarSection({ avatarUrl }: { avatarUrl: string | null }) {
  const supabase = createSupabaseBrowserClient();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) {
      setError("Please select an image first.");
      setSuccess(null);
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    // 1) Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      setIsUploading(false);
      setError("You must be logged in.");
      return;
    }

    // 2) Build file path: userId/uuid.ext
    const ext = file.name.split(".").pop() ?? "png";
    const fileName = `${uuid()}.${ext}`;
    const filePath = `${user.id}/${fileName}`;

    // 3) Upload file to avatars bucket
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error(uploadError);
      setIsUploading(false);
      setError("Upload failed.");
      return;
    }

    // 4) Get public URL
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    // 5) Update profile avatar_url
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error(updateError);
      setIsUploading(false);
      setError("Profile update failed.");
      return;
    }

    setIsUploading(false);
    setSuccess("Avatar updated successfully.");
  }

  return (
    <div className="space-y-4">
      <AvatarDropzone
        avatarUrl={file ? URL.createObjectURL(file) : avatarUrl}
        onFileSelected={(newFile) => {
          console.log("Avatar file selected:", newFile);
          setFile(newFile);
          setSuccess(null);
          setError(null);
        }}
      />
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="px-4 py-2 rounded-full bg-[#00FFC6] text-black text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? "Saving..." : "Save Avatar"}
      </button>

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-emerald-400">
          {success}
        </p>
      )}

      {file && (
        <p className="text-sm text-[#B3B3B3]">
          Selected: {file.name}
        </p>
      )}
    </div>
  );
}

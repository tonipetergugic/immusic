"use client";

import { useState, type ChangeEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateReleaseCoverAction } from "./actions";

type CoverUploadClientProps = {
  releaseId: string;
  userId: string;
  currentCoverPath: string | null;
  currentCoverUrl?: string | null;
};

export default function CoverUploadClient({
  releaseId,
  userId,
  currentCoverPath,
  currentCoverUrl = null,
}: CoverUploadClientProps) {
  const supabase = createSupabaseBrowserClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedCoverPath, setUploadedCoverPath] = useState<string | null>(
    currentCoverPath
  );

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setSelectedFile(file);

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `covers/${userId}/${releaseId}.${ext}`;

    const { error } = await supabase.storage
      .from("release_covers")
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error("Cover upload failed:", error);
      return;
    }

    setUploadedCoverPath(filePath);
  };

  return (
    <div className="mt-8">
      <input
        type="file"
        accept="image/*"
        onChange={handleCoverUpload}
        className="mt-6"
      />

      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Cover preview"
          className="w-40 h-40 rounded-xl object-cover mt-4"
        />
      ) : currentCoverUrl ? (
        <img
          src={currentCoverUrl}
          alt="Cover preview"
          className="w-40 h-40 rounded-xl object-cover mt-4"
        />
      ) : null}

      <form action={updateReleaseCoverAction}>
        <input type="hidden" name="release_id" value={releaseId} />
        <input type="hidden" name="cover_path" value={uploadedCoverPath ?? ""} />
        <button
          type="submit"
          className="px-5 py-2 rounded-xl bg-[#00FFC6] text-black font-medium mt-4"
          disabled={!uploadedCoverPath || !selectedFile}
        >
          Save Cover
        </button>
      </form>
    </div>
  );
}


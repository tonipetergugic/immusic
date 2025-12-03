"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteReleaseCoverAction, updateReleaseCoverAction } from "./actions";

type Props = {
  releaseId: string;
  initialCoverUrl: string | null;
};

export default function ReleaseCoverUploader({ releaseId, initialCoverUrl }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const ext = file.name.split(".").pop();
    const filePath = `${releaseId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("release_covers")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      setUploading(false);
      return;
    }

    await updateReleaseCoverAction(releaseId, filePath);

    const {
      data: { publicUrl },
    } = supabase.storage.from("release_covers").getPublicUrl(filePath);

    setCoverUrl(publicUrl);
    setUploading(false);
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="mb-6">
      <div
        onClick={handleClick}
        className="w-48 h-48 rounded bg-[#1F1F23] mb-2 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="Release Cover" className="w-48 h-48 rounded object-cover" />
        ) : (
          <span className="text-gray-500 text-sm">Click to upload cover</span>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {coverUrl && (
        <button
          type="button"
          onClick={async () => {
            setUploading(true);
            await deleteReleaseCoverAction(releaseId);
            setCoverUrl(null);
            setUploading(false);
          }}
          className="text-red-400 hover:text-red-300 text-xs mt-2"
        >
          Remove Cover
        </button>
      )}

      {uploading && <p className="text-xs text-gray-400 mt-1">Uploading cover...</p>}
    </div>
  );
}


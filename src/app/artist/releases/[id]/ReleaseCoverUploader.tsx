"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteReleaseCoverAction, updateReleaseCoverAction } from "./actions";

type Props = {
  releaseId: string;
  initialCoverUrl: string | null;
  onReleaseModified?: () => void;
};

export default function ReleaseCoverUploader({ releaseId, initialCoverUrl, onReleaseModified }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);

    const ext = file.name.split(".").pop() || "jpg";
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
    onReleaseModified?.();

    const {
      data: { publicUrl },
    } = supabase.storage.from("release_covers").getPublicUrl(filePath);

    setCoverUrl(publicUrl);
    setUploading(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset input so selecting the same file again still triggers onChange
    e.target.value = "";
    await uploadFile(file);
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="mb-6">
      <div
        onClick={handleClick}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (uploading) return;
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (uploading) return;
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (uploading) return;

          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          if (!file.type.startsWith("image/")) return;

          await uploadFile(file);
        }}
        className={[
          "w-full aspect-square rounded bg-[#1F1F23] mb-2 flex items-center justify-center cursor-pointer transition overflow-hidden",
          "hover:opacity-90",
          isDragging ? "ring-2 ring-[#00FFC6]/60 border border-[#00FFC6]/40" : "border border-white/10",
          uploading ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt="Release Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white/60 text-sm">
            {isDragging ? "Drop image to upload" : "Click or drag & drop to upload"}
          </span>
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
            onReleaseModified?.();
          }}
          className="mt-2 inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition"
        >
          <Trash2 className="w-4 h-4 opacity-80" />
          <span>Remove Cover</span>
        </button>
      )}

      {uploading && <p className="text-xs text-gray-400 mt-1">Uploading cover...</p>}
    </div>
  );
}


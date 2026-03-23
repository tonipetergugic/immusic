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
  const [coverPending, setCoverPending] = useState<"uploading" | "removing" | null>(null);
  const isPending = coverPending !== null;
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    setErrorMsg(null);
    setCoverPending("uploading");
    let uploadedFilePath: string | null = null;

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${releaseId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("release_covers")
        .upload(filePath, file, { upsert: true });

      uploadedFilePath = filePath;

      if (uploadError) {
        console.error(uploadError);
        setErrorMsg("Upload failed. Please try again.");
        return;
      }

      await updateReleaseCoverAction(releaseId, filePath);
      onReleaseModified?.();

      const {
        data: { publicUrl },
      } = supabase.storage.from("release_covers").getPublicUrl(filePath);

      setCoverUrl(publicUrl);
    } catch (e) {
      console.error(e);

      if (uploadedFilePath) {
        const { error: rollbackError } = await supabase.storage
          .from("release_covers")
          .remove([uploadedFilePath]);

        if (rollbackError) {
          console.error("Failed to rollback uploaded cover file:", rollbackError);
        }
      }

      setErrorMsg("Cover update not allowed for this release.");
    } finally {
      setCoverPending(null);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset input so selecting the same file again still triggers onChange
    e.target.value = "";
    await uploadFile(file);
  }

  function handleClick() {
    if (isPending) return;
    fileInputRef.current?.click();
  }

  return (
    <div className="mb-6">
      <div
        onClick={handleClick}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isPending) return;
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isPending) return;
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
          if (isPending) return;

          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          if (!file.type.startsWith("image/")) return;

          await uploadFile(file);
        }}
        className={[
          "w-full aspect-square rounded bg-[#1F1F23] mb-2 flex items-center justify-center cursor-pointer transition overflow-hidden",
          "hover:opacity-90",
          isDragging ? "ring-2 ring-[#00FFC6]/60 border border-[#00FFC6]/40" : "border border-white/10",
          isPending ? "opacity-60 cursor-not-allowed" : "",
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
          disabled={isPending}
          onClick={async () => {
            if (isPending) return;

            setErrorMsg(null);
            setCoverPending("removing");

            try {
              await deleteReleaseCoverAction(releaseId);
              setCoverUrl(null);
              onReleaseModified?.();
            } catch (e) {
              console.error(e);
              setErrorMsg("Cover removal not allowed for this release.");
            } finally {
              setCoverPending(null);
            }
          }}
          className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4 opacity-80" />
          <span>{coverPending === "removing" ? "Removing..." : "Remove Cover"}</span>
        </button>
      )}

      {coverPending === "uploading" ? (
        <p className="mt-1 text-xs text-gray-400">Uploading cover...</p>
      ) : null}

      {coverPending === "removing" ? (
        <p className="mt-1 text-xs text-gray-400">Removing cover...</p>
      ) : null}
      {errorMsg && <p className="text-xs text-red-400 mt-1">{errorMsg}</p>}
    </div>
  );
}


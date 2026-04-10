"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteReleaseCoverAction, updateReleaseCoverAction } from "./actions";

type Props = {
  releaseId: string;
  initialCoverUrl: string | null;
  onCoverUrlChange?: (url: string | null) => void;
  onReleaseModified?: () => void;
};

const PREVIEW_SIZE = 256;

function stripExtension(filename: string) {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex <= 0) return filename;
  return filename.slice(0, lastDotIndex);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = src;
  });
}

async function createSquareCoverPreview(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to create preview canvas.");
    }

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.floor((image.naturalWidth - sourceSize) / 2);
    const sourceY = Math.floor((image.naturalHeight - sourceSize) / 2);

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      PREVIEW_SIZE,
      PREVIEW_SIZE
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });

    if (!blob) {
      throw new Error("Failed to encode preview image.");
    }

    const safeBaseName = stripExtension(file.name) || "cover-preview";

    return new File([blob], `${safeBaseName}.jpg`, {
      type: "image/jpeg",
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function ReleaseCoverUploader({
  releaseId,
  initialCoverUrl,
  onReleaseModified,
  onCoverUrlChange,
}: Props) {
  const supabase = createSupabaseBrowserClient();
  const [coverPending, setCoverPending] = useState<"uploading" | "removing" | null>(null);
  const isPending = coverPending !== null;
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file.");
      return;
    }

    setErrorMsg(null);
    setCoverPending("uploading");

    let uploadedOriginalFilePath: string | null = null;
    let uploadedPreviewFilePath: string | null = null;

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const originalFilePath = `${releaseId}/${crypto.randomUUID()}.${ext}`;
      const previewFilePath = `${releaseId}/preview/${crypto.randomUUID()}.jpg`;

      const previewFile = await createSquareCoverPreview(file);

      const { error: originalUploadError } = await supabase.storage
        .from("release_covers")
        .upload(originalFilePath, file, { upsert: true });

      if (originalUploadError) {
        throw originalUploadError;
      }

      uploadedOriginalFilePath = originalFilePath;

      const { error: previewUploadError } = await supabase.storage
        .from("release_covers")
        .upload(previewFilePath, previewFile, { upsert: true });

      if (previewUploadError) {
        throw previewUploadError;
      }

      uploadedPreviewFilePath = previewFilePath;

      await updateReleaseCoverAction(releaseId, originalFilePath, previewFilePath);
      onReleaseModified?.();

      const {
        data: { publicUrl },
      } = supabase.storage.from("release_covers").getPublicUrl(originalFilePath);

      setCoverUrl(publicUrl);
      onCoverUrlChange?.(publicUrl);
    } catch (e) {
      console.error(e);

      const rollbackPaths = [uploadedOriginalFilePath, uploadedPreviewFilePath].filter(
        (path): path is string => Boolean(path)
      );

      if (rollbackPaths.length > 0) {
        const { error: rollbackError } = await supabase.storage
          .from("release_covers")
          .remove(rollbackPaths);

        if (rollbackError) {
          console.error("Failed to rollback uploaded cover files:", rollbackError);
        }
      }

      setErrorMsg("Cover update failed. Please try again.");
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
              onCoverUrlChange?.(null);
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


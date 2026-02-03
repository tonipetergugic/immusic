"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BannerPreview from "./BannerPreview";
import { setBannerUrlAction, clearBannerUrlAction } from "./bannerActions";
import { Trash2 } from "lucide-react";

export default function BannerUpload({
  userId,
  currentBannerUrl,
}: {
  userId: string;
  currentBannerUrl: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function cleanupOtherFilesInPrefix(params: {
    bucket: string;
    prefix: string;
    keepFullPath: string;
  }) {
    try {
      const { bucket, prefix, keepFullPath } = params;

      const { data: listed, error: listErr } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit: 100, offset: 0 });

      if (listErr) {
        return;
      }

      const toDelete =
        (listed ?? [])
          .map((f) => `${prefix}/${f.name}`)
          .filter((fullPath) => fullPath !== keepFullPath);

      if (toDelete.length === 0) return;

      const { error: delErr } = await supabase.storage.from(bucket).remove(toDelete);
      if (delErr) {
        return;
      }

    } catch (e) {
    }
  }

  const uploadFile = async (file: File): Promise<void> => {
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);

    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const filePath = `${userId}/banner-${crypto.randomUUID()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-banners")
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        setErrorMessage(uploadError.message);
        return;
      }

      await cleanupOtherFilesInPrefix({
        bucket: "profile-banners",
        prefix: userId,
        keepFullPath: filePath,
      });

      const { data: publicData } = supabase.storage
        .from("profile-banners")
        .getPublicUrl(filePath);

      if (!publicData?.publicUrl) {
        setErrorMessage("No public URL returned from Supabase.");
        return;
      }

      await setBannerUrlAction(publicData.publicUrl);

      router.refresh();
      window.location.href = "/artist/profile?banner-updated=1";
    } catch (err: any) {
      console.error("Banner upload unexpected error:", err);

      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else if (typeof err === "string") {
        setErrorMessage(err);
      } else {
        setErrorMessage(JSON.stringify(err));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    // wichtig: gleiche Datei nochmal auswählen erlauben
    event.target.value = "";
    await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // optional: sehr einfache Validierung, passend zum accept image/*
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please drop an image file (JPG/PNG/WebP).");
      return;
    }

    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  async function handleDelete(): Promise<void> {
    if (!currentBannerUrl) return;

    setDeleting(true);
    setErrorMessage(null);

    try {
      // 1) alle Banner-Dateien unter userId/ löschen
      const { data: listed, error: listErr } = await supabase.storage
        .from("profile-banners")
        .list(userId, { limit: 100, offset: 0 });

      if (!listErr && listed && listed.length > 0) {
        const toDelete = listed.map((f) => `${userId}/${f.name}`);
        await supabase.storage.from("profile-banners").remove(toDelete);
      }

      // 2) DB URL löschen
      await clearBannerUrlAction();

      router.refresh();
      window.location.href = "/artist/profile?banner-removed=1";
    } catch (err: any) {
      console.error("Banner delete unexpected error:", err);

      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else if (typeof err === "string") {
        setErrorMessage(err);
      } else {
        setErrorMessage(JSON.stringify(err));
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Dropzone / Click-to-upload surface */}
      <div
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files?.[0];
          if (!file) return;

          // mimic input change
          const fakeEvent = {
            target: { files: [file] },
          } as unknown as React.ChangeEvent<HTMLInputElement>;

          handleUpload(fakeEvent);
        }}
      >
        {/* Preview */}
        <div className="h-[220px] sm:h-[240px]">
          <BannerPreview url={currentBannerUrl} />
        </div>

        {/* Click overlay to trigger file input (works even when banner exists) */}
        <label
          htmlFor="banner_upload_input"
          className="absolute inset-0 cursor-pointer"
          aria-label="Upload banner"
        />

        {/* Center hint ONLY when no banner */}
        {!currentBannerUrl ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="text-base font-semibold text-white/70">
              Click or drag & drop to upload
            </div>
            <div className="text-sm text-white/40">JPG/PNG • Recommended 1600×400</div>
          </div>
        ) : null}

        {/* Delete icon (only when banner exists) */}
        {currentBannerUrl ? (
          <button
            type="button"
            onClick={async () => {
              if (uploading) return;
              const ok = window.confirm("Delete banner?");
              if (!ok) return;

              setUploading(true);
              setErrorMessage(null);

              try {
                // Remove DB URL first (UI becomes empty immediately after refresh)
                await setBannerUrlAction(null);

                // Best-effort: remove files inside this user's prefix
                const { data: listed } = await supabase.storage
                  .from("profile-banners")
                  .list(userId, { limit: 100, offset: 0 });

                const toDelete =
                  (listed ?? []).map((f) => `${userId}/${f.name}`);

                if (toDelete.length > 0) {
                  await supabase.storage.from("profile-banners").remove(toDelete);
                }

                router.refresh();
                window.location.href = "/artist/profile?banner-deleted=1";
              } catch (err: any) {
                if (err instanceof Error) setErrorMessage(err.message);
                else setErrorMessage(String(err));
              } finally {
                setUploading(false);
              }
            }}
            className={[
              "absolute bottom-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl border",
              "border-white/10 bg-black/40 backdrop-blur-md",
              "opacity-0 transition group-hover:opacity-100",
              "hover:border-red-400/40 hover:bg-red-500/10 hover:shadow-[0_0_0_1px_rgba(248,113,113,0.25)]",
              uploading ? "pointer-events-none opacity-40" : "",
            ].join(" ")}
            aria-label="Delete banner"
            title="Delete banner"
          >
            <Trash2 className="h-5 w-5 text-red-300" />
          </button>
        ) : null}

        {/* Hidden input */}
        <input
          id="banner_upload_input"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {errorMessage && (
        <p className="text-sm text-red-400">Upload error: {errorMessage}</p>
      )}
    </div>
  );
}



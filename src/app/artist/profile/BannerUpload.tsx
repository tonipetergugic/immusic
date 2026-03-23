"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BannerPreview from "./BannerPreview";
import { setBannerUrlAction } from "./bannerActions";
import { setBannerPosYAction } from "./bannerActions";
import { Trash2 } from "lucide-react";

export default function BannerUpload({
  userId,
  currentBannerUrl,
  currentBannerPosY,
}: {
  userId: string;
  currentBannerUrl: string | null;
  currentBannerPosY: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [posY, setPosY] = useState<number>(currentBannerPosY ?? 50);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isPositionDragging, setIsPositionDragging] = useState(false);
  const [isCommittingPos, setIsCommittingPos] = useState(false);
  const [positionSaveState, setPositionSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const posYRef = useRef<number>(posY);

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

    } catch {
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

  useEffect(() => {
    setPosY(currentBannerPosY ?? 50);
  }, [currentBannerPosY]);

  useEffect(() => {
    if (!isDeleteModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (deleting) return;
      setIsDeleteModalOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleteModalOpen, deleting]);

  useEffect(() => {
    posYRef.current = posY;
  }, [posY]);

  const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

  const computePosYFromPointer = (clientY: number): number => {
    const el = previewRef.current;
    if (!el) return posYRef.current ?? 50;

    const rect = el.getBoundingClientRect();
    const y = clamp(clientY - rect.top, 0, rect.height);
    const pct = rect.height > 0 ? (y / rect.height) * 100 : 50;
    return Math.round(clamp(pct, 0, 100));
  };

  const commitBannerPosY = async (value: number) => {
    if (isCommittingPos) return;

    setIsCommittingPos(true);
    setPositionSaveState("saving");
    setErrorMessage(null);

    try {
      await setBannerPosYAction(value);
      setPositionSaveState("saved");

      window.setTimeout(() => {
        setPositionSaveState("idle");
      }, 1600);
    } catch (err: any) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else if (typeof err === "string") {
        setErrorMessage(err);
      } else {
        setErrorMessage("Failed to save banner position.");
      }

      setPositionSaveState("idle");
    } finally {
      setIsCommittingPos(false);
    }
  };

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

          void uploadFile(file);
        }}
      >
        {/* Preview (drag to reposition) */}
        <div
          ref={previewRef}
          className={[
            "relative h-[220px] sm:h-[240px] overflow-hidden rounded-2xl",
            currentBannerUrl ? "cursor-grab active:cursor-grabbing" : "",
            isPositionDragging ? "ring-2 ring-[#00FFC6]/30" : "",
          ].join(" ")}
          onPointerDown={async (e) => {
            if (!currentBannerUrl) return;
            if (uploading) return;
            if (isCommittingPos) return;

            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            setIsPositionDragging(true);

            const v = computePosYFromPointer(e.clientY);
            setPosY(v);
          }}
          onPointerMove={(e) => {
            if (!currentBannerUrl) return;
            if (!isPositionDragging) return;

            const v = computePosYFromPointer(e.clientY);
            setPosY(v);
          }}
          onPointerUp={async () => {
            if (!currentBannerUrl) return;
            if (!isPositionDragging) return;

            setIsPositionDragging(false);
            await commitBannerPosY(posYRef.current ?? 50);
          }}
          onPointerCancel={async () => {
            if (!currentBannerUrl) return;
            if (!isPositionDragging) return;

            setIsPositionDragging(false);
            await commitBannerPosY(posYRef.current ?? 50);
          }}
          aria-label="Drag to reposition banner"
        >
          <BannerPreview url={currentBannerUrl} posY={posY} />

        </div>

        {/* Click overlay to trigger file input (works even when banner exists) */}
        <label
          htmlFor="banner_upload_input"
          className={[
            "absolute inset-0 cursor-pointer",
            uploading || deleting || isDeleteModalOpen ? "pointer-events-none" : "",
          ].join(" ")}
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
            onClick={() => {
              if (uploading) return;
              setIsDeleteModalOpen(true);
            }}
            className={[
              "absolute bottom-3 right-3 z-10 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border",
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

      {currentBannerUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-sm text-white/70">Banner position</div>

            <div className="text-xs">
              {positionSaveState === "saving" ? (
                <span className="text-[#00FFC6]">Saving...</span>
              ) : positionSaveState === "saved" ? (
                <span className="text-emerald-300">Saved</span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={posY}
              disabled={uploading || isCommittingPos}
              onChange={(e) => {
                const v = Number(e.target.value);
                setPosY(v);
              }}
              onPointerUp={async () => {
                await commitBannerPosY(posYRef.current ?? 50);
              }}
              onPointerCancel={async () => {
                await commitBannerPosY(posYRef.current ?? 50);
              }}
              className="w-full cursor-pointer accent-[#00FFC6] disabled:cursor-not-allowed"
              aria-label="Banner vertical position"
            />
            <div className="w-12 text-right text-sm text-white/50 tabular-nums">
              {posY}
            </div>
          </div>

          <div className="text-sm text-[#B3B3B3]">
            Tip: adjust what part of the image stays visible after cropping.
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={() => {
            if (deleting) return;
            setIsDeleteModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111214] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-white">
                Delete banner?
              </h3>
              <p className="mt-2 text-sm text-[#B3B3B3]">
                This will permanently remove your current banner image.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (deleting) return;
                  setIsDeleteModalOpen(false);
                }}
                disabled={deleting}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!currentBannerUrl || deleting) return;

                  setDeleting(true);
                  setErrorMessage(null);

                  try {
                    await setBannerUrlAction(null);

                    const { data: listed } = await supabase.storage
                      .from("profile-banners")
                      .list(userId, { limit: 100, offset: 0 });

                    const toDelete = (listed ?? []).map((f) => `${userId}/${f.name}`);

                    if (toDelete.length > 0) {
                      await supabase.storage.from("profile-banners").remove(toDelete);
                    }

                    setIsDeleteModalOpen(false);
                    window.location.href = "/artist/profile?banner-deleted=1";
                  } catch (err: any) {
                    if (err instanceof Error) setErrorMessage(err.message);
                    else setErrorMessage(String(err));
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="inline-flex min-w-[140px] cursor-pointer items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-400/50 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete banner"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage && (
        <p className="text-sm text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}



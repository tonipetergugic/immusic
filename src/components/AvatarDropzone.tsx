"use client";

import { useState, DragEvent, useEffect, useRef } from "react";

function showNotice(message: string) {
  window.dispatchEvent(
    new CustomEvent("immusic:notice", { detail: { message } })
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image could not be loaded."));
    };

    img.src = objectUrl;
  });
}

async function createSquareAvatarFile(params: {
  file: File;
  posX: number;
  posY: number;
  zoom: number;
  outputSize?: number;
}): Promise<File> {
  const { file, posX, posY, zoom, outputSize = 1024 } = params;

  const img = await loadImageFromFile(file);

  const sourceWidth = img.naturalWidth;
  const sourceHeight = img.naturalHeight;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Invalid image dimensions.");
  }

  const coverBase = Math.max(outputSize / sourceWidth, outputSize / sourceHeight);
  const totalScale = coverBase * (zoom / 100);

  const renderedWidth = sourceWidth * totalScale;
  const renderedHeight = sourceHeight * totalScale;

  const maxOffsetX = Math.max(0, renderedWidth - outputSize);
  const maxOffsetY = Math.max(0, renderedHeight - outputSize);

  const offsetX = (clamp(posX, 0, 100) / 100) * maxOffsetX;
  const offsetY = (clamp(posY, 0, 100) / 100) * maxOffsetY;

  const sourceCropX = offsetX / totalScale;
  const sourceCropY = offsetY / totalScale;
  const sourceCropWidth = outputSize / totalScale;
  const sourceCropHeight = outputSize / totalScale;

  const safeCropX = clamp(sourceCropX, 0, sourceWidth);
  const safeCropY = clamp(sourceCropY, 0, sourceHeight);
  const safeCropWidth = Math.min(sourceCropWidth, sourceWidth - safeCropX);
  const safeCropHeight = Math.min(sourceCropHeight, sourceHeight - safeCropY);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context is not available.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    img,
    safeCropX,
    safeCropY,
    safeCropWidth,
    safeCropHeight,
    0,
    0,
    outputSize,
    outputSize
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (!value) {
        reject(new Error("Avatar export failed."));
        return;
      }

      resolve(value);
    }, "image/jpeg", 0.92);
  });

  const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar";

  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export default function AvatarDropzone({
  onFileSelected,
  avatarUrl,
  avatarPosX,
  avatarPosY,
  avatarZoom,
  onPositionChange,
  onPositionCommit,
}: {
  onFileSelected: (file: File | null) => void | Promise<void>;
  avatarUrl: string | null;
  avatarPosX: number;
  avatarPosY: number;
  avatarZoom: number;
  onPositionChange: (x: number, y: number) => void;
  onPositionCommit: (x: number, y: number) => void | Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [dragActive, setDragActive] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftPreview, setDraftPreview] = useState<string | null>(null);
  const [draftPosX, setDraftPosX] = useState<number>(50);
  const [draftPosY, setDraftPosY] = useState<number>(50);
  const [draftZoom, setDraftZoom] = useState<number>(100);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isSavingCrop, setIsSavingCrop] = useState(false);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const cropViewportRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draggingImageRef = useRef(false);
  const draftPosXRef = useRef<number>(50);
  const draftPosYRef = useRef<number>(50);
  const localPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setPreview(avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
        localPreviewUrlRef.current = null;
      }
    };
  }, []);

  function setDraftPosition(nextX: number, nextY: number) {
    setDraftPosX(nextX);
    setDraftPosY(nextY);
    draftPosXRef.current = nextX;
    draftPosYRef.current = nextY;
  }

  function computePositionFromPointer(clientX: number, clientY: number) {
    const el = cropViewportRef.current;

    if (!el) {
      return {
        x: draftPosXRef.current ?? 50,
        y: draftPosYRef.current ?? 50,
      };
    }

    const rect = el.getBoundingClientRect();

    const localX = clamp(clientX - rect.left, 0, rect.width);
    const localY = clamp(clientY - rect.top, 0, rect.height);

    const x = rect.width > 0 ? Math.round((localX / rect.width) * 100) : 50;
    const y = rect.height > 0 ? Math.round((localY / rect.height) * 100) : 50;

    return {
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
    };
  }

  function closeCropper() {
    if (isSavingCrop) return;

    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }

    draggingImageRef.current = false;
    setIsDraggingImage(false);
    setIsCropOpen(false);
    setDraftFile(null);
    setDraftPreview(null);
    setDraftPosX(50);
    setDraftPosY(50);
    setDraftZoom(100);
    draftPosXRef.current = 50;
    draftPosYRef.current = 50;
  }

  function openCropperWithFile(file: File) {
    if (!file.type.startsWith("image/")) {
      showNotice("Only image files are allowed.");
      return;
    }

    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }

    const objectUrl = URL.createObjectURL(file);
    localPreviewUrlRef.current = objectUrl;

    setDraftFile(file);
    setDraftPreview(objectUrl);
    setDraftPosX(50);
    setDraftPosY(50);
    setDraftZoom(100);
    draftPosXRef.current = 50;
    draftPosYRef.current = 50;
    setIsCropOpen(true);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];
    openCropperWithFile(file);
  }

  async function saveCrop() {
    if (!draftFile || isSavingCrop) return;

    try {
      setIsSavingCrop(true);

      const squareFile = await createSquareAvatarFile({
        file: draftFile,
        posX: draftPosX,
        posY: draftPosY,
        zoom: draftZoom,
        outputSize: 1024,
      });

      await onFileSelected(squareFile);
      closeCropper();
    } catch (error) {
      console.error(error);
      showNotice("Avatar could not be processed.");
    } finally {
      setIsSavingCrop(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

return (
  <div className="w-full space-y-3">
    <div
      ref={previewRef}
      className={`
        relative aspect-square w-full overflow-hidden rounded-xl border border-[#00FFC622]
        bg-[#1A1A1A]
        transition-all duration-150
        cursor-pointer
        ${dragActive ? "border-[#00FFC6] bg-[#00FFC620]" : ""}
      `}
      onDragEnter={() => setDragActive(true)}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      {preview ? (
        <img
          src={preview}
          alt="Avatar preview"
          className="h-full w-full select-none object-cover will-change-transform"
          draggable={false}
          style={{
            objectPosition: `${avatarPosX}% ${avatarPosY}%`,
            transform: `scale(${avatarZoom / 100})`,
            transformOrigin: `${avatarPosX}% ${avatarPosY}%`,
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6 text-center">
          <span className="text-sm leading-6 text-neutral-400">
            Drop an image or click
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        id="avatarFileInput"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </div>

    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="
            inline-flex items-center justify-center
            rounded-full border border-white/10
            px-4 py-2
            text-sm font-medium text-white/80
            transition
            cursor-pointer
            hover:border-[#00FFC6]
            hover:text-[#00FFC6]
            hover:bg-white/[0.03]
          "
        >
          Change image
        </button>
      </div>

      <div className="text-xs leading-5 text-white/45">
        Recommended: use a square image (1:1), at least 1024 × 1024 px. Keep the face centered and leave a bit of space around the head for cropping.
      </div>
    </div>

    {isCropOpen && draftPreview ? (
      <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-[760px] rounded-[28px] border border-white/10 bg-[#0B0B0E] p-5 sm:p-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-white">Adjust avatar</h3>
            <p className="text-sm leading-6 text-white/65">
              Move and zoom your image. The saved avatar file will be exported as a square 1:1 image.
            </p>
          </div>

          <div className="mt-6">
            <div
              ref={cropViewportRef}
              className={`
                relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden rounded-[32px] bg-[#111]
                ${isDraggingImage ? "cursor-grabbing" : "cursor-grab"}
              `}
              style={{ touchAction: "none" }}
              onPointerDown={(e) => {
                e.preventDefault();
                draggingImageRef.current = true;
                setIsDraggingImage(true);

                if (e.currentTarget.setPointerCapture) {
                  e.currentTarget.setPointerCapture(e.pointerId);
                }

                const next = computePositionFromPointer(e.clientX, e.clientY);
                setDraftPosition(next.x, next.y);
              }}
              onPointerMove={(e) => {
                if (!draggingImageRef.current) return;

                e.preventDefault();
                const next = computePositionFromPointer(e.clientX, e.clientY);
                setDraftPosition(next.x, next.y);
              }}
              onPointerUp={(e) => {
                if (!draggingImageRef.current) return;

                e.preventDefault();
                draggingImageRef.current = false;
                setIsDraggingImage(false);

                const next = computePositionFromPointer(e.clientX, e.clientY);
                setDraftPosition(next.x, next.y);

                if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
              }}
              onPointerCancel={(e) => {
                if (!draggingImageRef.current) return;

                draggingImageRef.current = false;
                setIsDraggingImage(false);

                if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
              }}
            >
              <img
                src={draftPreview}
                alt="Avatar crop preview"
                className="h-full w-full select-none object-cover will-change-transform"
                draggable={false}
                style={{
                  objectPosition: `${draftPosX}% ${draftPosY}%`,
                  transform: `scale(${draftZoom / 100})`,
                  transformOrigin: `${draftPosX}% ${draftPosY}%`,
                }}
              />

              <div className="pointer-events-none absolute inset-[6%] rounded-full border border-white/25 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]" />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setDraftZoom((value) => clamp(value - 5, 100, 200))}
              className="
                inline-flex h-12 w-12 items-center justify-center
                rounded-xl border border-white/10
                text-2xl text-white/80
                transition
                cursor-pointer
                hover:border-[#00FFC6]
                hover:text-[#00FFC6]
              "
            >
              −
            </button>

            <input
              type="range"
              min={100}
              max={200}
              step={1}
              value={draftZoom}
              onChange={(e) => setDraftZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-white"
            />

            <button
              type="button"
              onClick={() => setDraftZoom((value) => clamp(value + 5, 100, 200))}
              className="
                inline-flex h-12 w-12 items-center justify-center
                rounded-xl border border-white/10
                text-2xl text-white/80
                transition
                cursor-pointer
                hover:border-[#00FFC6]
                hover:text-[#00FFC6]
              "
            >
              +
            </button>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeCropper}
              disabled={isSavingCrop}
              className="
                inline-flex items-center justify-center
                rounded-xl border border-white/10
                px-5 py-3
                text-sm font-medium text-white/80
                transition
                cursor-pointer
                hover:border-white/20
                hover:bg-white/[0.03]
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={saveCrop}
              disabled={isSavingCrop}
              className="
                inline-flex min-w-[140px] items-center justify-center
                rounded-xl border border-[#00FFC655]
                bg-white
                px-5 py-3
                text-sm font-semibold text-black
                transition
                cursor-pointer
                hover:bg-white/90
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {isSavingCrop ? "Saving..." : "Save avatar"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
  </div>
);
}

"use client";

import { useState, useRef, useEffect } from "react";
import { ImagePlus } from "lucide-react";
import Image from "next/image";

export default function TrackCoverDropzone({
  onFileSelected,
  resetSignal,
}: {
  onFileSelected: (file: File | null) => void;
  resetSignal: number;
}) {
  const [hover, setHover] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(null);
  }, [resetSignal]);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
      onFileSelected(file);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHover(false);
    const file = e.dataTransfer.files?.[0] ?? null;

    if (file && file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
      onFileSelected(file);
    }
  }

  return (
    <div
      className={`
        border-2 border-dashed rounded-xl p-8 transition cursor-pointer
        flex flex-col items-center justify-center
        ${hover ? "border-[#00FFC6] bg-zinc-800/40"
                : "border-zinc-700 bg-zinc-900/40"}
      `}
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      {preview ? (
        <Image
          src={preview}
          alt="Cover Preview"
          width={200}
          height={200}
          className="rounded-xl object-cover"
        />
      ) : (
        <>
          <ImagePlus className="text-zinc-400 mb-3" size={32} />
          <p className="text-zinc-300 font-medium">Drop your cover image here</p>
          <p className="text-xs text-zinc-500">JPG / PNG supported</p>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelect}
      />
    </div>
  );
}


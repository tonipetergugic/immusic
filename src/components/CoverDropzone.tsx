"use client";

import { useState, useRef } from "react";

export default function CoverDropzone({
  onFileSelected,
}: {
  onFileSelected: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onFileSelected(file);
  }

  return (
    <div
      className={`
        w-full p-6 rounded-lg border
        transition cursor-pointer
        flex items-center justify-center
        ${isDragging ? "border-[#00FFC6] bg-[#0E0E10]/40" : "border-[#2A2A2D] bg-[#1A1A1D]"}
      `}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {previewUrl ? (
        <img src={previewUrl} alt="Preview" className="max-h-48 rounded-lg" />
      ) : (
        <span className="text-[#B3B3B3]">Drop image here, or click to upload</span>
      )}
    </div>
  );
}


"use client";

import { useState, DragEvent } from "react";
import Image from "next/image";

export default function CoverDropzone({
  onFileSelected,
}: {
  onFileSelected: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];
    setPreview(URL.createObjectURL(file));
    onFileSelected(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleClick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => handleFiles(input.files);
    input.click();
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        w-full h-40 rounded-xl cursor-pointer 
        flex items-center justify-center flex-col
        border-2 border-dashed transition
        ${
          dragActive
            ? "border-[#00FFC6] bg-[#00FFC610]"
            : "border-[#2A2A2D] bg-[#111112]"
        }
      `}
    >
      {preview ? (
        <Image
          src={preview}
          alt="Preview"
          width={160}
          height={160}
          className="w-full h-full object-cover rounded-xl"
        />
      ) : (
        <div className="text-center text-white/60">
          <p className="text-sm">Drag & Drop cover here</p>
          <p className="text-xs text-white/40">or click to choose</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, DragEvent, useEffect } from "react";

export default function AvatarDropzone({
  onFileSelected,
  avatarUrl,
}: {
  onFileSelected: (file: File | null) => void | Promise<void>;
  avatarUrl: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setPreview(avatarUrl);
  }, [avatarUrl]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    onFileSelected(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      className={`
        w-30 h-30 rounded-xl overflow-hidden border border-[#00FFC622]
        flex items-center justify-center cursor-pointer
        transition-all duration-150
        hover:shadow-[0_0_10px_2px_rgba(0,255,198,0.3)]
        bg-[#1A1A1A]
        ${dragActive ? "border-[#00FFC6] bg-[#00FFC620]" : ""}
      `}
      onDragEnter={() => setDragActive(true)}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById("avatarFileInput")?.click()}
    >
      {preview ? (
        <img src={preview} alt="Avatar preview" className="w-full h-full object-cover" />
      ) : (
        <span className="text-neutral-400 text-sm">Drop image or click</span>
      )}

      <input
        id="avatarFileInput"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, DragEvent } from "react";

export default function AudioDropzone({
  onFileSelected,
  resetSignal,
  fileError = false,
}: {
  onFileSelected: (file: File | null) => void;
  resetSignal: number;
  fileError?: boolean;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setFileName(null);
  }, [resetSignal]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    setFileName(file.name);
    onFileSelected(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleClick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/mpeg";
    input.onchange = () => handleFiles(input.files);
    input.click();
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
  w-full h-32 rounded-xl cursor-pointer flex items-center justify-center
  border-2 border-dashed transition
  active:scale-[0.99]
  hover:border-[#00FFC6]/60 hover:bg-white/[0.03]
  hover:shadow-[0_0_0_1px_rgba(0,255,198,0.18),0_20px_60px_rgba(0,255,198,0.10)]
  ${
    dragActive
      ? "border-[#00FFC6] bg-[#00FFC6]/10 shadow-[0_0_0_1px_rgba(0,255,198,0.30),0_28px_80px_rgba(0,255,198,0.14)]"
      : "border-[#2A2A2D] bg-[#111112]"
  }
  ${fileError ? "border-red-400/60 bg-red-400/5" : ""}
`}
    >
      {fileName ? (
        <p className="text-white/80 text-sm">{fileName}</p>
      ) : (
        <div className="text-center text-white/60">
          <p className="text-sm">Drag & Drop audio here</p>
          <p className="text-xs text-white/40">or click to choose</p>
        </div>
      )}
    </div>
  );
}

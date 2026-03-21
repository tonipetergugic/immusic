"use client";

import { useState, useEffect, DragEvent } from "react";
import { Upload as UploadIcon } from "lucide-react";

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
    // WAV ingest only (Master upload)
    input.accept = ".wav,audio/wav";
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
  w-full cursor-pointer rounded-2xl border border-white/10 bg-black/30 p-8 text-center transition
  hover:border-[#00FFC6]/40 hover:bg-black/40
  active:scale-[0.99]
  ${
    dragActive
      ? "border-[#00FFC6]/40 bg-black/40 shadow-[0_0_0_1px_rgba(0,255,198,0.20),0_20px_60px_rgba(0,255,198,0.12)]"
      : ""
  }
  ${fileError ? "border-red-400/60 bg-red-400/10" : ""}
`}
    >
      {fileName ? (
        <p className="text-sm text-white/80">{fileName}</p>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="rounded-full bg-[#00FFC6]/10 p-3">
            <UploadIcon className="h-5 w-5 text-[#00FFC6]" />
          </div>

          <p className="text-sm font-medium text-white">
            Drag & drop your audio file
          </p>

          <p className="text-sm text-white/50">
            or click to browse
          </p>
        </div>
      )}
    </div>
  );
}

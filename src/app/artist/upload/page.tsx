"use client";

import { useState } from "react";
import { Plus, ArrowRight, RotateCcw } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AudioDropzone from "@/components/AudioDropzone";
import { submitToQueueAction } from "./actions";

export default function ArtistUploadPage() {
  const supabase = createSupabaseBrowserClient();

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [rightsAccepted, setRightsAccepted] = useState(false);

  function formatMB(bytes: number) {
    return (bytes / (1024 * 1024)).toFixed(1);
  }

  function handleFileSelected(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }

    const ext = (next.name.split(".").pop() || "").toLowerCase();

    if (ext !== "mp3") {
      alert("Only MP3 files are supported. Please export your track as MP3.");
      setFile(null);
      setResetSignal((s) => s + 1);
      return;
    }

    setFile(next);
  }

  async function handleUpload() {
    if (!file) return;

    const extCheck = (file.name.split(".").pop() || "").toLowerCase();
    if (extCheck !== "mp3") {
      alert("Only MP3 files are supported. Please export your track as MP3.");
      setUploading(false);
      return;
    }

    setUploading(true);

    // User abrufen
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Not authenticated");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const fileSafeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const filePath = `${user.id}/${fileSafeTitle}.${ext}`;

    const { error } = await supabase.storage.from("tracks").upload(filePath, file);

    if (error) {
      console.error(error);
      alert("Upload failed");
      setUploading(false);
      return;
    }

    setAudioPath(filePath);
    setUploading(false);
  }

  return (
    <div className="w-full max-w-[900px] mx-auto text-white px-6 py-6 lg:px-10 lg:py-8 pb-40 lg:pb-48">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">Upload Track</h1>
          <p className="mt-2 text-sm text-[#B3B3B3]">
            Upload your audio file and submit it for quality control.
          </p>
        </div>
      </div>

      {/* Panel */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-white/80" htmlFor="track-title">
            Track title
          </label>
          <input
            id="track-title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cosmic Puls"
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
          />
          <p className="mt-2 text-sm text-[#B3B3B3]">
            Tip: use the exact track title you want to show publicly.
          </p>
        </div>

        {/* Dropzone */}
        <div className="mt-6">
          <div className="text-sm font-medium text-white/80">Audio file</div>

          <p className="mt-2 text-sm text-[#B3B3B3]">
            Recommended for now: <span className="text-white/80">MP3 (320 kbps)</span>, 44.1 kHz or 48 kHz, stereo.
          </p>
          <p className="mt-2 text-xs text-white/60 leading-relaxed">
            Most streaming platforms re-encode audio into efficient streaming formats.
            A high-quality MP3 (320 kbps) is perceptually very close to the original and fully sufficient for streaming.
          </p>

          <div className="mt-3">
            <AudioDropzone onFileSelected={handleFileSelected} resetSignal={resetSignal} />
          </div>

          {file ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.12em] text-white/60">
                    Selected file
                  </div>
                  <div className="mt-2 text-sm text-white/90 break-all">
                    {file.name}
                  </div>
                  <div className="mt-1 text-sm text-[#B3B3B3]">
                    {(file.name.split(".").pop() || "").toUpperCase()} · {formatMB(file.size)} MB
                  </div>
                </div>

                {(file.name.split(".").pop() || "").toLowerCase() === "mp3" ? (
                  <span className="shrink-0 inline-flex items-center rounded-full border border-[#00FFC6]/30 bg-[#00FFC6]/10 px-2.5 py-1 text-[11px] font-medium text-[#00FFC6]">
                    MP3 detected
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/70">
                    MP3 320 kbps recommended
                  </span>
                )}
              </div>
            </div>
          ) : null}

          <label className="mt-6 flex items-start gap-3 rounded-xl border border-[#00FFC6]/30 bg-[#00FFC6]/[0.04] px-4 py-3 ring-1 ring-[#00FFC6]/20">
            <input
              type="checkbox"
              checked={rightsAccepted}
              onChange={(e) => setRightsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.03] accent-[#00FFC6]"
            />
            <span className="text-sm font-medium text-white/90 leading-relaxed">
              I confirm that I own or control all rights to this recording and that it does not contain any copyrighted material used without permission.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6">
          {file && !audioPath && (
            <button
              onClick={handleUpload}
              disabled={uploading || title.trim().length === 0 || !rightsAccepted}
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.06] hover:border-[#00FFC6]/60 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_20px_60px_rgba(0,255,198,0.15)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
              type="button"
            >
              <Plus size={16} strokeWidth={2.5} className="text-white/70 transition group-hover:text-[#00FFC6]" />
              <span>{uploading ? "Uploading..." : "Upload to Storage"}</span>
            </button>
          )}

          {audioPath && (
            <div className="mt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.12em] text-white/60">
                    Uploaded to storage
                  </div>
                  <div className="mt-2 text-sm text-[#B3B3B3] break-all">
                    {audioPath}
                  </div>
                </div>

                <span className="shrink-0 inline-flex items-center rounded-full border border-[#00FFC6]/30 bg-[#00FFC6]/10 px-2.5 py-1 text-[11px] font-medium text-[#00FFC6]">
                  Ready
                </span>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setTitle("");
                    setFile(null);
                    setAudioPath(null);
                    setRightsAccepted(false);
                    setResetSignal((s) => s + 1);
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
                >
                  <RotateCcw size={16} strokeWidth={2.5} className="text-white/40" />
                  Reset upload
                </button>
              </div>

              <form action={submitToQueueAction} className="mt-6 flex items-center gap-3">
                <input type="hidden" name="audio_path" value={audioPath!} />
                <input type="hidden" name="title" value={title} />
                <button
                  type="submit"
                  disabled={!rightsAccepted}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.06] hover:border-[#00FFC6]/60 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_20px_60px_rgba(0,255,198,0.15)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
                >
                  <ArrowRight size={16} strokeWidth={2.5} className="text-white/70 transition group-hover:text-[#00FFC6]" />
                  Submit to QC
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Plus, ArrowRight, RotateCcw, Upload as UploadIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AudioDropzone from "@/components/AudioDropzone";
import { submitToQueueAction } from "../actions";

type Props = { userId: string };

function formatMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ArtistUploadClient({ userId }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [fileError, setFileError] = useState(false);

  const hasTitleError = titleTouched && !title.trim();

  function handleFileSelected(next: File | null) {
    if (!next) {
      setFile(null);
      setFileError(false);
      return;
    }

    const ext = (next.name.split(".").pop() || "").toLowerCase();
    if (ext !== "mp3") {
      setFileError(true);
      setFile(null);
      setResetSignal((s) => s + 1);
      return;
    }

    setFileError(false);
    setFile(next);
  }

  async function handleUpload() {
    if (!file) return;

    const extCheck = (file.name.split(".").pop() || "").toLowerCase();
    if (extCheck !== "mp3") {
      alert("Only MP3 files are supported. Please export your track as MP3.");
      return;
    }

    setUploading(true);

    const safeTitle = slugify(title.trim()) || "untitled";
    const filePath = `${userId}/${safeTitle}-${randomId()}.mp3`;

    const { error } = await supabase.storage.from("tracks").upload(filePath, file, {
      contentType: "audio/mpeg",
      upsert: false,
    });

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
    <div className="w-full text-white">
      <div className="w-full max-w-[820px] mx-auto">
        {/* Header (visual hero) */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#00FFC6]/10 via-white/[0.02] to-transparent px-6 py-7 sm:px-8 sm:py-8">
        {/* soft shapes */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#00FFC6]/10 blur-3xl" />
          <div className="absolute -top-16 right-[-120px] h-72 w-72 rounded-full bg-[#00FFC6]/6 blur-3xl" />
        </div>

        <div className="relative">
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-white">
            <UploadIcon className="h-7 w-7 text-[#00FFC6]" aria-hidden="true" />
            <span>Upload Track</span>
          </h1>
          <p className="mt-2 text-sm text-[#B3B3B3]">
            Upload your audio file and submit it for quality control.
          </p>
        </div>
      </div>

      {/* Panel */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_-1px_0_0_rgba(255,255,255,0.06)] sm:p-8">
        {/* Title */}
        <div>
          <label className="block text-lg font-semibold text-white" htmlFor="track-title">
            Track title
          </label>
          <input
            id="track-title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTitleTouched(true)}
            placeholder="e.g. Cosmic Puls"
            className={`w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/90 placeholder:text-white/35 transition focus:outline-none focus:border-[#00FFC6]/60 focus:shadow-[0_0_0_2px_rgba(0,255,198,0.16),0_0_40px_rgba(0,255,198,0.10)] ${hasTitleError ? "border-red-400/60 focus:border-red-400/80 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.25)]" : ""}`}
          />
          {hasTitleError ? (
            <p className="mt-2 text-sm text-red-400/90">Please enter a track title.</p>
          ) : (
            <p className="mt-2 text-sm text-[#B3B3B3]">
              Tip: use the exact track title you want to show publicly.
            </p>
          )}
        </div>

        {/* Dropzone */}
        <div className="mt-6">
          <div className="mt-8 text-lg font-semibold text-white">Audio file</div>
          <p className="mt-2 text-sm text-[#B3B3B3]">
            Recommended for now: <span className="text-white/80">MP3 (320 kbps)</span>, 44.1 kHz or 48 kHz, stereo.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white/60">
            Most streaming platforms re-encode audio into efficient streaming formats. A high-quality MP3 (320 kbps) is
            perceptually very close to the original and fully sufficient for streaming.
          </p>

          <div className="mt-3">
            <AudioDropzone
              onFileSelected={handleFileSelected}
              resetSignal={resetSignal}
              fileError={fileError}
            />
            {fileError && (
              <p className="mt-2 text-sm text-red-400/90">
                Please upload a valid MP3 file (320 kbps recommended).
              </p>
            )}
          </div>

          {file ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.12em] text-white/60">Selected file</div>
                  <div className="mt-2 break-all text-sm text-white/90">{file.name}</div>
                  <div className="mt-1 text-sm text-[#B3B3B3]">
                    {(file.name.split(".").pop() || "").toUpperCase()} · {formatMB(file.size)} MB
                  </div>
                </div>

                {(file.name.split(".").pop() || "").toLowerCase() === "mp3" ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-[#00FFC6]/30 bg-[#00FFC6]/10 px-2.5 py-1 text-[11px] font-medium text-[#00FFC6]">
                    MP3 detected
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/70">
                    MP3 320 kbps recommended
                  </span>
                )}
              </div>
            </div>
          ) : null}

          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-[#00FFC6]/40 hover:bg-white/[0.03]">
            <input
              type="checkbox"
              checked={rightsAccepted}
              onChange={(e) => setRightsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.03] accent-[#00FFC6]"
            />
            <span className="text-sm font-medium leading-relaxed text-white/90">
              I confirm that I own or control all rights to this recording and that it does not contain any copyrighted
              material used without permission.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6">
          {file && !audioPath && (
            <button
              onClick={handleUpload}
              disabled={uploading || title.trim().length === 0 || !rightsAccepted}
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:border-[#00FFC6]/60 hover:bg-white/[0.06] hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_20px_60px_rgba(0,255,198,0.15)] active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
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
                  <div className="text-xs uppercase tracking-[0.12em] text-white/60">Uploaded to storage</div>
                  <div className="mt-2 break-all text-sm text-[#B3B3B3]">{audioPath}</div>
                </div>

                <span className="inline-flex shrink-0 items-center rounded-full border border-[#00FFC6]/30 bg-[#00FFC6]/10 px-2.5 py-1 text-[11px] font-medium text-[#00FFC6]">
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
                    setTitleTouched(false);
                    setResetSignal((s) => s + 1);
                    setFileError(false);
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
                  className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:border-[#00FFC6]/60 hover:bg-white/[0.06] hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_20px_60px_rgba(0,255,198,0.15)] active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
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
  </div>
  );
}

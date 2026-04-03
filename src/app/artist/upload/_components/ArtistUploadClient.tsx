"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw, Upload as UploadIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AudioDropzone from "@/components/AudioDropzone";

type WavValidation =
  | { ok: true; durationSeconds: number; sampleRate: number; channels: number; bitsPerSample: number }
  | { ok: false; reason: string };

function readFourCC(view: DataView, offset: number) {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

async function validateWavFile(file: File): Promise<WavValidation> {
  const riffHeader = await file.slice(0, 12).arrayBuffer();
  if (riffHeader.byteLength < 12 || file.size < 44) {
    return { ok: false, reason: "Invalid WAV: file too small." };
  }

  const riffView = new DataView(riffHeader);

  const riff = readFourCC(riffView, 0);
  const wave = readFourCC(riffView, 8);
  if (riff !== "RIFF" || wave !== "WAVE") {
    return { ok: false, reason: "Invalid WAV: missing RIFF/WAVE header." };
  }

  let offset = 12;
  let fmtFound = false;
  let dataFound = false;

  let audioFormat: number | null = null;
  let channels: number | null = null;
  let sampleRate: number | null = null;
  let bitsPerSample: number | null = null;
  let dataBytes: number | null = null;

  while (offset + 8 <= file.size) {
    const chunkHeader = await file.slice(offset, offset + 8).arrayBuffer();
    if (chunkHeader.byteLength < 8) break;

    const headerView = new DataView(chunkHeader);
    const id = readFourCC(headerView, 0);
    const size = headerView.getUint32(4, true);
    const chunkDataStart = offset + 8;

    if (id === "fmt ") {
      if (size < 16) {
        return { ok: false, reason: "Invalid WAV: corrupt fmt chunk." };
      }

      const fmtChunk = await file.slice(chunkDataStart, chunkDataStart + 16).arrayBuffer();
      if (fmtChunk.byteLength < 16) {
        return { ok: false, reason: "Invalid WAV: corrupt fmt chunk." };
      }

      const fmtView = new DataView(fmtChunk);
      audioFormat = fmtView.getUint16(0, true);
      channels = fmtView.getUint16(2, true);
      sampleRate = fmtView.getUint32(4, true);
      bitsPerSample = fmtView.getUint16(14, true);
      fmtFound = true;
    } else if (id === "data") {
      dataBytes = size;
      dataFound = true;
    }

    offset = chunkDataStart + size + (size % 2);

    if (fmtFound && dataFound) break;
  }

  if (!fmtFound || audioFormat == null || channels == null || sampleRate == null || bitsPerSample == null) {
    return { ok: false, reason: "Invalid WAV: missing fmt chunk." };
  }

  if (!dataFound || dataBytes == null) {
    return { ok: false, reason: "Invalid WAV: missing data chunk." };
  }

  if (audioFormat !== 1) {
    return { ok: false, reason: "Unsupported WAV: only PCM is allowed (16/24-bit)." };
  }

  if (channels !== 2) {
    return { ok: false, reason: "Unsupported WAV: must be stereo (2 channels)." };
  }

  if (sampleRate !== 44100 && sampleRate !== 48000) {
    return { ok: false, reason: "Unsupported WAV: sample rate must be 44.1 kHz or 48 kHz." };
  }

  if (bitsPerSample !== 16 && bitsPerSample !== 24) {
    return { ok: false, reason: "Unsupported WAV: bit depth must be 16-bit or 24-bit." };
  }

  const bytesPerSample = bitsPerSample / 8;
  const bytesPerSecond = sampleRate * channels * bytesPerSample;
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
    return { ok: false, reason: "Invalid WAV: cannot compute duration." };
  }

  const durationSeconds = dataBytes / bytesPerSecond;

  if (durationSeconds > 600.0) {
    return { ok: false, reason: "Track too long: max length is 10 minutes." };
  }

  return { ok: true, durationSeconds, sampleRate, channels, bitsPerSample };
}

type Props = { userId: string };

type QueueApiResponse =
  | { ok: true; queue_id: string }
  | { ok: false; error: string };

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
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState<"idle" | "validating" | "uploading" | "queueing">("idle");

  const hasTitleError = titleTouched && !title.trim();

  function handleFileSelected(next: File | null) {
    if (!next) {
      setFile(null);
      setFileError(false);
      setUiError(null);
      setAudioPath(null);
      setFlowStep("idle");
      return;
    }

    const ext = (next.name.split(".").pop() || "").toLowerCase();
    if (ext !== "wav") {
      setFileError(true);
      setUiError("Only WAV files are supported. Please export your track as WAV.");
      setFile(null);
      setAudioPath(null);
      setResetSignal((s) => s + 1);
      setFlowStep("idle");
      return;
    }

    setUiError(null);
    setAudioPath(null);
    setFileError(false);
    setFile(next);
  }

  async function handleUpload() {
    if (!file) return;

    setUiError(null);

    const extCheck = (file.name.split(".").pop() || "").toLowerCase();
    if (extCheck !== "wav") {
      setFileError(true);
      setUiError("Only WAV files are supported. Please export your track as WAV.");
      return;
    }

    if (!title.trim()) {
      setTitleTouched(true);
      setUiError("Please enter a track title.");
      return;
    }

    if (!rightsAccepted) {
      setUiError("Please confirm your rights before uploading.");
      return;
    }

    setUploading(true);
    let uploadedFilePath: string | null = null;

    try {
      setFlowStep("validating");

      const v = await validateWavFile(file);
      if (!v.ok) {
        setUiError(v.reason);
        setUploading(false);
        setFlowStep("idle");
        return;
      }

      setFlowStep("uploading");

      const safeTitle = slugify(title.trim()) || "untitled";
      const filePath = `${userId}/${safeTitle}-${randomId()}.wav`;

      const { error } = await supabase.storage.from("ingest_wavs").upload(filePath, file, {
        contentType: "audio/wav",
        upsert: false,
      });

      if (error) {
        console.error(error);
        setUiError("Upload failed. Please try again.");
        setUploading(false);
        setFlowStep("idle");
        return;
      }

      uploadedFilePath = filePath;
      setAudioPath(filePath);
      setFlowStep("queueing");

      const queueRes = await fetch("/api/artist/upload/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_path: filePath,
          title: title.trim(),
        }),
      });

      const queueData = (await queueRes.json()) as QueueApiResponse;

      if (!queueRes.ok || !queueData.ok || !queueData.queue_id) {
        if (uploadedFilePath) {
          const { error: removeError } = await supabase.storage
            .from("ingest_wavs")
            .remove([uploadedFilePath]);

          if (removeError) {
            console.error(removeError);
          }

          uploadedFilePath = null;
          setAudioPath(null);
        }

        setUiError(
          "error" in queueData && queueData.error
            ? queueData.error
            : "Could not start the quality check. Please try again."
        );
        setUploading(false);
        setFlowStep("idle");
        return;
      }

      router.push(
        `/artist/upload/processing?queue_id=${encodeURIComponent(queueData.queue_id)}`
      );
      return;
    } catch (e) {
      console.error(e);

      if (uploadedFilePath) {
        const { error: removeError } = await supabase.storage
          .from("ingest_wavs")
          .remove([uploadedFilePath]);

        if (removeError) {
          console.error(removeError);
        }

        uploadedFilePath = null;
        setAudioPath(null);
      }

      setUiError("Could not start the quality check. Please try again.");
      setUploading(false);
      setFlowStep("idle");
    }
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
            <span>
              Upload <span className="text-[#00FFC6]">Track</span>
            </span>
          </h1>
          <p className="mt-2 text-sm text-[#B3B3B3]">
            Upload your audio file and submit it for quality control.
          </p>
        </div>
      </div>

      {/* Panel */}
      <div className="mt-6 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
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
          <p className="text-sm text-white/70">
            WAV (Master), 44.1 kHz or 48 kHz, 16-bit or 24-bit, stereo
          </p>

          <p className="mt-1 text-sm text-white/40">
            Max length: 10 minutes
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white/60">
            IMUSIC uses lossless WAV ingest for reliable analysis. After quality control, the system transcodes to MP3 for streaming.
          </p>

          <div className="mt-3">
            <AudioDropzone
              onFileSelected={handleFileSelected}
              resetSignal={resetSignal}
              fileError={fileError}
            />
            {fileError && (
              <p className="mt-2 text-sm text-red-400/90">
                Please upload a valid WAV file.
              </p>
            )}
          </div>

          {file ? (
            <>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.12em] text-white/60">Selected file</div>
                    <div className="mt-2 break-all text-sm text-white/90">{file.name}</div>
                    <div className="mt-1 text-sm text-[#B3B3B3]">
                      {(file.name.split(".").pop() || "").toUpperCase()} · {formatMB(file.size)} MB
                    </div>
                  </div>

                  {(file.name.split(".").pop() || "").toLowerCase() === "wav" ? (
                    <span className="inline-flex shrink-0 items-center rounded-md border border-[#00FFC6]/40 bg-[#00FFC6]/10 px-2 py-1 text-[11px] font-medium tracking-wide text-white">
                      WAV DETECTED
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/70">
                      WAV required
                    </span>
                  )}
                </div>

                {uiError ? (
                  <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                    {uiError}
                  </div>
                ) : null}

                {audioPath && !uploading ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-white/60">
                      Uploaded file path
                    </div>
                    <div className="mt-2 break-all text-sm text-[#B3B3B3]">
                      {audioPath}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 min-h-[112px] rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                {uploading ? (
                  <>
                    <div className="text-sm font-semibold text-white">
                      {flowStep === "validating" && "Validating file..."}
                      {flowStep === "uploading" && "Uploading file..."}
                      {flowStep === "queueing" && "Starting quality check..."}
                    </div>

                    <p className="mt-1 text-sm text-white/65">
                      Please wait. Do not close this page.
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-[#00FFC6] transition-all duration-300 ${
                          flowStep === "validating"
                            ? "w-1/3"
                            : flowStep === "uploading"
                              ? "w-2/3"
                              : "w-full"
                        }`}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-[88px] items-center text-sm text-white/45">
                    Upload status will appear here.
                  </div>
                )}
              </div>
            </>
          ) : null}

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            <input
              type="checkbox"
              checked={rightsAccepted}
              onChange={(e) => setRightsAccepted(e.target.checked)}
              className="mt-1 accent-[#00FFC6]"
            />
            <span>
              I confirm that I own or control all rights to this recording and that it does not contain copyrighted material.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={handleUpload}
            disabled={!file || uploading || title.trim().length === 0 || !rightsAccepted}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#00FFC6]/30 bg-[#00FFC6]/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#00FFC6]/60 hover:bg-[#00FFC6]/16 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.22),0_20px_60px_rgba(0,255,198,0.16)] active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-white/40 disabled:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60 sm:w-[340px]"
            type="button"
          >
            <ArrowRight size={16} strokeWidth={2.5} className="text-[#00FFC6] transition group-hover:translate-x-0.5" />
            <span>
              {flowStep === "validating"
                ? "Validating..."
                : flowStep === "uploading"
                  ? "Uploading..."
                  : flowStep === "queueing"
                    ? "Starting quality check..."
                    : "Upload and start quality check"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTitle("");
              setFile(null);
              setUploading(false);
              setAudioPath(null);
              setRightsAccepted(false);
              setTitleTouched(false);
              setResetSignal((s) => s + 1);
              setFileError(false);
              setUiError(null);
              setFlowStep("idle");
            }}
            disabled={uploading}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={16} strokeWidth={2.5} className="text-white/40" />
            Reset upload
          </button>

        </div>
      </div>
    </div>
  </div>
  );
}

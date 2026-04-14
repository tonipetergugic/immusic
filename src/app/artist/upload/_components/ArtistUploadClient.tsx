"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw, Upload as UploadIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AudioDropzone from "@/components/AudioDropzone";
import AppSelect from "@/components/AppSelect";
import { useViewerRole } from "@/context/ViewerRoleContext";
import { KEY_SUGGESTIONS } from "../../my-tracks/[trackId]/edit/trackKeyOptions";
import { TRACK_VERSION_OPTIONS } from "../../my-tracks/[trackId]/edit/trackMetadataOptions";

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

type QueueApiResponse =
  | { ok: true; queue_id: string }
  | { ok: false; error: string };

const MAIN_GENRE_ITEMS = [
  { value: "Trance", label: "Trance" },
  { value: "Techno", label: "Techno" },
  { value: "House", label: "House" },
  { value: "EDM", label: "EDM" },
  { value: "Drum & Bass", label: "Drum & Bass" },
  { value: "Dubstep", label: "Dubstep" },
  { value: "Hard Dance", label: "Hard Dance" },
  { value: "Pop", label: "Pop" },
  { value: "Hip-Hop", label: "Hip-Hop" },
  { value: "R&B", label: "R&B" },
  { value: "Rock", label: "Rock" },
  { value: "Metal", label: "Metal" },
  { value: "Ambient", label: "Ambient" },
  { value: "Cinematic", label: "Cinematic" },
  { value: "LoFi", label: "LoFi" },
  { value: "Other", label: "Other" },
];

const SUBGENRE_ITEMS = [
  {
    label: "Trance",
    options: [
      { value: "Trance", label: "Trance" },
      { value: "Progressive Trance", label: "Progressive Trance" },
      { value: "Uplifting Trance", label: "Uplifting Trance" },
      { value: "Psytrance", label: "Psytrance" },
      { value: "Vocal Trance", label: "Vocal Trance" },
      { value: "Hard Trance", label: "Hard Trance" },
      { value: "Tech Trance", label: "Tech Trance" },
    ],
  },
  {
    label: "Techno",
    options: [
      { value: "Techno", label: "Techno" },
      { value: "Melodic Techno", label: "Melodic Techno" },
      { value: "Peak Time Techno", label: "Peak Time Techno" },
      { value: "Industrial Techno", label: "Industrial Techno" },
      { value: "Hard Techno", label: "Hard Techno" },
    ],
  },
  {
    label: "House / EDM",
    options: [
      { value: "House", label: "House" },
      { value: "Deep House", label: "Deep House" },
      { value: "Progressive House", label: "Progressive House" },
      { value: "Tech House", label: "Tech House" },
      { value: "Afro House", label: "Afro House" },
      { value: "Future House", label: "Future House" },
      { value: "EDM", label: "EDM" },
      { value: "Big Room", label: "Big Room" },
      { value: "Electro House", label: "Electro House" },
      { value: "Festival EDM", label: "Festival EDM" },
    ],
  },
  {
    label: "Bass Music",
    options: [
      { value: "Drum & Bass", label: "Drum & Bass" },
      { value: "Liquid Drum & Bass", label: "Liquid Drum & Bass" },
      { value: "Neurofunk", label: "Neurofunk" },
      { value: "Dubstep", label: "Dubstep" },
      { value: "Melodic Dubstep", label: "Melodic Dubstep" },
      { value: "Future Bass", label: "Future Bass" },
    ],
  },
  {
    label: "Hard Dance",
    options: [
      { value: "Hardstyle", label: "Hardstyle" },
      { value: "Rawstyle", label: "Rawstyle" },
      { value: "Hardcore", label: "Hardcore" },
      { value: "Uptempo Hardcore", label: "Uptempo Hardcore" },
    ],
  },
  {
    label: "Pop / Urban",
    options: [
      { value: "Pop", label: "Pop" },
      { value: "Dance Pop", label: "Dance Pop" },
      { value: "Indie Pop", label: "Indie Pop" },
      { value: "Hip-Hop", label: "Hip-Hop" },
      { value: "Trap", label: "Trap" },
      { value: "Drill", label: "Drill" },
      { value: "R&B", label: "R&B" },
      { value: "Soul", label: "Soul" },
    ],
  },
  {
    label: "Rock / Metal",
    options: [
      { value: "Rock", label: "Rock" },
      { value: "Alternative Rock", label: "Alternative Rock" },
      { value: "Indie Rock", label: "Indie Rock" },
      { value: "Metal", label: "Metal" },
    ],
  },
  {
    label: "Other",
    options: [
      { value: "Ambient", label: "Ambient" },
      { value: "Cinematic", label: "Cinematic" },
      { value: "LoFi", label: "LoFi" },
      { value: "Other", label: "Other" },
    ],
  },
];

const KEY_ITEMS = KEY_SUGGESTIONS.map((value) => ({
  value,
  label: value,
}));

const VERSION_ITEMS = TRACK_VERSION_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

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

export default function ArtistUploadClient() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { userId } = useViewerRole();

  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [mainGenre, setMainGenre] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [referenceArtist, setReferenceArtist] = useState("");
  const [referenceTrack, setReferenceTrack] = useState("");
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
  const canSubmit =
    Boolean(file) &&
    !uploading &&
    title.trim().length > 0 &&
    version.trim().length > 0 &&
    mainGenre.trim().length > 0 &&
    genre.trim().length > 0 &&
    bpm.trim().length > 0 &&
    key.trim().length > 0 &&
    rightsAccepted;

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

    if (!userId) {
      setUiError("Your session could not be verified. Please reload and try again.");
      return;
    }

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

    if (!version.trim()) {
      setUiError("Please select a version.");
      return;
    }

    if (!mainGenre.trim()) {
      setUiError("Please select a main genre.");
      return;
    }

    if (!genre.trim()) {
      setUiError("Please select a subgenre.");
      return;
    }

    if (!bpm.trim()) {
      setUiError("Please enter a BPM value.");
      return;
    }

    const parsedBpm = Number.parseInt(bpm.trim(), 10);
    if (Number.isNaN(parsedBpm) || parsedBpm <= 0 || parsedBpm > 300) {
      setUiError("Please enter a valid BPM value.");
      return;
    }

    if (!key.trim()) {
      setUiError("Please select a key.");
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
          version: version.trim(),
          main_genre: mainGenre.trim(),
          genre: genre.trim(),
          bpm: Number.parseInt(bpm.trim(), 10),
          key: key.trim(),
          reference_artist: referenceArtist.trim() || null,
          reference_track: referenceTrack.trim() || null,
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
      <div className="mx-auto w-full max-w-[920px]">
        <div className="border-b border-white/10 pb-8">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#B3B3B3]">
              Upload
            </p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-semibold tracking-tight text-white">
              <UploadIcon className="h-7 w-7 text-[#00FFC6]" aria-hidden="true" />
              <span>
                Upload <span className="text-[#00FFC6]">Track</span>
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#B3B3B3]">
              Upload your audio file and submit it for quality control.
            </p>
          </div>
        </div>

        <section className="pt-10">
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
              className={`w-full border-0 border-b bg-transparent px-0 pb-5 pt-3 text-[30px] leading-tight text-white placeholder:text-white/30 transition focus:outline-none ${
                hasTitleError
                  ? "border-red-400/70 focus:border-red-400"
                  : "border-white/15 focus:border-[#00FFC6]"
              }`}
            />
            {hasTitleError ? (
              <p className="mt-2 text-sm text-red-400/90">Please enter a track title.</p>
            ) : (
              <p className="mt-2 text-sm text-[#B3B3B3]">
                Tip: use the exact track title you want to show publicly.
              </p>
            )}
          </div>

          <div className="mt-10 border-b border-white/10 pb-10">
            <div className="text-2xl font-semibold tracking-tight text-white">Track metadata</div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
              These metadata are part of the feedback context. Please make sure they are correct before starting the quality check.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                  Version
                </label>
                <AppSelect
                  value={version}
                  onChange={setVersion}
                  items={VERSION_ITEMS}
                  placeholder="Select version"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                  Main Genre
                </label>
                <AppSelect
                  value={mainGenre}
                  onChange={setMainGenre}
                  items={MAIN_GENRE_ITEMS}
                  placeholder="Select main genre"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                  Subgenre
                </label>
                <AppSelect
                  value={genre}
                  onChange={setGenre}
                  items={SUBGENRE_ITEMS}
                  placeholder="Select subgenre"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                  BPM
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  step={1}
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  placeholder="e.g. 138"
                  className="w-full border-0 border-b border-white/12 bg-transparent px-0 pb-4 pt-1 text-[20px] leading-tight text-white outline-none transition focus:border-[#00FFC6]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                  Key
                </label>
                <AppSelect
                  value={key}
                  onChange={setKey}
                  items={KEY_ITEMS}
                  placeholder="Select key"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                  Reference Artist <span className="text-white/35 normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={referenceArtist}
                  onChange={(e) => setReferenceArtist(e.target.value)}
                  placeholder="e.g. Armin van Buuren"
                  className="w-full border-0 border-b border-white/12 bg-transparent px-0 pb-4 pt-1 text-[20px] leading-tight text-white outline-none transition focus:border-[#00FFC6] placeholder:text-white/30"
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                  Reference Track <span className="text-white/35 normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={referenceTrack}
                  onChange={(e) => setReferenceTrack(e.target.value)}
                  placeholder="e.g. Track Title"
                  className="w-full border-0 border-b border-white/12 bg-transparent px-0 pb-4 pt-1 text-[20px] leading-tight text-white outline-none transition focus:border-[#00FFC6] placeholder:text-white/30"
                />
                <p className="text-xs leading-6 text-white/45">
                  Reference fields are optional and should only be used when you want feedback relative to a specific artistic reference.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-b border-white/10 pb-10">
            <div className="text-2xl font-semibold tracking-tight text-white">Audio file</div>
            <p className="mt-2 text-sm text-white/70">
              WAV (Master), 44.1 kHz or 48 kHz, 16-bit or 24-bit, stereo
            </p>

            <p className="mt-1 text-sm text-white/40">
              Max length: 10 minutes
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              IMUSIC uses lossless WAV ingest for reliable analysis. After quality control, the system transcodes to MP3 for streaming.
            </p>

            <div className="mt-4">
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
              <div className="mt-6 space-y-4 border-b border-white/10 pb-6">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="break-all text-white/90">{file.name}</span>
                  <span className="text-[#B3B3B3]">
                    {(file.name.split(".").pop() || "").toUpperCase()} · {formatMB(file.size)} MB
                  </span>

                  {(file.name.split(".").pop() || "").toLowerCase() === "wav" ? (
                    <span className="inline-flex items-center rounded-md border border-[#00FFC6]/40 px-2 py-1 text-[11px] font-medium tracking-wide text-white">
                      WAV DETECTED
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70">
                      WAV required
                    </span>
                  )}
                </div>

                {uiError ? (
                  <p className="text-sm text-red-300">{uiError}</p>
                ) : null}

                {audioPath && !uploading ? (
                  <p className="break-all text-sm text-[#B3B3B3]">
                    {audioPath}
                  </p>
                ) : null}

                {uploading ? (
                  <div className="pt-1">
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
                  </div>
                ) : (
                  <p className="text-sm text-white/45">Upload status will appear here.</p>
                )}
              </div>
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

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={handleUpload}
              disabled={!canSubmit}
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
                setVersion("");
                setMainGenre("");
                setGenre("");
                setBpm("");
                setKey("");
                setReferenceArtist("");
                setReferenceTrack("");
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
        </section>
      </div>
    </div>
  );
}

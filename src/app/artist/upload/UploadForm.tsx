"use client";

import { useState, type FormEvent } from "react";
import { uploadToStorage } from "@/lib/supabase/client";
import AudioDropzone from "@/components/AudioDropzone";
import TrackCoverDropzone from "@/components/TrackCoverDropzone";

export default function UploadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [resetCounter, setResetCounter] = useState(0);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formEl = e.currentTarget;
      const baseForm = new FormData(formEl);
      const clientForm = new FormData();

      clientForm.append("title", (baseForm.get("title") as string) ?? "");
      clientForm.append("bpm", (baseForm.get("bpm") as string) ?? "");
      clientForm.append("key", (baseForm.get("key") as string) ?? "");

      const { audioUrl, coverUrl } = await handleClientUpload();

      clientForm.append("audioUrl", audioUrl);
      clientForm.append("coverUrl", coverUrl);

      const response = await fetch("/artist/upload/action", {
        method: "POST",
        body: clientForm,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setAudioFile(null);
      setCoverFile(null);
      setResetCounter((prev) => prev + 1);
      formEl.reset();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unknown upload error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClientUpload() {
    if (!audioFile) throw new Error("Audio file missing");
    if (!coverFile) throw new Error("Cover file missing");

    const audioUrl = await uploadAudio();
    const coverUrl = await uploadCover();

    return { audioUrl, coverUrl };
  }

  async function uploadAudio() {
    if (!audioFile) throw new Error("Audio file missing");
    const ts = Date.now();
    const path = `client-${ts}-${audioFile.name}`;
    const url = await uploadToStorage("tracks-audio", path, audioFile);
    return url;
  }

  async function uploadCover() {
    if (!coverFile) throw new Error("Cover file missing");
    const ts = Date.now();
    const path = `client-${ts}-${coverFile.name}`;
    const url = await uploadToStorage("tracks-cover", path, coverFile);
    return url;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Panel */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 px-4 py-3 text-sm">
          <strong className="block mb-1">Upload failed</strong>
          {error}
        </div>
      )}

      {isSubmitting && (
        <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-400 px-4 py-3 text-sm">
          Uploading your track — please wait…
        </div>
      )}

      <h2 className="text-lg font-semibold mb-2 mt-6">Track Details</h2>
      <div className="space-y-4">
        {/* Track Title */}
        <div>
          <label className="block text-sm mb-1">Track Title</label>
          <input
            type="text"
            name="title"
            required
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-0"
          />
        </div>

        {/* BPM */}
        <div>
          <label className="block text-sm mb-1">BPM</label>
          <input
            type="number"
            name="bpm"
            min="60"
            max="200"
            required
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-0"
          />
        </div>

        {/* Key */}
        <div>
          <label className="block text-sm mb-1">Key</label>
          <input
            type="text"
            name="key"
            placeholder="e.g. A minor"
            required
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-2 mt-6">Audio Upload</h2>
      <div className="space-y-4">
        {/* Audio File */}
        <div>
          <label className="block text-sm mb-1">Audio File (MP3/WAV)</label>
          <AudioDropzone
            onFileSelected={setAudioFile}
            resetSignal={resetCounter}
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-2 mt-6">Cover Upload</h2>
      <div className="space-y-4">
        {/* Cover Image */}
        <div>
          <label className="block text-sm mb-1">Cover Image (JPG/PNG)</label>
          <TrackCoverDropzone
            onFileSelected={setCoverFile}
            resetSignal={resetCounter}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full rounded-xl font-semibold py-3 transition
    ${
      isSubmitting
        ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
        : "bg-[#00FFC6] hover:bg-[#00E0B0] text-black"
    }`}
      >
        {isSubmitting ? "Uploading…" : "Upload Track"}
      </button>
    </form>
  );
}


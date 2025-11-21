"use client";

import { useState } from "react";
import { uploadToStorage } from "@/lib/supabase/client";
import { uploadTrackAction } from "./actions";

export default function UploadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClientUpload(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      // Extract fields
      const title = formData.get("title") as string;
      const bpm = formData.get("bpm") as string;
      const key = formData.get("key") as string;
      const audio = formData.get("audio") as File;
      const cover = formData.get("cover") as File;

      if (!audio || !(audio instanceof File)) {
        throw new Error("Audio file missing");
      }
      if (!cover || !(cover instanceof File)) {
        throw new Error("Cover file missing");
      }

      const timestamp = Date.now();
      const audioPath = `client-${timestamp}-${audio.name}`;
      const coverPath = `client-${timestamp}-${cover.name}`;

      // Upload directly from Client → Supabase Storage
      const audioUrl = await uploadToStorage(
        "tracks-audio",
        audioPath,
        audio
      );
      const coverUrl = await uploadToStorage(
        "tracks-cover",
        coverPath,
        cover
      );

      // Server Action for DB insert
      await uploadTrackAction({
        title,
        bpm: Number(bpm),
        key,
        audioUrl,
        coverUrl,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unknown upload error");
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleClientUpload} className="space-y-6">
      {/* Error Panel */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 px-4 py-3 text-sm">
          <strong className="block mb-1">Upload failed</strong>
          {error}
        </div>
      )}

      {/* Track Title */}
      <div>
        <label className="block text-sm mb-1">Track Title</label>
        <input
          type="text"
          name="title"
          required
          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white"
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
          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white"
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
          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white"
        />
      </div>

      {/* Audio File */}
      <div>
        <label className="block text-sm mb-1">Audio File (MP3)</label>
        <input
          type="file"
          name="audio"
          accept="audio/mpeg"
          required
          className="w-full text-sm text-zinc-300"
        />
      </div>

      {/* Cover Image */}
      <div>
        <label className="block text-sm mb-1">Cover Image (JPG/PNG)</label>
        <input
          type="file"
          name="cover"
          accept="image/*"
          required
          className="w-full text-sm text-zinc-300"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-[#00FFC6] hover:bg-[#00E0B0] text-black font-semibold py-2 transition disabled:opacity-50"
      >
        {isSubmitting ? "Uploading…" : "Upload Track"}
      </button>
    </form>
  );
}


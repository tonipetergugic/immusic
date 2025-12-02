"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AudioDropzone from "@/components/AudioDropzone";
import { submitToQueueAction as submitToQueueActionServer } from "./actions";

export { submitToQueueAction } from "./actions";

const submitToQueueAction = submitToQueueActionServer;

export default function ArtistUploadPage() {
  const supabase = createSupabaseBrowserClient();

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  async function handleUpload() {
    if (!file) return;

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
    <div className="min-h-screen p-10 bg-[#0E0E10] text-white">

      <h1 className="text-2xl font-bold mb-6">Upload Track</h1>

      <div className="mb-4">
        <label className="block mb-1 text-sm text-gray-300" htmlFor="track-title">
          Track title
        </label>
        <input
          id="track-title"
          name="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md bg-[#18181B] border border-[#27272A] px-3 py-2 text-sm text-white outline-none focus:border-[#00FFC6]"
        />
      </div>

      <AudioDropzone
        onFileSelected={setFile}
        resetSignal={resetSignal}
      />

      {file && !audioPath && (
        <button
          onClick={handleUpload}
          className="mt-4 px-5 py-2 rounded-xl bg-[#00FFC6] text-black font-medium"
        >
          {uploading ? "Uploading..." : "Upload to Storage"}
        </button>
      )}

      {audioPath && (
        <div className="mt-4">
          <p className="text-green-400 mb-2">
            Uploaded: {audioPath}
          </p>

          <form action={submitToQueueAction}>
            <input type="hidden" name="audio_path" value={audioPath!} />
            <input type="hidden" name="title" value={title} />
            <button
              type="submit"
              className="mt-2 px-5 py-2 rounded-xl bg-white text-black font-medium"
            >
              Submit to QC
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

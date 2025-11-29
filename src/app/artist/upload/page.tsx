"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AudioDropzone from "@/components/AudioDropzone";
import { submitToQueueAction as submitToQueueActionServer } from "./actions";

export { submitToQueueAction } from "./actions";

const submitToQueueAction = submitToQueueActionServer;

export default function ArtistUploadPage() {
  const supabase = createSupabaseBrowserClient();

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
    const uuid = crypto.randomUUID();

    // Finaler Pfad für Storage
    const filePath = `audio/${user.id}/${uuid}.${ext}`;

    // Direct Upload
    const { error } = await supabase.storage
      .from("tracks")
      .upload(filePath, file, {
        cacheControl: "3600",
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
    <div className="min-h-screen p-10 bg-[#0E0E10] text-white">

      <h1 className="text-2xl font-bold mb-6">Upload Track</h1>

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

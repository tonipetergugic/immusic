"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import CoverDropzone from "@/components/CoverDropzone";

export default function CreatePlaylistModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleCreate() {
    if (!title.trim()) return;

    setLoading(true);

    // User laden
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    // COVER UPLOAD ░░░░░░░░░░░░░░░░░░░░░░░
    let cover_url: string | null = null;

    if (coverFile) {
      const fileExt = coverFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("playlist-covers")
        .upload(filePath, coverFile);

      if (uploadError) {
        console.error(uploadError);
        alert("Error uploading cover.");
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("playlist-covers")
        .getPublicUrl(filePath);

      cover_url = publicUrlData.publicUrl;
    }

    // DATABASE INSERT ░░░░░░░░░░░░░░░░░░░
    const { data, error } = await supabase
      .from("playlists")
      .insert({
        title,
        description,
        created_by: user.id,
        cover_url,
      })
      .select("*")
      .single();

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error creating playlist.");
      return;
    }

    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-[#111112] border border-[#1A1A1C] p-6 rounded-xl w-[420px] shadow-2xl">
        <h2 className="text-xl font-semibold mb-5">Create Playlist</h2>

        <div className="space-y-4">
          {/* COVER DROPZONE */}
          <CoverDropzone onFileSelected={setCoverFile} />

          <input
            type="text"
            placeholder="Playlist title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1A1A1C] text-white p-3 rounded-lg focus:outline-none border border-transparent focus:border-[#00FFC6]"
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#1A1A1C] text-white p-3 rounded-lg h-24 resize-none focus:outline-none border border-transparent focus:border-[#00FFC6]"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/70 hover:text-white transition"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-4 py-2 bg-[#00FFC6] hover:bg-[#00E0B0] text-black rounded-md transition disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

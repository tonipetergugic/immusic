"use client";

import { useState } from "react";
import CoverDropzone from "./CoverDropzone";
import { createBrowserClient } from "@supabase/ssr";

export default function PlaylistDetailsModal({
  isOpen,
  onClose,
  playlist,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  playlist: {
    id: string;
    title: string;
    description: string | null;
    cover_url: string | null;
  };
  onUpdated: (updated: {
    title: string;
    description: string | null;
    cover_url: string | null;
  }) => void;
}) {
  if (!isOpen) return null;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [title, setTitle] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);

    let newCoverUrl = playlist.cover_url;

    if (file) {
      if (playlist.cover_url) {
        let rel = playlist.cover_url.split(
          "/object/public/playlist-covers/"
        )[1];

        if (rel && rel.includes("?")) {
          rel = rel.split("?")[0];
        }

        if (rel) {
          await supabase.storage.from("playlist-covers").remove([rel]);
        }
      }

      const ext = file.name.split(".").pop();
      const path = `covers/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("playlist-covers")
        .upload(path, file);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("playlist-covers")
          .getPublicUrl(path);

        newCoverUrl = urlData.publicUrl;

        if (newCoverUrl) {
          newCoverUrl = `${newCoverUrl}?t=${Date.now()}`;
        }
      }
    }

    const { error: dbError } = await supabase
      .from("playlists")
      .update({
        title,
        description,
        cover_url: newCoverUrl,
      })
      .eq("id", playlist.id);

    if (!dbError) {
      onUpdated({
        title,
        description,
        cover_url: newCoverUrl ?? null,
      });
      onClose();
    }

    setLoading(false);
  }

  async function handleRemoveCover() {
    if (!playlist.cover_url) return;

    let rel = playlist.cover_url.split("/object/public/playlist-covers/")[1];

    if (rel && rel.includes("?")) {
      rel = rel.split("?")[0];
    }

    if (rel) {
      await supabase.storage.from("playlist-covers").remove([rel]);
    }

    await supabase
      .from("playlists")
      .update({ cover_url: null })
      .eq("id", playlist.id);

    onUpdated({
      title,
      description,
      cover_url: null,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center">
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl w-[420px] shadow-2xl text-white space-y-5">
        <h2 className="text-xl font-semibold">Edit Playlist Details</h2>

        <div className="space-y-3">
          <p className="text-sm text-white/60">Cover</p>
          <CoverDropzone onFileSelected={setFile} />

          {playlist.cover_url && !file && (
            <button
              onClick={handleRemoveCover}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Remove current cover
            </button>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white/60">Title</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 rounded-lg bg-neutral-800 text-white outline-none border border-neutral-700 focus:border-[#00FFC6]"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white/60">Description</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 h-20 rounded-lg bg-neutral-800 text-white resize-none outline-none border border-neutral-700 focus:border-[#00FFC6]"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/60 hover:text-white"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-[#00FFC6] hover:bg-[#00E0B0] text-black font-semibold disabled:opacity-40"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
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
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [title, setTitle] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const currentCoverUrl = useMemo(() => {
    if (!playlist.cover_url) return null;
    if (playlist.cover_url.startsWith("http")) return playlist.cover_url;
    const { data } = supabase.storage.from("playlist-covers").getPublicUrl(playlist.cover_url);
    return data?.publicUrl ?? playlist.cover_url;
  }, [playlist.cover_url, supabase]);

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
      const path = `${playlist.id}/cover.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("playlist-covers")
        .upload(path, file);

      if (!uploadError) {
        // Store only the relative path in DB (best practice)
        newCoverUrl = path;
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

    let rel = playlist.cover_url;

    // Support old full Public URLs
    if (rel.includes("/object/public/playlist-covers/")) {
      rel = rel.split("/object/public/playlist-covers/")[1].split("?")[0];
    }

    // 1) delete from storage
    const { error: deleteError } = await supabase.storage
      .from("playlist-covers")
      .remove([rel]);

    if (deleteError) {
      console.error("❌ Storage delete failed:", deleteError);
    }

    // 2) clear DB reference
    const { error: dbError } = await supabase
      .from("playlists")
      .update({ cover_url: null })
      .eq("id", playlist.id);

    if (dbError) {
      console.error("❌ DB update failed:", dbError);
    }

    onUpdated({
      title,
      description,
      cover_url: null,
    });

    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center">
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl w-[420px] shadow-2xl text-white space-y-5">
        <h2 className="text-xl font-semibold">Edit Playlist Details</h2>

        <div className="space-y-3">
          <p className="text-sm text-white/60">Cover</p>
          <label className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] ?? null;
                setFile(selectedFile);
                if (selectedFile) {
                  setPreviewUrl(URL.createObjectURL(selectedFile));
                } else {
                  setPreviewUrl(null);
                }
              }}
              className="
                block w-full text-sm text-white
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-[#00FFC6]/10 file:text-[#00FFC6]
                hover:file:bg-[#00FFC6]/20
              "
            />
          </label>

          {(previewUrl || currentCoverUrl) && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-white/60">Preview</p>
              <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/60">
                <img
                  src={previewUrl ?? currentCoverUrl ?? ""}
                  alt="Playlist cover preview"
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
          )}

          {playlist.cover_url && !previewUrl && (
            <button
              onClick={handleRemoveCover}
              className="
      flex items-center gap-3 w-full 
      bg-neutral-900/60 
      border border-neutral-800 
      hover:bg-neutral-800/60 
      hover:border-red-400/40
      transition-all duration-200
      rounded-lg px-4 py-3 mt-1
      text-red-400 hover:text-red-300 text-sm font-medium
    "
            >
              <Trash2 size={18} className="text-red-400" />
              <span>Remove current cover</span>
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


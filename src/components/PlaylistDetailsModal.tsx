"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
      createSupabaseBrowserClient(),
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

  const currentCoverUrl = playlist.cover_url ?? null;

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
      const path = `${playlist.id}/cover-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("playlist-covers")
        .upload(path, file, { upsert: false });

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.55)] space-y-5 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.12em] text-white/60">
            Playlist
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Edit Playlist Details
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Update cover, title and description.
          </p>
        </div>

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
              className="inline-flex items-center gap-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-red-300/90 transition hover:bg-white/[0.06] hover:border-red-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
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
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white/60">Description</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20 resize-none h-28"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.10] hover:border-[#00FFC6]/60 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


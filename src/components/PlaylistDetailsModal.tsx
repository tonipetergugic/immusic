"use client";

import { useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    const { error: dbError } = await supabase
      .from("playlists")
      .update({
        title,
        description,
      })
      .eq("id", playlist.id);
 
    if (!dbError) {
      onUpdated({
        title,
        description,
        cover_url: playlist.cover_url ?? null,
      });
      onClose();
    } else {
      console.error("Playlist details update failed:", dbError);
    }
 
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.55)] space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="min-w-0">
          <h2 className="mt-1 text-[28px] font-semibold tracking-tight text-white">
            Edit <span className="text-[#00FFC6]">Playlist</span> Details
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Update title and description.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white/60">Title</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/70 focus:ring-2 focus:ring-[#00FFC6]/25"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white/60">Description</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/70 focus:ring-2 focus:ring-[#00FFC6]/25 resize-none h-28"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center min-w-[110px] cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/[0.08] hover:border-[#00FFC6]/60 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={handleSave}
            className="inline-flex items-center justify-center min-w-[110px] cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/[0.08] hover:border-[#00FFC6]/60 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


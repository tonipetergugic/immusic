"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

  if (!isOpen) return null;

  const supabase = createSupabaseBrowserClient();

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

    const { data, error } = await supabase
      .from("playlists")
      .insert({
        title,
        description,
        created_by: user.id,
        cover_url: null,
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.12em] text-white/60">
              Playlist
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Create Playlist
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Create a new playlist to collect tracks.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <input
            type="text"
            placeholder="Playlist title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
            maxLength={80}
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20 resize-none h-28"
            maxLength={200}
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !title.trim()}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.10] hover:border-[#00FFC6]/60 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

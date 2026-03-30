"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function showNotice(message: string) {
  window.dispatchEvent(
    new CustomEvent("immusic:notice", { detail: { message } })
  );
}

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
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      handleClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);
  function handleClose(force = false) {
    if (loading && !force) return;
    setTitle("");
    setDescription("");
    onClose();
  }

  if (!isOpen) return null;

  async function handleCreate() {
    if (loading) return;
    if (!title.trim()) return;

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim() || null;

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showNotice("You must be logged in.");
        return;
      }

      const { data, error } = await supabase
        .from("playlists")
        .insert({
          title: normalizedTitle,
          description: normalizedDescription,
          created_by: user.id,
          cover_url: null,
        })
        .select("*")
        .single();

      if (error) {
        console.error(error);
        showNotice("Error creating playlist.");
        return;
      }

      handleClose(true);
      onCreated();
      router.push(`/dashboard/playlist/${data.id}`);
    } catch (error) {
      console.error("Unexpected error creating playlist:", error);
      showNotice("Error creating playlist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={() => handleClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-playlist-title"
        aria-describedby="create-playlist-description"
        className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.55)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.12em] text-white/60">
              Playlist
            </div>
            <h2
              id="create-playlist-title"
              className="mt-1 text-2xl font-semibold tracking-tight text-white"
            >
              Create <span className="text-[#00FFC6]">Playlist</span>
            </h2>
            <p
              id="create-playlist-description"
              className="mt-1 text-sm text-white/60"
            >
              Create a new playlist to collect tracks.
            </p>
          </div>
        </div>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="create-playlist-title-input"
                className="block text-sm font-medium text-white/80"
              >
                Playlist title
              </label>
              <input
                id="create-playlist-title-input"
                ref={titleInputRef}
                type="text"
                placeholder="Playlist title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20 disabled:cursor-not-allowed disabled:opacity-50"
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="create-playlist-description-input"
                className="block text-sm font-medium text-white/80"
              >
                Description <span className="text-white/45">(optional)</span>
              </label>
              <textarea
                id="create-playlist-description-input"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                className="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20 disabled:cursor-not-allowed disabled:opacity-50"
                maxLength={200}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => handleClose()}
              disabled={loading}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="inline-flex min-w-[90px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:border-[#00FFC6]/60 hover:bg-white/[0.10] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity="0.2"
                  />
                  <path
                    d="M22 12a10 10 0 0 1-10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

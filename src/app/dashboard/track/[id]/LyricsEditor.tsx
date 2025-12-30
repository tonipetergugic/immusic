"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateTrackLyricsAction } from "./actions";

export default function LyricsEditor({
  trackId,
  initialLyrics,
  canEdit,
  variant = "boxed",
}: {
  trackId: string;
  initialLyrics: string | null;
  canEdit: boolean;
  variant?: "boxed" | "plain";
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [lyrics, setLyrics] = useState(initialLyrics ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const statusText = useMemo(() => {
    const has = lyrics.trim().length > 0;
    return has ? "Available" : "Not available";
  }, [lyrics]);

  const sectionClass =
    variant === "plain"
      ? ""
      : "rounded-2xl bg-white/5 border border-white/10 p-6";

  if (!canEdit) {
    return (
      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-semibold text-white/90">Lyrics</h2>
          <span className="text-xs text-white/40">{statusText}</span>
        </div>

        <div className="text-sm leading-6 text-white/70 whitespace-pre-wrap">
          {lyrics.trim().length > 0 ? lyrics : "No lyrics added for this track yet."}
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-white/90">Lyrics</h2>

          <span
            className="
              text-[11px] px-2 py-1 rounded-full
              bg-white/5 border border-white/10
              text-white/50
            "
          >
            {statusText}
          </span>
        </div>

        {!isEditing ? (
          <button
            onClick={() => {
              setError(null);
              setIsEditing(true);
            }}
            className="
              inline-flex items-center gap-2
              text-xs font-medium
              px-3 py-2 rounded-lg
              bg-white/5 border border-white/10
              text-white/70 hover:text-[#00FFC6]
              hover:border-[#00FFC6]/40 hover:bg-[#00FFC6]/10
              transition-colors
            "
          >
            <Pencil className="w-4 h-4" />
            Edit lyrics
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setError(null);
                setLyrics(initialLyrics ?? "");
                setIsEditing(false);
              }}
              className="
                text-xs font-medium
                px-3 py-2 rounded-lg
                bg-white/5 border border-white/10
                text-white/60 hover:text-white/85
                transition-colors
              "
              disabled={pending}
            >
              Cancel
            </button>

            <button
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const res = await updateTrackLyricsAction(trackId, lyrics);
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setIsEditing(false);
                });
              }}
              className="
                text-xs font-medium
                px-3 py-2 rounded-lg
                bg-[#00FFC6]/15 border border-[#00FFC6]/30
                text-[#00FFC6] hover:bg-[#00FFC6]/20
                transition-colors
              "
              disabled={pending}
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {error ? (
        <div className="mb-3 text-xs text-red-400">{error}</div>
      ) : null}

      {!isEditing ? (
        <div className="text-sm leading-6 text-white/70 whitespace-pre-wrap">
          {lyrics.trim().length > 0 ? lyrics : "No lyrics added for this track yet."}
        </div>
      ) : (
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          className="w-full min-h-[260px] rounded-xl bg-black/30 border border-white/10 p-4 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-[#00FFC6]/50"
          placeholder="Paste or write lyrics here..."
        />
      )}
    </section>
  );
}

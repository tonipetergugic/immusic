"use client";

import { useMemo, useState } from "react";
import { Bookmark } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SaveArtistButton({
  artistId,
  viewerId,
  isSaved,
  onChange,
  className,
}: {
  artistId: string;
  viewerId: string | null;
  isSaved: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  const supabase = useMemo(
    () =>
      createSupabaseBrowserClient(),
    []
  );

  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    if (!viewerId) return;

    setBusy(true);

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("library_artists")
          .delete()
          .eq("user_id", viewerId)
          .eq("artist_id", artistId);

        if (!error) onChange(false);
        return;
      }

      const { error } = await supabase.from("library_artists").insert({
        user_id: viewerId,
        artist_id: artistId,
      });

      if (!error) onChange(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`
        inline-flex items-center justify-center gap-2
        h-10 px-4 rounded-full
        bg-transparent border border-white/10
        text-[#B3B3B3] text-sm font-medium
        hover:text-white hover:border-white/20
        transition
        disabled:opacity-60 disabled:cursor-wait
        ${className ?? ""}
      `.trim()}
    >
      {busy ? (
        "..."
      ) : isSaved ? (
        <>
          <Bookmark size={16} aria-hidden="true" />
          Remove from Library
        </>
      ) : (
        <>
          <Bookmark size={16} aria-hidden="true" />
          Save to Library
        </>
      )}
    </button>
  );
}

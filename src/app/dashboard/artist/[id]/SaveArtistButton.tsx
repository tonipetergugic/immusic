"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function SaveArtistButton({
  artistId,
  initialSaved,
}: {
  artistId: string;
  initialSaved: boolean;
}) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBusy(false);
      return;
    }

    if (saved) {
      const { error } = await supabase
        .from("library_artists")
        .delete()
        .eq("user_id", user.id)
        .eq("artist_id", artistId);

      if (!error) setSaved(false);
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("library_artists").insert({
      user_id: user.id,
      artist_id: artistId,
    });

    if (!error) setSaved(true);
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="
        h-10 px-4 rounded-md
        bg-[#1A1A1C]/80 border border-[#2A2A2D]
        text-white/80 text-sm
        hover:bg-[#2A2A2D]
        hover:text-white
        hover:border-[#00FFC622]
        hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
        backdrop-blur-lg transition
        disabled:opacity-60 disabled:cursor-wait
      "
    >
      {saved ? "Remove from Library" : "Save to Library"}
    </button>
  );
}

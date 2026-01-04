"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SaveArtistButton({
  artistId,
  initialSaved,
}: {
  artistId: string;
  initialSaved: boolean;
}) {
  const supabase = useMemo(
    () =>
      createSupabaseBrowserClient(),
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
        inline-flex items-center justify-center
        h-10 px-4 rounded-full
        bg-transparent border border-white/10
        text-[#B3B3B3] text-sm font-medium
        hover:text-white hover:border-white/20
        transition
        disabled:opacity-60 disabled:cursor-wait
      "
    >
      {saved ? "Remove from Library" : "Save to Library"}
    </button>
  );
}

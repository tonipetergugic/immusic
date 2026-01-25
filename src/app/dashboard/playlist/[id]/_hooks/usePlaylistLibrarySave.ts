"use client";

import { useState } from "react";

export function usePlaylistLibrarySave({
  supabase,
  userId,
  isOwner,
  playlistId,
  initialSaved,
}: {
  supabase: any;
  userId: string | null;
  isOwner: boolean;
  playlistId: string;
  initialSaved: boolean;
}) {
  const [isSavedToLibrary, setIsSavedToLibrary] = useState(initialSaved);
  const [saveBusy, setSaveBusy] = useState(false);

  async function toggleSaveToLibrary() {
    if (!userId) return;
    if (isOwner) return;
    if (saveBusy) return;

    setSaveBusy(true);

    if (isSavedToLibrary) {
      const { error } = await supabase
        .from("library_playlists")
        .delete()
        .eq("user_id", userId)
        .eq("playlist_id", playlistId);

      if (error) {
        console.error("Failed to remove from library_playlists:", error);
        setSaveBusy(false);
        return;
      }

      setIsSavedToLibrary(false);
      setSaveBusy(false);
      return;
    }

    const { error } = await supabase.from("library_playlists").insert({
      user_id: userId,
      playlist_id: playlistId,
    });

    if (error) {
      console.error("Failed to insert into library_playlists:", error);
      setSaveBusy(false);
      return;
    }

    setIsSavedToLibrary(true);
    setSaveBusy(false);
  }

  return {
    isSavedToLibrary,
    saveBusy,
    toggleSaveToLibrary,
  };
}

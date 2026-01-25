"use client";

import { useEffect, useState } from "react";

export function usePlaylistLibrarySave({
  supabase,
  userId,
  isOwner,
  playlistId,
}: {
  supabase: any;
  userId: string | null;
  isOwner: boolean;
  playlistId: string;
}) {
  const [isSavedToLibrary, setIsSavedToLibrary] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSaved() {
      if (!userId) return;
      if (isOwner) return;

      const { data, error } = await supabase
        .from("library_playlists")
        .select("playlist_id")
        .eq("user_id", userId)
        .eq("playlist_id", playlistId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Failed to read library_playlists:", error);
        setIsSavedToLibrary(false);
        return;
      }

      setIsSavedToLibrary(!!data);
    }

    void loadSaved();

    return () => {
      cancelled = true;
    };
  }, [supabase, userId, isOwner, playlistId]);

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

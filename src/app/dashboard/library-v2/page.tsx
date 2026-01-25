import type { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";
import { LibraryV2Header } from "./components/LibraryV2Header";
import { PlaylistsSection } from "./components/PlaylistsSection";
import { TracksSection } from "./components/TracksSection";
import { ArtistsSection } from "./components/ArtistsSection";
import { loadLibraryV2Artists, loadLibraryV2Playlists, loadLibraryV2Tracks } from "./data/loaders";

export const metadata: Metadata = { title: "Library | ImMusic" };

type Props = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function LibraryV2Page(props: Props) {
  const sp = (await props.searchParams) ?? {};
  const currentTab = sp.tab || "playlists";

  if (!sp.tab) redirect("/dashboard/library-v2?tab=playlists");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Load ONLY what we need per tab (cost control)
  if (currentTab === "playlists") {
    const playlists = await loadLibraryV2Playlists({ supabase, userId: user.id });
    return (
      <div className="w-full">
        <LibraryV2Header currentTab={currentTab} />
        <PlaylistsSection playlists={playlists} />
      </div>
    );
  }

  if (currentTab === "tracks") {
    const tracksPayload = await loadLibraryV2Tracks({ supabase, userId: user.id });
    return (
      <div className="w-full">
        <LibraryV2Header currentTab={currentTab} />
        <TracksSection payload={tracksPayload} />
      </div>
    );
  }

  // artists
  const artists = await loadLibraryV2Artists({ supabase, userId: user.id });
  return (
    <div className="w-full">
      <LibraryV2Header currentTab={currentTab} />
      <ArtistsSection artists={artists} />
    </div>
  );
}

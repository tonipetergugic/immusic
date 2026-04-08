import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";
import { LibraryV2Header } from "./components/LibraryV2Header";
import { ReleasesSection } from "./components/ReleasesSection";
import { PlaylistsSection } from "./components/PlaylistsSection";
import { TracksSection } from "./components/TracksSection";
import { ArtistsSection } from "./components/ArtistsSection";
import {
  loadLibraryV2Artists,
  loadLibraryV2Playlists,
} from "./data/loaders";
import { loadLibraryV2Releases } from "./data/releasesLoader";
import { loadLibraryV2Tracks } from "./data/tracksLoader";

export const metadata: Metadata = { title: "Library | ImMusic" };

type Props = {
  searchParams?: Promise<{ tab?: string }>;
};

const VALID_TABS = new Set(["releases", "playlists", "tracks", "artists"]);

const LIBRARY_TABS = [
  { key: "releases", label: "Releases" },
  { key: "playlists", label: "Playlists" },
  { key: "tracks", label: "Tracks" },
  { key: "artists", label: "Artists" },
] as const;

function LibraryTabs({ currentTab }: { currentTab: string }) {
  return (
    <div className="border-b border-white/5">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <nav className="flex w-max min-w-full gap-5 text-sm sm:gap-6">
          {LIBRARY_TABS.map((tab) => {
            const isActive = currentTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/dashboard/library?tab=${tab.key}`}
                className={`shrink-0 border-b-2 pb-3 transition-colors ${
                  isActive
                    ? "border-[#00FFC6] font-medium text-white"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default async function LibraryV2Page(props: Props) {
  const sp = (await props.searchParams) ?? {};
  const currentTab = sp.tab || "releases";

  if (!sp.tab) redirect("/dashboard/library?tab=releases");
  if (!VALID_TABS.has(currentTab)) redirect("/dashboard/library?tab=releases");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let content: React.ReactNode = null;

  // Load ONLY what we need per tab (cost control)
  if (currentTab === "releases") {
    const releases = await loadLibraryV2Releases({ supabase, userId: user.id });
    content = <ReleasesSection releases={releases} />;
  } else if (currentTab === "playlists") {
    const playlists = await loadLibraryV2Playlists({ supabase, userId: user.id });
    content = <PlaylistsSection playlists={playlists} />;
  } else if (currentTab === "tracks") {
    const tracksPayload = await loadLibraryV2Tracks({ supabase, userId: user.id });
    content = <TracksSection payload={tracksPayload} />;
  } else {
    const artists = await loadLibraryV2Artists({ supabase, userId: user.id });
    content = <ArtistsSection artists={artists} />;
  }

  return (
    <div className="w-full space-y-6">
      <LibraryV2Header currentTab={currentTab} />
      <LibraryTabs currentTab={currentTab} />
      {content}
    </div>
  );
}

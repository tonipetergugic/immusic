import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PlaylistCard from "@/components/PlaylistCard";
import TrackCard from "@/components/TrackCard";
import ArtistCard from "@/components/ArtistCard";
import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Library | ImMusic",
};

type LibraryPageProps = {
  searchParams?: {
    tab?: string;
  };
};

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const currentTab = searchParams?.tab || "playlists";

  const tabs = [
    { key: "playlists", label: "Playlists" },
    { key: "tracks", label: "Tracks" },
    { key: "artists", label: "Artists" },
  ];

  if (!searchParams?.tab) {
    redirect("/dashboard/library?tab=playlists");
  }

  const supabase = await createClient();

  let data: any[] = [];

  if (currentTab === "playlists") {
    const { data: playlists } = await supabase
      .from("playlists")
      .select("*")
      .order("created_at", { ascending: false });

    data = playlists || [];
  }

  if (currentTab === "tracks") {
    const { data: tracks } = await supabase
      .from("tracks")
      .select(`
        id,
        title,
        cover_url,
        audio_url,
        created_at,
        bpm,
        key,
        artist_id,
        profiles:profiles!tracks_artist_id_fkey (
          display_name
        )
      `)
      .order("created_at", { ascending: false });

    data = tracks || [];
  }

  if (currentTab === "artists") {
    const { data: artists } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "artist")
      .order("display_name", { ascending: true });

    data = artists || [];
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Your Library
        </h1>
        <p className="text-sm text-neutral-400">
          Collect your favourite playlists, tracks and artists in one place.
        </p>
      </header>

      <section>
        {/* Dynamic Tabs */}
        <div className="border-b border-white/5">
          <nav className="flex gap-6 text-sm">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.key;
              return (
                <a
                  key={tab.key}
                  href={`/dashboard/library?tab=${tab.key}`}
                  className={`pb-3 transition-colors ${
                    isActive
                      ? "text-white font-medium border-b-2 border-[#00FFC6]"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Placeholder for content – echte Daten in Schritt 3 */}
        <div className="pt-6">
          {currentTab === "playlists" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pt-6">
              {data.length > 0 ? (
                data.map((playlist: any) => (
                  <PlaylistCard
                    key={playlist.id}
                    id={playlist.id}
                    title={playlist.title}
                    description={playlist.description}
                    cover_url={playlist.cover_url}
                  />
                ))
              ) : (
                <p className="text-sm text-neutral-400 col-span-full">
                  No playlists found.
                </p>
              )}
            </div>
          )}

          {/* TRACKS UI */}
          {currentTab === "tracks" && (
            <div className="pt-6">
              {data.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {data.map((track: any) => (
                    <TrackCard key={track.id} track={track} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">
                  No tracks found.
                </p>
              )}
            </div>
          )}

          {currentTab === "artists" && (
            <div className="pt-6">
              {data.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {data.map((artist: any) => (
                    <ArtistCard
                      key={artist.id}
                      id={artist.id}
                      display_name={artist.display_name}
                      avatar_url={artist.avatar_url}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">
                  No artists found.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


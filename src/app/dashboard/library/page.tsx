import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PlaylistCard from "@/components/PlaylistCard";
import TrackCard from "@/components/TrackCard";
import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";
import type { PlayerTrack } from "@/types/playerTrack";
import type { Playlist, Profile } from "@/types/database";
import { toPlayerTrackList } from "@/lib/playerTrack";

export const metadata: Metadata = {
  title: "Library | ImMusic",
};

type LibraryPageProps = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

export default async function LibraryPage(props: LibraryPageProps) {
  const searchParams = await props.searchParams;
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

  let playlists: Playlist[] = [];
  let trackData: PlayerTrack[] = [];
  let artists: Profile[] = [];

  // -----------------------------
  // PLAYLISTS
  // -----------------------------
  if (currentTab === "playlists") {
    const { data: playlistsData } = await supabase
      .from("playlists")
      .select("*")
      .order("created_at", { ascending: false });

    playlists = playlistsData || [];
  }

  // -----------------------------
  // TRACKS (mit Release- und Artist-Join)
  // -----------------------------
  if (currentTab === "tracks") {
    const { data: tracks } = await supabase
      .from("tracks")
      .select(`
        id,
        title,
        audio_path,
        created_at,
        artist_id,
        releases:releases!tracks_release_id_fkey(
          id,
          cover_path,
          status
        ),
        artist_profile:profiles!tracks_artist_id_fkey(
          display_name
        )
      `)
      .order("created_at", { ascending: false });

    const normalizedTracks =
      tracks?.map((track) => ({
        ...track,
        releases: Array.isArray(track.releases)
          ? track.releases[0] ?? null
          : track.releases ?? null,
        artist_profile: Array.isArray(track.artist_profile)
          ? track.artist_profile[0] ?? null
          : track.artist_profile ?? null,
      })) ?? [];

    trackData = toPlayerTrackList(normalizedTracks);
  }

  // -----------------------------
  // ARTISTS
  // -----------------------------
  if (currentTab === "artists") {
    const { data: artistsData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "artist")
      .order("display_name", { ascending: true });

    artists = artistsData || [];
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
        {/* Tabs */}
        <div className="border-b border-white/5">
          <nav className="flex gap-6 text-sm">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={`/dashboard/library?tab=${tab.key}`}
                  className={`pb-3 transition-colors ${
                    isActive
                      ? "text-white font-medium border-b-2 border-[#00FFC6]"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6">
          {/* PLAYLISTS */}
          {currentTab === "playlists" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pt-6">
              {playlists.length > 0 ? (
                playlists.map((playlist) => (
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

          {/* TRACKS */}
          {currentTab === "tracks" && (
            <div className="pt-6">
              {trackData.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {trackData.map((track, index) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      index={index}
                      tracks={trackData}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No tracks found.</p>
              )}
            </div>
          )}

          {/* ARTISTS */}
          {currentTab === "artists" && (
            <div className="pt-6">
              {artists.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {artists.map((artist) => (
                    <Link
                      key={artist.id}
                      href={`/dashboard/artist/${artist.id}`}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col items-center text-center gap-3 hover:bg-white/[0.06] transition"
                    >
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center text-white/50 text-xl">
                        {artist.avatar_url ? (
                          <img
                            src={artist.avatar_url}
                            alt={artist.display_name ?? "Artist avatar"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          artist.display_name?.[0]?.toUpperCase() ?? "?"
                        )}
                      </div>
                      <p className="text-sm font-medium text-white truncate w-full">
                        {artist.display_name || "Unknown artist"}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No artists found.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
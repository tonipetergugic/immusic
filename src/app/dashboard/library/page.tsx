import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PlaylistCard from "@/components/PlaylistCard";
import TrackCard from "@/components/TrackCard";
import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";
import type { PlayerTrack } from "@/types/playerTrack";
import type { Playlist, Profile } from "@/types/database";
import { toPlayerTrackList } from "@/lib/playerTrack";
import { buildPlaylistCoverUrlServer } from "@/lib/playlistCovers.server";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let playlists: Playlist[] = [];
  let trackData: PlayerTrack[] = [];
  let artists: Profile[] = [];

  // -----------------------------
  // PLAYLISTS (own + saved)
  // -----------------------------
  if (currentTab === "playlists") {
    // 1) Eigene Playlists
    const { data: ownPlaylists, error: ownErr } = await supabase
      .from("playlists")
      .select("id")
      .eq("created_by", user.id);

    if (ownErr) {
      console.error("Failed to load own playlists:", ownErr);
    }

    // 2) Gespeicherte Playlists
    const { data: savedPlaylists, error: savedErr } = await supabase
      .from("library_playlists")
      .select("playlist_id")
      .eq("user_id", user.id);

    if (savedErr) {
      console.error("Failed to load saved playlists:", savedErr);
    }

    const playlistIds = Array.from(
      new Set([
        ...(ownPlaylists ?? []).map((p) => p.id),
        ...(savedPlaylists ?? []).map((p) => p.playlist_id),
      ])
    );

    if (playlistIds.length === 0) {
      playlists = [];
    } else {
      const { data: playlistsData, error } = await supabase
        .from("playlists")
        .select("*")
        .in("id", playlistIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load playlists:", error);
        playlists = [];
      } else {
        playlists = (playlistsData ?? []).map((p: any) => {
          const cover_url = buildPlaylistCoverUrlServer({
            supabase,
            cover_path: p?.cover_url ?? null,
          });

          return {
            ...p,
            cover_url,
          };
        });
      }
    }
  }

  // -----------------------------
  // TRACKS (ONLY saved tracks)
  // -----------------------------
  if (currentTab === "tracks") {
    const { data: savedRows, error } = await supabase
      .from("library_tracks")
      .select(
        `
        track_id,
        created_at,
        tracks:tracks!library_tracks_track_id_fkey(
          id,
          title,
          audio_path,
          created_at,
          artist_id,
          bpm,
          key,
          releases:releases!tracks_release_id_fkey(
            id,
            cover_path,
            status
          ),
          artist_profile:profiles!tracks_artist_id_fkey(
            display_name
          )
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load library_tracks:", error);
      trackData = [];
    } else {
      const tracks = (savedRows ?? [])
        .map((row: any) => row.tracks)
        .filter(Boolean);

      const normalizedTracks =
        tracks.map((track: any) => ({
          ...track,
          releases: Array.isArray(track.releases)
            ? track.releases[0] ?? null
            : track.releases ?? null,
          artist_profile: Array.isArray(track.artist_profile)
            ? track.artist_profile[0] ?? null
            : track.artist_profile ?? null,
        })) ?? [];

      const playerTrackInputs = (normalizedTracks ?? []).map((t: any) => {
        const cover_url =
          t?.releases?.cover_path
            ? supabase.storage
                .from("release_covers")
                .getPublicUrl(t.releases.cover_path).data.publicUrl ?? null
            : null;

        const audio_url =
          t?.audio_path
            ? supabase.storage
                .from("tracks")
                .getPublicUrl(t.audio_path).data.publicUrl ?? null
            : null;

        if (!audio_url) {
          throw new Error(
            "Library: Missing audio_url for track " + (t?.id ?? "unknown")
          );
        }

        // IMPORTANT: explicit allowed fields only (NO spreading DB rows)
        return {
          id: t.id,
          title: t.title ?? null,
          artist_id: t.artist_id ?? null,
          audio_url,
          cover_url,
          bpm: t.bpm ?? null,
          key: t.key ?? null,
          artist_profile: t.artist_profile ?? null,
        };
      });

      trackData = toPlayerTrackList(playerTrackInputs as any);
    }
  }

  // -----------------------------
  // ARTISTS (ONLY saved artists)
  // -----------------------------
  if (currentTab === "artists") {
    const { data: savedArtists, error: savedErr } = await supabase
      .from("library_artists")
      .select("artist_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (savedErr) {
      console.error("Failed to load library_artists:", savedErr);
      artists = [];
    } else {
      const artistIds = (savedArtists ?? []).map((row) => row.artist_id);

      if (artistIds.length === 0) {
        artists = [];
      } else {
        const { data: artistsData, error } = await supabase
          .from("profiles")
          .select("*")
          .in("id", artistIds)
          .order("display_name", { ascending: true });

        if (error) {
          console.error("Failed to load saved artist profiles:", error);
          artists = [];
        } else {
          // optional: only keep role=artist if your profiles contain others
          artists = (artistsData ?? []).filter((p: any) => p.role === "artist");
        }
      }
    }
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-6">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                <p className="text-sm text-neutral-400">
                  No saved tracks yet. Use “Save to Library” on a track.
                </p>
              )}
            </div>
          )}

          {/* ARTISTS */}
          {currentTab === "artists" && (
            <div className="pt-6">
              {artists.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {artists.map((artist) => (
                    <Link
                      key={artist.id}
                      href={`/dashboard/artist/${artist.id}`}
                      className="
                        group relative 
                        bg-[#111112] 
                        p-3 rounded-xl 
                        transition-all
                        hover:scale-[1.02]
                        hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
                        border border-transparent
                        hover:border-[#00FFC622]
                        cursor-pointer
                        block
                      "
                    >
                      <div className="w-full aspect-square rounded-xl bg-neutral-900 flex items-center justify-center overflow-hidden">
                        {artist.avatar_url ? (
                          <img
                            src={artist.avatar_url}
                            alt={artist.display_name ?? "Artist avatar"}
                            className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/50 text-5xl">
                            {artist.display_name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-white/90 truncate">
                        {artist.display_name || "Unknown artist"}
                      </h3>

                      <p className="text-xs text-white/50 truncate">Artist</p>
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


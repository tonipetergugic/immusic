import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import PlaylistCard from "@/components/PlaylistCard";
import ArtistCard from "@/components/ArtistCard";
import LibraryTracksClient from "./LibraryTracksClient";
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
  const sp = searchParams ?? {};
  const currentTab = sp.tab || "playlists";

  const tabs = [
    { key: "playlists", label: "Playlists" },
    { key: "tracks", label: "Tracks" },
    { key: "artists", label: "Artists" },
  ];

  if (!sp.tab) {
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
  let releaseTrackIdByTrackId = new Map<string, string>();

  // -----------------------------
  // PLAYLISTS (own + saved)
  // -----------------------------
  if (currentTab === "playlists") {
    const { data: ownPlaylists, error: ownErr } = await supabase
      .from("playlists")
      .select("id")
      .eq("created_by", user.id);

    if (ownErr) {
      console.error("Failed to load own playlists:", ownErr);
    }

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
        tracks:tracks!library_tracks_track_id_fkey(
          id,
          title,
          audio_path,
          created_at,
          artist_id,
          bpm,
          key,
          genre,
          release_tracks:release_tracks!release_tracks_track_id_fkey(
            id,
            release_id
          ),
          releases:releases!tracks_release_id_fkey(
            id,
            cover_path,
            status
          ),
          artist_profile:profiles!tracks_artist_id_fkey(
            id,
            display_name
          ),
          track_collaborators (
            role,
            profiles:profile_id (
              id,
              display_name
            )
          )
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load library_tracks:", {
        message: (error as any)?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        code: (error as any)?.code,
      });
      trackData = [];
    } else {
      const normalizedTracks =
        (savedRows ?? [])
          .map((row: any) => {
            const t = row.tracks;
            if (!t) return null;

            const rt = Array.isArray(t.release_tracks)
              ? t.release_tracks[0] ?? null
              : t.release_tracks ?? null;

            return {
              ...t,
              release_track_id: rt?.id ?? null,
              release_id: rt?.release_id ?? t?.release_id ?? null,
              releases: Array.isArray(t.releases) ? t.releases[0] ?? null : t.releases ?? null,
              artist_profile: Array.isArray(t.artist_profile)
                ? t.artist_profile[0] ?? null
                : t.artist_profile ?? null,
              track_collaborators: t.track_collaborators ?? null,
            };
          })
          .filter(Boolean) ?? [];

      releaseTrackIdByTrackId = new Map<string, string>();
      for (const t of normalizedTracks as any[]) {
        if (t?.id && t?.release_track_id) {
          releaseTrackIdByTrackId.set(String(t.id), String(t.release_track_id));
        }
      }

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
          throw new Error("Library: Missing audio_url for track " + (t?.id ?? "unknown"));
        }

        const ownerArtist =
          t?.artist_profile?.id && t?.artist_profile?.display_name
            ? { id: String(t.artist_profile.id), display_name: String(t.artist_profile.display_name) }
            : null;

        const collabArtists = Array.isArray(t?.track_collaborators)
          ? t.track_collaborators
              .map((c: any) =>
                c?.profiles?.id && c?.profiles?.display_name
                  ? { id: String(c.profiles.id), display_name: String(c.profiles.display_name) }
                  : null
              )
              .filter(Boolean)
          : [];

        const artistsRaw = [ownerArtist, ...collabArtists].filter(Boolean) as { id: string; display_name: string }[];
        const artists = Array.from(new Map(artistsRaw.map((a) => [a.id, a])).values());

        return {
          id: t.id,
          title: t.title ?? null,
          artist_id: t.artist_id ?? null,
          audio_url,
          cover_url,
          bpm: t.bpm ?? null,
          key: t.key ?? null,
          genre: (t as any).genre ?? null,
          release_id: (t as any).release_id ?? null,
          release_track_id: (t as any).release_track_id ?? null,
          artist_profile: t.artist_profile ?? null,
          artists,
        };
      });

      const baseTrackData = toPlayerTrackList(playerTrackInputs as any);
      trackData = baseTrackData.map((pt, idx) => {
        const input = playerTrackInputs[idx];
        return {
          ...pt,
          artists: (input as any)?.artists ?? null,
          artist_profile: (input as any)?.artist_profile ?? null,
        };
      });
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
          artists = (artistsData ?? []).filter((p: any) => p.role === "artist");
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className="
          relative overflow-hidden
          -mx-4 sm:-mx-6 lg:-mx-8
          px-4 sm:px-6 lg:px-8
          pt-10
          pb-16
        "
      >
        <div
          aria-hidden="true"
          className="
            absolute inset-0
            bg-gradient-to-r
            from-[#0B1614]
            via-[#0B1614]
            to-[#06212A]
          "
        />

        <div
          aria-hidden="true"
          className="
            absolute inset-0
            bg-[radial-gradient(90%_140%_at_80%_15%,rgba(0,255,198,0.22),transparent_60%)]
          "
        />

        <div
          aria-hidden="true"
          className="
            absolute inset-x-0 bottom-0
            h-40
            bg-gradient-to-b
            from-transparent
            via-[#0B0B0D]/70
            to-[#0B0B0D]
          "
        />

        <div className="relative z-10">
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Your Library</h1>
            <p className="text-sm text-neutral-400">
              Collect your favourite playlists, tracks and artists in one place.
            </p>
          </header>

          <div className="mt-10 border-b border-white/5">
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
        </div>
      </div>

      <section className="pt-0 -mt-2 sm:mt-0">
        {currentTab === "playlists" && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 sm:gap-3 items-start">
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
              <p className="text-sm text-neutral-400 col-span-full">No playlists found.</p>
            )}
          </div>
        )}

        {currentTab === "tracks" && (
          <div className="pt-2">
            <LibraryTracksClient
              trackData={trackData}
              releaseTrackIdByTrackId={Object.fromEntries(releaseTrackIdByTrackId)}
            />
          </div>
        )}

        {currentTab === "artists" && (
          <div className="pt-6">
            {artists.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 sm:gap-3 items-start">
                {artists.map((artist) => (
                  <ArtistCard
                    key={artist.id}
                    artistId={artist.id}
                    displayName={artist.display_name}
                    avatarUrl={artist.avatar_url}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No artists found.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

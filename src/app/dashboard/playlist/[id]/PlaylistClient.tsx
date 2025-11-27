"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { createBrowserClient } from "@supabase/ssr";
import AddTrackModal from "@/components/AddTrackModal";
import PlaylistSettingsTrigger from "@/components/PlaylistSettingsTrigger";
import PlaylistRow from "@/components/PlaylistRow";
import DeletePlaylistModal from "@/components/DeletePlaylistModal";
import PlaylistDetailsModal from "@/components/PlaylistDetailsModal";
import PlaylistHeaderClient from "./PlaylistHeaderClient";

import { Playlist, PlaylistTrack, Track } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";
import { toPlayerTrack } from "@/lib/playerTrack";

export default function PlaylistClient({
  playlist,
  playlistTracks,
  initialPlayerTracks,
  user,
}: {
  playlist: Playlist;
  playlistTracks: PlaylistTrack[];
  initialPlayerTracks: PlayerTrack[];
  user: any | null;
}) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [localPlaylist, setLocalPlaylist] = useState(playlist);
  const [localTracks, setLocalTracks] = useState<PlaylistTrack[]>(playlistTracks);
  const [playerTracks, setPlayerTracks] = useState<PlayerTrack[]>(initialPlayerTracks);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [artistMap, setArtistMap] = useState<Record<string, string>>({});

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!open || !user) return;

    let active = true;

    async function loadArtists() {
      const { data: tr, error } = await supabase
        .from("tracks")
        .select("artist_id")
        .eq("artist_id", user.id);

      if (error) {
        console.error("Artist load error:", error);
        return;
      }

      const artistIds = [
        ...new Set(
          (tr ?? [])
            .map((t) => t.artist_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      if (artistIds.length === 0) {
        if (active) setArtistMap({});
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", artistIds);

      if (profilesError) {
        console.error("Artist profile load error:", profilesError);
        return;
      }

      if (!active) return;

      const map: Record<string, string> = {};
      profilesData?.forEach((p) => {
        map[p.id] = p.display_name ?? "Unknown Artist";
      });

      setArtistMap(map);
    }

    loadArtists();
    return () => {
      active = false;
    };
  }, [open, user]);

  useEffect(() => {
    if (!open || !user) return;

    let active = true;
    setLoading(true);

    async function load() {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error("Track load error:", error);

      if (!active) return;

      const tracks = data ?? [];
      const lower = search.toLowerCase();

      const filtered = tracks.filter((t) => {
        const artistName =
          (t.artist_id ? artistMap[t.artist_id] : undefined) ??
          t.artist_name ??
          "";

        return (
          t.title.toLowerCase().includes(lower) ||
          artistName.toLowerCase().includes(lower)
        );
      });

      setSearchResults(filtered);

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [open, search, user, artistMap]);

  // Toggle public/private
  async function togglePublic() {
    const newValue = !localPlaylist.is_public;

    const { error } = await supabase
      .from("playlists")
      .update({ is_public: newValue })
      .eq("id", localPlaylist.id);

    if (error) {
      console.error("Public update error:", error);
      return;
    }

    setLocalPlaylist((prev) => ({ ...prev, is_public: newValue }));
  }

  function onEditDetails() {
    setDetailsOpen(true);
  }

  // Delete playlist (with cover cleanup)
  async function onDeletePlaylist() {
    const { data: fresh, error: freshError } = await supabase
      .from("playlists")
      .select("cover_url")
      .eq("id", localPlaylist.id)
      .single();

    // 1) Cover löschen (falls vorhanden)
    if (fresh?.cover_url || localPlaylist.cover_url) {
      try {
        const bucketName = "playlist-covers";
        const publicUrl = fresh?.cover_url ?? localPlaylist.cover_url;

        let relativePath = publicUrl?.split("/object/public/playlist-covers/")[1];

        if (!relativePath) {
          console.error("❌ Could not extract relative path");
        } else {
          if (relativePath.includes("?")) {
            relativePath = relativePath.split("?")[0];
          }

          console.log("Deleting cover (playlist delete):", relativePath);

          const { data, error } = await supabase.storage
            .from(bucketName)
            .remove([relativePath]);

          if (error) {
            console.error("❌ Storage delete error:", error);
          } else {
            console.log("✅ Deleted from storage (playlist delete):", data);
          }
        }
      } catch (err) {
        console.error("❌ Error parsing cover delete:", err);
      }
    }

    // 2) cover_url in DB auf NULL setzen
    await supabase
      .from("playlists")
      .update({ cover_url: null })
      .eq("id", localPlaylist.id);

    // 3) Playlist löschen
    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", localPlaylist.id);

    if (error) {
      console.error("Error deleting playlist:", error);
      return;
    }

    // Redirect
    window.location.href = "/dashboard/library";
  }

  // Add Track
  async function onSelectTrack(track: Track) {
    const nextPosition =
      localTracks.length === 0
        ? 1
        : Math.max(...localTracks.map((t) => t.position)) + 1;

    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: localPlaylist.id,
      track_id: track.id,
      position: nextPosition,
    });

    if (error) {
      console.error("Insert error:", error);
      return;
    }

    setLocalTracks((prev) => [
      ...prev,
      { position: nextPosition, tracks: track },
    ]);

    setPlayerTracks((prev) => [...prev, toPlayerTrack(track)]);
    setOpen(false);
  }

  // Delete track from playlist
  async function onDeleteTrack(trackId: string) {
    const { error } = await supabase
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", localPlaylist.id)
      .eq("track_id", trackId);

    if (error) {
      console.error("Delete error:", error);
      return;
    }

    setLocalTracks((prev) => prev.filter((t) => t.tracks.id !== trackId));
    setPlayerTracks((prev) => prev.filter((t) => t.id !== trackId));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  return (
    <div className="space-y-8">
      <PlaylistHeaderClient
        playlist={localPlaylist}
        playerTracks={playerTracks}
        onAddTrack={() => setOpen(true)}
        actions={
          <PlaylistSettingsTrigger
            playlist={localPlaylist}
            isOwner={user?.id === localPlaylist.created_by}
            onTogglePublic={togglePublic}
            onDeletePlaylist={() => setDeleteOpen(true)}
            onEditDetails={onEditDetails}
          />
        }
      />

      <AddTrackModal
        open={open}
        onClose={() => setOpen(false)}
        search={search}
        onSearchChange={setSearch}
        tracks={searchResults.map((track) => ({
          id: track.id,
          title: track.title,
          artist:
            (track.artist_id ? artistMap[track.artist_id] : undefined) ??
            "Unknown Artist",
          cover_url: track.cover_url,
          artist_id: track.artist_id,
        }))}
        localTracks={localTracks}
        onSelectTrack={(trackId) => {
          const track = searchResults.find((t) => t.id === trackId);
          if (track) onSelectTrack(track);
        }}
      />

      {/* Tracks */}
      <div className="space-y-3 rounded-xl bg-neutral-950/40 border border-neutral-900 p-4">
        <div
          className="
            grid grid-cols-[40px_60px_1fr_70px_70px_80px]
            text-xs text-white/50 uppercase tracking-wide
            px-4 py-2
          "
        >
          <span>#</span>
          <span>Cover</span>
          <span>Title</span>
          <span>BPM</span>
          <span>Key</span>
          <span>Actions</span>
        </div>

        {playerTracks.length ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={async ({ active, over }) => {
              if (!over || active.id === over.id) return;

              // 1) PRODUCE NEW ORDER BASED ON CURRENT STATE (NO STATE MUTATION YET)
              const oldIndex = playerTracks.findIndex((t) => t.id === active.id);
              const newIndex = playerTracks.findIndex((t) => t.id === over.id);

              const newPlayerTracks = arrayMove(playerTracks, oldIndex, newIndex);
              const newLocalTracks = arrayMove(
                localTracks,
                localTracks.findIndex((t) => t.tracks.id === active.id),
                localTracks.findIndex((t) => t.tracks.id === over.id)
              );

              // 2) UPDATE UI FIRST (SYNC, STABLE, NO JUMPING)
              setPlayerTracks(newPlayerTracks);
              setLocalTracks(newLocalTracks);

              // 3) PREPARE DB ORDER FROM newLocalTracks (NOT old state!)
              const updates = newLocalTracks.map((item, index) => ({
                playlist_id: localPlaylist.id,
                track_id: item.tracks.id,
                position: index + 1,
              }));

              // 4) SAVE IN DATABASE
              for (const row of updates) {
                const { error } = await supabase
                  .from("playlist_tracks")
                  .update({ position: row.position })
                  .eq("playlist_id", row.playlist_id)
                  .eq("track_id", row.track_id);

                if (error) {
                  console.error("Position update error:", error);
                  break;
                }
              }

              // ❗️ NO UI SYNC AFTER THIS — UI IS ALREADY CORRECT
            }}
          >
            <SortableContext
              items={playerTracks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {playerTracks.map((track, index) => (
                  <PlaylistRow
                    key={track.id}
                    track={track}
                    tracks={playerTracks}
                    onDelete={() => onDeleteTrack(track.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-white/50">No tracks in this playlist yet.</p>
        )}
      </div>

      <DeletePlaylistModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={onDeletePlaylist}
      />
      <PlaylistDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        playlist={localPlaylist}
        onUpdated={(updated) => {
          setLocalPlaylist((prev) => ({ ...prev, ...updated }));
        }}
      />
    </div>
  );
}

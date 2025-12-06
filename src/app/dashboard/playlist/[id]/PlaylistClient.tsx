"use client";

import { useState } from "react";
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
import PlaylistSettingsTrigger from "@/components/PlaylistSettingsTrigger";
import PlaylistRow from "@/components/PlaylistRow";
import DeletePlaylistModal from "@/components/DeletePlaylistModal";
import PlaylistDetailsModal from "@/components/PlaylistDetailsModal";
import PlaylistAddTrackModal from "@/components/PlaylistAddTrackModal";
import PlaylistHeaderClient from "./PlaylistHeaderClient";

import { Playlist, PlaylistTrack } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [localPlaylist, setLocalPlaylist] = useState(playlist);
  const [localTracks, setLocalTracks] = useState<PlaylistTrack[]>(playlistTracks);
  const [playerTracks, setPlayerTracks] = useState<PlayerTrack[]>(initialPlayerTracks);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

  async function handleTrackAdded(newPlayerTrack: PlayerTrack) {
    setPlayerTracks((prev) => [...prev, newPlayerTrack]);

    const { data, error } = await supabase
      .from("playlist_tracks")
      .select(
        `
        position,
        tracks (
          *,
          releases:releases!tracks_release_id_fkey (
            status,
            cover_path
          ),
          artist:profiles!tracks_artist_id_fkey (
            display_name
          )
        )
      `
      )
      .eq("playlist_id", localPlaylist.id)
      .eq("track_id", newPlayerTrack.id)
      .maybeSingle<PlaylistTrack>();

    if (error) {
      console.error("Failed to fetch newly added playlist track:", error);
    }

    if (data) {
      setLocalTracks((prev) => [...prev, data]);
    } else {
      setLocalTracks((prev) => [
        ...prev,
        {
          position: prev.length + 1,
          tracks: {
            id: newPlayerTrack.id,
            title: newPlayerTrack.title,
            artist_name: newPlayerTrack.profiles?.display_name ?? null,
            cover_url: newPlayerTrack.cover_url,
            audio_url: newPlayerTrack.audio_url,
            created_at: null,
            artist_id: newPlayerTrack.artist_id,
            bpm: newPlayerTrack.bpm ?? null,
            key: newPlayerTrack.key ?? null,
            artist: newPlayerTrack.profiles
              ? { display_name: newPlayerTrack.profiles.display_name ?? null }
              : null,
            artist_profile: newPlayerTrack.profiles
              ? { display_name: newPlayerTrack.profiles.display_name ?? null }
              : null,
            releases: null,
          },
        } as PlaylistTrack,
      ]);
    }
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
        onAddTrack={() => setAddOpen(true)}
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
      <PlaylistAddTrackModal
        playlistId={localPlaylist.id}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingTrackIds={playerTracks.map((t) => t.id)}
        onTrackAdded={handleTrackAdded}
      />
    </div>
  );
}

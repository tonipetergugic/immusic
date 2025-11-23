"use client";

import { useMemo } from "react";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import type { Database } from "@/types/database";

type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];

interface ArtistTracksTableProps {
  tracks: TrackRow[];
}

export default function ArtistTracksTable({ tracks }: ArtistTracksTableProps) {
  const hasTracks = Array.isArray(tracks) && tracks.length > 0;

  const sortedTracks = useMemo(
    () =>
      hasTracks
        ? [...tracks].sort((a, b) =>
            (b.created_at ?? "").localeCompare(a.created_at ?? "")
          )
        : [],
    [tracks, hasTracks]
  );

  return (
    <section className="rounded-xl bg-[#1A1A1A] p-6">
      <h2 className="text-xl font-semibold mb-4">Track List</h2>

      {!hasTracks ? (
        <p className="text-sm text-[#B3B3B3]">No tracks uploaded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-200">
            <thead className="text-xs uppercase text-zinc-300 border-b border-zinc-700">
              <tr>
                <th scope="col" className="py-4">
                  Cover
                </th>
                <th scope="col" className="py-4">
                  Title
                </th>
                <th scope="col" className="py-4">
                  BPM
                </th>
                <th scope="col" className="py-4">
                  Key
                </th>
                <th scope="col" className="py-4">
                  Uploaded
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedTracks.map((track) => (
                <tr
                  key={track.id}
                  className="border-b border-zinc-800 hover:bg-zinc-900/40 transition"
                >
                  <td className="py-4 pr-4">
                    <div className="relative group h-14 w-14 rounded overflow-hidden bg-zinc-800">
                      {track.cover_url ? (
                        <img
                          src={track.cover_url}
                          alt={track.title ?? "Track cover"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-zinc-700" />
                      )}

                      <PlayOverlayButton
                        track={{
                          id: track.id,
                          title: track.title ?? "Untitled Track",
                          cover_url: track.cover_url,
                          audio_url: track.audio_url,
                          artist_id: track.artist_id,
                          bpm: track.bpm,
                          key: track.key,
                          created_at: track.created_at,
                        }}
                      />
                    </div>
                  </td>

                  <td className="py-4">{track.title ?? "Untitled Track"}</td>
                  <td className="py-4">{track.bpm ?? "—"}</td>
                  <td className="py-4">{track.key ?? "—"}</td>
                  <td className="py-4">
                    {track.created_at
                      ? new Date(track.created_at).toLocaleDateString("de-DE")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


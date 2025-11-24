"use client";

import { useMemo } from "react";
import { usePlayer } from "@/context/PlayerContext";
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

  const { setQueueList, togglePlay, currentTrack, isPlaying } = usePlayer();

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

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const index = sortedTracks.findIndex((t) => t.id === track.id);
                          if (currentTrack?.id === track.id) {
                            togglePlay();
                          } else {
                            const fullList = sortedTracks.map((t) => ({
                              ...t,
                              title: t.title ?? "Untitled Track",
                            })) as any[];
                            setQueueList(fullList, index);
                          }
                        }}
                        className="
                          absolute inset-0 m-auto w-12 h-12 rounded-full
                          flex items-center justify-center
                          bg-[#00FFC6] hover:bg-[#00E0B0]
                          text-black opacity-0 group-hover:opacity-100
                          transition-all duration-300 shadow-[0_0_20px_rgba(0,255,198,0.4)]
                        "
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'><rect x='6' y='4' width='4' height='16'/><rect x='14' y='4' width='4' height='16'/></svg>
                        ) : (
                          <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'><path d='M8 5v14l11-7z'/></svg>
                        )}
                      </button>
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


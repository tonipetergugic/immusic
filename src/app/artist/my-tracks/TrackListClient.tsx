"use client";

import { useState } from "react";
import { TrackCard } from "./TrackCard";

type Track = {
  id: string;
  artist_id: string;
  title: string;
  version: string | null;
  audio_path: string;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  has_lyrics: boolean;
  is_explicit: boolean;
  status: "approved" | "development" | "performance";
  isLocked?: boolean;
};

type TrackListClientProps = {
  tracks: Track[];
};

export default function TrackListClient({ tracks }: TrackListClientProps) {
  const [query, setQuery] = useState("");

  const q = query.toLowerCase();

  const statusRank: Record<Track["status"], number> = {
    approved: 0,
    development: 1,
    performance: 2,
  };

  const filtered = tracks
    .filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        (track.version ?? "").toLowerCase().includes(q)
    )
    .sort((a, b) => {
      const ra = statusRank[a.status];
      const rb = statusRank[b.status];
      if (ra !== rb) return ra - rb;
      return a.title.localeCompare(b.title);
    });

  return (
    <div className="space-y-6 w-full">
      <input
        type="text"
        placeholder="Search tracks..."
        className="w-full bg-transparent border-b border-white/10 px-0 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-0"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="flex flex-col gap-3">
        {filtered.map((track) => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>
    </div>
  );
}


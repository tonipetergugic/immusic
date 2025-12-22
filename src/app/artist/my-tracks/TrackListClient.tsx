"use client";

import { useState } from "react";
import { TrackCard } from "./TrackCard";

type Track = {
  id: string;
  title: string;
  audio_path: string;
  bpm: number | null;
  key: string | null;
  genre: string | null;
};

type TrackListClientProps = {
  tracks: Track[];
};

export default function TrackListClient({ tracks }: TrackListClientProps) {
  const [query, setQuery] = useState("");

  const filtered = tracks.filter((track) =>
    track.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search tracks..."
        className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-white/40"
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


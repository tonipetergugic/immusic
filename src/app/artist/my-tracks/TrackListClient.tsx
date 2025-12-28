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
    <div className="space-y-6 max-w-[900px] mx-auto">
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


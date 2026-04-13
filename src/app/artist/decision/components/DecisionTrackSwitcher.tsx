"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatTrackTitle } from "@/lib/formatTrackTitle";

type DecisionTrackSwitcherItem = {
  id: string;
  title: string | null;
  version: string | null;
  genre: string | null;
  status: string | null;
};

type Props = {
  tracks: DecisionTrackSwitcherItem[];
  selectedTrackId: string | null;
};

export default function DecisionTrackSwitcher({
  tracks,
  selectedTrackId,
}: Props) {
  const [query, setQuery] = useState("");

  const filteredTracks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return tracks;
    }

    return tracks.filter((track) => {
      const haystack = [
        track.title ?? "",
        track.version ?? "",
        track.genre ?? "",
        track.status ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [tracks, query]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
        Track switcher
      </div>

      <div className="mt-2 text-xs leading-5 text-white/45">
        Choose another track without leaving the Decision Center.
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tracks"
          className="w-full rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/35"
        />
      </div>

      {filteredTracks.length === 0 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/60">
          No matching tracks.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {filteredTracks.map((track) => {
            const isActive = selectedTrackId === track.id;

            return (
              <Link
                key={track.id}
                href={`/artist/decision?track=${encodeURIComponent(track.id)}`}
                className={[
                  "block rounded-xl border px-4 py-3 transition",
                  isActive
                    ? "border-[#00FFC6]/35 bg-[#00FFC6]/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <div className="text-sm font-medium text-white">
                  {formatTrackTitle(track.title, track.version)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
                  <span>{track.status ?? "unknown"}</span>
                  <span>•</span>
                  <span>{track.genre ?? "No genre"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

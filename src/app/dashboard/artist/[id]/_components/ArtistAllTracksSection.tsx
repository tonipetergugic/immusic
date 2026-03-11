"use client";

import { useMemo } from "react";
import TrackRowBase from "@/components/TrackRowBase";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import LibraryTrackArtists from "@/components/LibraryTrackArtists";
import { toPlayerTrack } from "@/lib/playerTrack";
import type { PlayerTrack } from "@/types/playerTrack";
import type { TopTrackDto } from "../_types/artistPageDto";

export default function ArtistAllTracksSection({
  allTracks,
  fallbackArtistId,
  fallbackDisplayName,
}: {
  allTracks: TopTrackDto[];
  fallbackArtistId: string;
  fallbackDisplayName: string;
}) {
  const playerTracksQueue: PlayerTrack[] = useMemo(() => {
    return allTracks.map((t) => {
      const primaryArtistId = t.artists?.[0]?.id ?? fallbackArtistId;
      const primaryArtistName =
        t.artists?.[0]?.displayName ?? fallbackDisplayName;

      const pt = toPlayerTrack({
        id: t.trackId,
        title: t.title,
        artist_id: primaryArtistId,
        audio_url: t.audioUrl,
        cover_url: t.coverUrl ?? null,
        profiles: { display_name: primaryArtistName },
      });

      (pt as any).release_id = t.releaseId ?? null;

      return pt;
    });
  }, [allTracks, fallbackArtistId, fallbackDisplayName]);

  const queueIndexByTrackId = useMemo(() => {
    const m = new Map<string, number>();
    playerTracksQueue.forEach((pt, idx) => m.set(pt.id, idx));
    return m;
  }, [playerTracksQueue]);

  return (
    <div className="w-full px-0 mt-6 pb-6 overflow-x-hidden touch-pan-y min-w-0">
      <div className="flex items-end justify-between gap-4 mb-3">
        <h2 className="text-3xl font-bold text-white">More from this Artist</h2>
        <div className="min-w-[220px] text-right text-sm text-[#B3B3B3]">
          {allTracks.length > 0 ? `${allTracks.length} Tracks` : ""}
        </div>
      </div>

      {allTracks.length > 0 ? (
        <div className="flex flex-col w-full min-w-0">
          {allTracks.map((t, idx) => {
            const queueIndex = queueIndexByTrackId.get(t.trackId) ?? -1;
            const track = playerTracksQueue[queueIndex];
            if (!track) return null;

            return (
              <TrackRowBase
                key={t.trackId}
                track={track}
                index={queueIndex}
                tracks={playerTracksQueue}
                coverUrl={t.coverUrl}
                leadingSlot={
                  <span className="text-white/50 text-sm tabular-nums">
                    {idx + 1}
                  </span>
                }
                subtitleSlot={
                  <div key={`alltrack-artists-${t.trackId}`}>
                    <LibraryTrackArtists
                      artists={t.artists.map((a) => ({
                        id: a.id,
                        display_name: a.displayName,
                      }))}
                      fallbackArtistId={fallbackArtistId}
                      fallbackDisplayName={fallbackDisplayName}
                      disableLinks
                    />
                  </div>
                }
                bpmSlot={<span>{t.bpm ?? "—"}</span>}
                keySlot={<span>{t.key ?? "—"}</span>}
                genreSlot={<span className="truncate">{t.genre ?? "—"}</span>}
                actionsSlot={
                  <TrackOptionsTrigger
                    track={track}
                    showGoToArtist={false}
                    showGoToRelease={true}
                    releaseId={t.releaseId}
                  />
                }
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-neutral-400 text-sm">No tracks yet.</p>
        </div>
      )}
    </div>
  );
}

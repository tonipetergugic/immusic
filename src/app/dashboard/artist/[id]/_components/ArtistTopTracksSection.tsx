"use client";

import { useMemo } from "react";
import TrackRowBase from "@/components/TrackRowBase";
import TrackRatingInline from "@/components/TrackRatingInline";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import LibraryTrackArtists from "@/components/LibraryTrackArtists";
import { toPlayerTrack } from "@/lib/playerTrack";
import type { PlayerTrack } from "@/types/playerTrack";
import type { TopTrackDto } from "../_types/artistPageDto";
import { usePlayer } from "@/context/PlayerContext";

type ArtistTopPlayerTrack = PlayerTrack & {
  status?: string | null;
  release_id?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
};

export default function ArtistTopTracksSection({
  topTracks,
  fallbackArtistId,
  fallbackDisplayName,
}: {
  topTracks: TopTrackDto[];
  fallbackArtistId: string;
  fallbackDisplayName: string;
}) {
  const { isTrackPlaybackBlocked } = usePlayer();
  const playerTracksQueue: PlayerTrack[] = useMemo(() => {
    return topTracks.map((t) => {
      const primaryArtistId = t.artists?.[0]?.id ?? fallbackArtistId;
      const primaryArtistName =
        t.artists?.[0]?.displayName ?? fallbackDisplayName;

      // Build PlayerTrack via existing official helper (same pattern as old page)
      const pt = toPlayerTrack({
        id: t.trackId,
        title: t.title,
        artist_id: primaryArtistId,
        audio_url: t.audioUrl,
        cover_url: t.coverUrl ?? null,
        profiles: { display_name: primaryArtistName },
        is_explicit: t.isExplicit,
      }) as ArtistTopPlayerTrack;

      pt.status = t.status ?? null;

      // TrackOptionsMenu nutzt track.release_id für "Go to Release"
      pt.release_id = t.releaseId ?? null;

      // Optional back-compat fields (harmless)
      pt.rating_avg = t.stats30d.ratingAvg;
      pt.rating_count = t.stats30d.ratingsCount;

      return pt;
    });
  }, [topTracks, fallbackArtistId, fallbackDisplayName]);

  const queueIndexByTrackId = useMemo(() => {
    const m = new Map<string, number>();
    playerTracksQueue.forEach((pt, idx) => m.set(pt.id, idx));
    return m;
  }, [playerTracksQueue]);

  return (
    <div className="w-full px-0 mt-3 pb-6 overflow-x-hidden touch-pan-y min-w-0">
      <div className="flex items-end justify-between gap-4 mb-3">
        <h2 className="text-3xl font-bold text-white">
          Top <span className="text-[#00FFC6]">Tracks</span>
        </h2>
        <div className="min-w-[220px] text-right text-sm text-[#B3B3B3]">
          {topTracks.length > 0 ? "Last 30 days" : ""}
        </div>
      </div>

      {topTracks.length > 0 ? (
        <div className="flex flex-col w-full min-w-0">
          {topTracks.map((t, idx) => {
            const queueIndex = queueIndexByTrackId.get(t.trackId) ?? -1;
            const track = playerTracksQueue[queueIndex];
            if (!track) return null;
            const isBlocked = isTrackPlaybackBlocked(track);

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
                  <div key={`toptrack-artists-${t.trackId}`}>
                    <LibraryTrackArtists
                      artists={t.artists.map((a) => ({
                        id: a.id,
                        display_name: a.displayName,
                      }))}
                      fallbackArtistId={fallbackArtistId}
                      fallbackDisplayName={fallbackDisplayName}
                      currentArtistId={fallbackArtistId}
                      isBlocked={isBlocked}
                    />
                  </div>
                }
                metaSlot={
                  <div
                    key={`meta-${t.trackId}`}
                    className="flex min-w-0 items-center gap-4 overflow-hidden"
                  >
                    {/* Rating column (fixed width) */}
                    <div className="w-[140px] shrink-0">
                      {t.releaseTrackId ? (
                        <TrackRatingInline
                          releaseTrackId={t.releaseTrackId}
                          trackId={t.trackId}
                          initialAvg={t.stats30d.ratingAvg}
                          initialCount={t.stats30d.ratingsCount}
                          initialMyStars={t.my_stars}
                          readOnly={isBlocked}
                          hideStreams={true}
                        />
                      ) : (
                        <div className="text-xs text-white/40">No ratings yet</div>
                      )}
                    </div>

                    {/* Streams */}
                    <div className="hidden min-w-0 flex-1 truncate text-xs text-white/50 tabular-nums sm:block">
                      {(t.stats30d.streams ?? 0).toLocaleString()} streams
                    </div>
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
          <p className="text-neutral-400 text-sm">No top tracks yet.</p>
        </div>
      )}
    </div>
  );
}

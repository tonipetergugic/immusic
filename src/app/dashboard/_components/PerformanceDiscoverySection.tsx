"use client";

import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRatingInline from "@/components/TrackRatingInline";
import TrackRowBase from "@/components/TrackRowBase";
import { formatTrackTitle } from "@/lib/formatTrackTitle";

type Props = {
  performanceGenre: string;
  setPerformanceGenre: (value: string) => void;
  performanceGenreOptions: string[];

  performanceLoading: boolean;
  performanceError: string | null;
  performanceItems: any[];

  perfQueue: any[];
  perfTrackMetaMap: any;

  routerPush: (href: string) => void;
};

export default function PerformanceDiscoverySection({
  performanceGenre,
  setPerformanceGenre,
  performanceGenreOptions,
  performanceLoading,
  performanceError,
  performanceItems,
  perfQueue,
  perfTrackMetaMap,
  routerPush,
}: Props) {
  return (
    <>
      {/* Performance Discovery (text must sit above tracks, not above releases) */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Performance Discovery</h2>
            <p className="text-sm text-white/50">
              Tracks appear here once they have verified listener engagement and ratings.
            </p>
          </div>

          <div className="w-full md:w-[220px]">
            <label className="sr-only" htmlFor="perf-genre">
              Genre
            </label>
            <select
              id="perf-genre"
              value={performanceGenre}
              onChange={(e) => setPerformanceGenre(e.target.value)}
              className="
                w-full h-10 rounded-full px-4 text-sm
                bg-black/25 border border-white/10
                text-white/80
                focus:outline-none focus:ring-2 focus:ring-[#00FFC655]
              "
            >
              <option value="all">All genres</option>
              {performanceGenreOptions.map((g) => (
                <option key={g} value={g.toLowerCase()}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {performanceLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111112] px-4 py-3"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
                <div className="mt-2 h-3 w-1/4 bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : performanceError ? (
        <p className="text-red-400 text-sm">{performanceError}</p>
      ) : (performanceItems ?? []).length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#111112] p-6">
          <h3 className="text-sm font-semibold text-white/80">
            No performance tracks yet
          </h3>
          <p className="mt-1 text-sm text-white/50">
            Tracks appear here once they have verified listener activity and ratings.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {perfQueue.map((rowTrack: any, idx: number) => {
            const trackId = rowTrack.id;
            const releaseId = rowTrack.release_id ?? null;
            const artistName =
              (rowTrack as any)?.profiles?.display_name ?? "Unknown Artist";
            const coverUrl = rowTrack.cover_url ?? null;

            return (
              <TrackRowBase
                key={trackId ?? `${idx}`}
                track={rowTrack as any}
                index={idx}
                tracks={perfQueue as any}
                coverUrl={coverUrl}
                coverSize="md"
                // getQueue ENTFERNT (nur eine Queue-Quelle)
                leadingSlot={idx + 1}
                titleSlot={
                  <div className="flex items-center min-w-0">
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={() => {
                        routerPush(
                          releaseId
                            ? `/dashboard/release/${releaseId}`
                            : `/dashboard/track/${trackId}`
                        );
                      }}
                      className="
                        text-left text-[13px] font-semibold text-white truncate
                        hover:text-[#00FFC6] transition-colors
                        focus:outline-none
                      "
                      title={formatTrackTitle(rowTrack.title, (rowTrack as any).version)}
                    >
                      {formatTrackTitle(rowTrack.title, (rowTrack as any).version)}
                    </button>
                  </div>
                }
                subtitleSlot={
                  Array.isArray((rowTrack as any)?.artists) &&
                  (rowTrack as any).artists.length > 0 ? (
                    <div className="mt-1 text-left text-xs text-white/60 truncate">
                      {(rowTrack as any).artists.map(
                        (a: any, idx2: number, arr: any[]) => (
                          <span key={a.id}>
                            <button
                              type="button"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() =>
                                routerPush(`/dashboard/artist/${String(a.id)}`)
                              }
                              className="
                                hover:text-[#00FFC6] hover:underline underline-offset-2
                                transition-colors
                                focus:outline-none
                              "
                              title={String(a.display_name)}
                            >
                              {String(a.display_name)}
                            </button>
                            {idx2 < arr.length - 1 ? ", " : null}
                          </span>
                        )
                      )}
                    </div>
                  ) : rowTrack.artist_id ? (
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={() =>
                        routerPush(`/dashboard/artist/${rowTrack.artist_id}`)
                      }
                      className="
                        mt-1 text-left text-xs text-white/60 truncate
                        hover:text-[#00FFC6] hover:underline underline-offset-2
                        transition-colors
                        focus:outline-none
                      "
                      title={artistName}
                    >
                      {artistName}
                    </button>
                  ) : (
                    <div className="mt-1 text-xs text-white/40 truncate">
                      Unknown artist
                    </div>
                  )
                }
                metaSlot={
                  (rowTrack as any).release_track_id ? (
                    <TrackRatingInline
                      readOnly={true}
                      releaseTrackId={(rowTrack as any).release_track_id}
                      initialAvg={(rowTrack as any).rating_avg}
                      initialCount={(rowTrack as any).rating_count}
                      initialStreams={(rowTrack as any).stream_count}
                      initialMyStars={null}
                    />
                  ) : (
                    <span className="text-xs text-white/60">★</span>
                  )
                }
                actionsSlot={
                  <TrackOptionsTrigger
                    track={rowTrack as any}
                    showGoToArtist={true}
                    showGoToRelease={true}
                    releaseId={releaseId ?? undefined}
                  />
                }
                // coverOverlaySlot ENTFERNT (kein doppelter PlayOverlayButton)
                bpmSlot={
                  <span className="text-white/50 text-sm tabular-nums">
                    {(rowTrack as any).bpm ?? "—"}
                  </span>
                }
                keySlot={
                  <span className="text-white/50 text-sm">
                    {(rowTrack as any).key ?? "—"}
                  </span>
                }
                genreSlot={
                  <span className="text-white/50 text-sm truncate">
                    {(perfTrackMetaMap as any)?.[trackId]?.genre ?? "—"}
                  </span>
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
}

"use client";

import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRatingInline from "@/components/TrackRatingInline";
import TrackRowBase from "@/components/TrackRowBase";
import { formatTrackTitle } from "@/lib/formatTrackTitle";
import type { PlayerTrack } from "@/types/playerTrack";
import HomeArtistSpotlightCard from "./HomeArtistSpotlightCard";
import ExplicitBadge from "@/components/ExplicitBadge";
import AppSelect from "@/components/AppSelect";
import { usePlayer } from "@/context/PlayerContext";

type PerformanceItemLike = unknown;

type PerfTrackMetaMap = Record<
  string,
  {
    genre: string | null;
  }
>;

type PerfQueueTrack = PlayerTrack & {
  release_id?: string | null;
  release_track_id?: string | null;
  stream_count?: number | null;
  my_stars?: number | null;
};

type Props = {
  performanceGenre: string;
  setPerformanceGenre: (value: string) => void;
  performanceGenreOptions: string[];

  performanceLoading: boolean;
  performanceError: string | null;
  performanceItems: PerformanceItemLike[];

  perfQueue: PerfQueueTrack[];
  perfTrackMetaMap: PerfTrackMetaMap;

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
  const { isTrackPlaybackBlocked } = usePlayer();
  const performanceGenreItems = [
    { value: "all", label: "All genres" },
    ...performanceGenreOptions.map((g) => ({
      value: g.toLowerCase(),
      label: g,
    })),
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Performance Discovery</h2>
            <p className="text-sm text-white/50">
              Tracks appear here once they have verified listener engagement and ratings.
            </p>
          </div>

          <div className="w-full md:w-[220px]">
            <label className="sr-only">Genre</label>
            <AppSelect
              value={performanceGenre}
              onChange={setPerformanceGenre}
              items={performanceGenreItems}
              className="[&>button]:h-10 [&>button]:rounded-full [&>button]:border-white/10 [&>button]:bg-black/25 [&>button]:px-4 [&>button]:text-sm [&>button]:text-white/80 [&>button]:focus:ring-2 [&>button]:focus:ring-[#00FFC655] [&>button_svg]:text-white/55"
            />
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
      ) : (perfQueue ?? []).length === 0 ? (
        (performanceItems ?? []).length === 0 ? (
          <div className="pt-3">
            <h3 className="text-sm font-semibold text-white/80">
              No performance tracks yet
            </h3>
          </div>
        ) : (
          <div className="pt-3">
            <h3 className="text-sm font-semibold text-white/80">
              No tracks match this genre
            </h3>
            <p className="mt-1 text-sm text-white/50">
              Try another genre or switch back to all genres.
            </p>
          </div>
        )
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 space-y-2">
            {perfQueue.map((rowTrack, idx) => {
              const trackId = rowTrack.id;
              const releaseId = rowTrack.release_id ?? null;
              const artistName = rowTrack.profiles?.display_name ?? "Unknown Artist";
              const coverUrl = rowTrack.cover_url ?? null;
              const artists = rowTrack.artists ?? [];
              const isBlocked = isTrackPlaybackBlocked(rowTrack);

              return (
                <TrackRowBase
                  key={trackId ?? `${idx}`}
                  track={rowTrack}
                  index={idx}
                  tracks={perfQueue}
                  coverUrl={coverUrl}
                  coverSize="md"
                  leadingSlot={idx + 1}
                  titleSlot={
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        aria-disabled={isBlocked}
                        tabIndex={isBlocked ? -1 : undefined}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isBlocked) return;
                          if (releaseId) routerPush(`/dashboard/release/${releaseId}`);
                        }}
                        className={`min-w-0 flex-1 text-left text-[13px] font-semibold truncate transition-colors focus:outline-none ${
                          isBlocked
                            ? "text-white/45 cursor-default"
                            : "text-[#00FFC6] hover:text-[#00E0B0] cursor-pointer"
                        }`}
                        title={formatTrackTitle(rowTrack.title, rowTrack.version)}
                      >
                        {formatTrackTitle(rowTrack.title, rowTrack.version)}
                      </button>

                      {rowTrack.is_explicit ? <ExplicitBadge /> : null}
                    </div>
                  }
                  subtitleSlot={
                    artists.length > 0 ? (
                      <div className={`mt-1 text-left text-xs truncate ${isBlocked ? "text-white/35" : "text-white/60"}`}>
                        {artists.map((artistItem, idx2) => (
                          <span key={artistItem.id}>
                            <button
                              type="button"
                              aria-disabled={isBlocked}
                              tabIndex={isBlocked ? -1 : undefined}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isBlocked) return;
                                routerPush(`/dashboard/artist/${artistItem.id}`);
                              }}
                              className={
                                isBlocked
                                  ? "transition-colors cursor-default focus:outline-none text-white/35"
                                  : `
                                hover:text-[#00FFC6] hover:underline underline-offset-2
                                transition-colors cursor-pointer
                                focus:outline-none
                              `
                              }
                              title={artistItem.display_name}
                            >
                              {artistItem.display_name}
                            </button>
                            {idx2 < artists.length - 1 ? ", " : null}
                          </span>
                        ))}
                      </div>
                    ) : rowTrack.artist_id ? (
                      <button
                        type="button"
                        aria-disabled={isBlocked}
                        tabIndex={isBlocked ? -1 : undefined}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isBlocked) return;
                          routerPush(`/dashboard/artist/${rowTrack.artist_id}`);
                        }}
                        className={`mt-1 text-left text-xs truncate transition-colors focus:outline-none ${
                          isBlocked
                            ? "text-white/35 cursor-default"
                            : "text-white/60 hover:text-[#00FFC6] hover:underline underline-offset-2 cursor-pointer"
                        }`}
                        title={artistName}
                      >
                        {artistName}
                      </button>
                    ) : (
                      <div className={`mt-1 text-xs truncate ${isBlocked ? "text-white/35" : "text-white/40"}`}>
                        Unknown artist
                      </div>
                    )
                  }
                  metaSlot={
                    rowTrack.release_track_id ? (
                      <TrackRatingInline
                        releaseTrackId={rowTrack.release_track_id}
                        trackId={rowTrack.id}
                        initialAvg={rowTrack.rating_avg}
                        initialCount={rowTrack.rating_count ?? undefined}
                        initialStreams={rowTrack.stream_count ?? 0}
                        initialMyStars={rowTrack.my_stars ?? null}
                        readOnly={isBlocked}
                      />
                    ) : (
                      <span className="text-xs text-white/60">★</span>
                    )
                  }
                  actionsSlot={
                    <TrackOptionsTrigger
                      track={rowTrack}
                      showGoToArtist={true}
                      showGoToRelease={true}
                      releaseId={releaseId ?? undefined}
                    />
                  }
                  bpmSlot={
                    <span className="text-white/50 text-sm tabular-nums">
                      {rowTrack.bpm ?? "—"}
                    </span>
                  }
                  keySlot={
                    <span className="text-white/50 text-sm">
                      {rowTrack.key ?? "—"}
                    </span>
                  }
                  genreSlot={
                    <span className="text-white/50 text-sm truncate">
                      {perfTrackMetaMap?.[trackId]?.genre ?? "—"}
                    </span>
                  }
                />
              );
            })}
          </div>

          <div className="min-w-0 xl:sticky xl:top-4">
            <HomeArtistSpotlightCard tracks={perfQueue} />
          </div>
        </div>
      )}
    </>
  );
}

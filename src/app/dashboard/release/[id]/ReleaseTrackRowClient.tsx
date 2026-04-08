"use client";

import { useRouter } from "next/navigation";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRowBase from "@/components/TrackRowBase";
import TrackRatingInline from "@/components/TrackRatingInline";
import type { PlayerTrack } from "@/types/playerTrack";
import { formatTrackTitle } from "@/lib/formatTrackTitle";
import ExplicitBadge from "@/components/ExplicitBadge";
import { usePlayer } from "@/context/PlayerContext";

export default function ReleaseTrackRowClient({
  releaseId,
  startIndex,
  playerQueue,
  positionLabel,
  track,
  artists,
  ratingAvg,
  ratingCount,
  streamCount,
  myStars,
  releaseCoverUrl,
  isActive,
  onSelect,
}: {
  releaseId: string;
  startIndex: number;
  playerQueue: PlayerTrack[];
  positionLabel: string;
  track: {
    id: string;
    title: string | null;
    bpm: number | null;
    key: string | null;
    genre: string | null;
    version: string | null;
    status: string | null;
    is_explicit: boolean;
  };
  artists: { id: string; display_name: string }[];
  ratingAvg: number | null;
  ratingCount: number | null;
  streamCount: number;
  myStars: number | null;
  releaseCoverUrl: string | null;
  isActive: boolean;
  onSelect: () => void;
}) {
  const router = useRouter();
  const { currentTrack, isPlaying, isTrackPlaybackBlocked } = usePlayer();
  const rowTrack: PlayerTrack = {
    id: track.id,
    title: track.title ?? "Untitled",
    version: track.version ?? null,
    artist_id: artists?.[0]?.id ?? "",
    status: track.status ?? null,
    is_explicit: track.is_explicit,
    cover_url: releaseCoverUrl ?? null,
    audio_url: "",
    bpm: track.bpm ?? null,
    key: track.key ?? null,
    genre: track.genre ?? null,
    release_id: releaseId,
    profiles: artists?.[0]?.display_name
      ? { display_name: artists[0].display_name }
      : undefined,
  };
  const isBlocked = isTrackPlaybackBlocked(rowTrack);

  return (
    <div
      onClick={onSelect}
      className="cursor-pointer hover:bg-white/[0.04] transition-colors"
    >
      <TrackRowBase
        track={rowTrack}
        index={startIndex}
        tracks={playerQueue}
        coverSize="md"
        leadingSlot={
          <span className="text-white/50 text-[11px] tabular-nums">
            {positionLabel}
          </span>
        }
        titleSlot={
          <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden">
            {currentTrack?.id === track.id && isPlaying ? (
              <>
                <div className="flex-1 overflow-hidden md:hidden">
                  <div
                    className="flex w-max min-w-max items-center gap-6 whitespace-nowrap will-change-transform"
                    style={{ animation: "trackTitleMarquee 10s linear infinite" }}
                  >
                    {[0, 1].map((copyIndex) => (
                      <div
                        key={copyIndex}
                        className="inline-flex items-center gap-2 whitespace-nowrap"
                        aria-hidden={copyIndex === 1 ? "true" : undefined}
                      >
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
                            router.push(`/dashboard/release/${rowTrack.release_id}`);
                          }}
                          className={`text-left text-[13px] font-semibold transition-colors focus:outline-none whitespace-nowrap ${
                            isBlocked
                              ? "text-white/45 cursor-default"
                              : track.status === "performance"
                              ? "text-[#00FFC6] hover:text-[#00E0B0] cursor-pointer"
                              : "text-white hover:text-[#00FFC6] cursor-pointer"
                          }`}
                          title={formatTrackTitle(track.title, track.version)}
                        >
                          {formatTrackTitle(track.title, track.version)}
                        </button>

                        {track.is_explicit ? <ExplicitBadge /> : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden w-full min-w-0 items-center gap-2 overflow-hidden md:flex">
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
                      router.push(`/dashboard/release/${rowTrack.release_id}`);
                    }}
                    className={`min-w-0 flex-1 text-left text-[13px] font-semibold truncate transition-colors focus:outline-none ${
                      isBlocked
                        ? "text-white/45 cursor-default"
                        : track.status === "performance"
                        ? "text-[#00FFC6] hover:text-[#00E0B0] cursor-pointer"
                        : "text-white hover:text-[#00FFC6] cursor-pointer"
                    }`}
                    title={formatTrackTitle(track.title, track.version)}
                  >
                    {formatTrackTitle(track.title, track.version)}
                  </button>

                  {track.is_explicit ? <ExplicitBadge /> : null}
                </div>
              </>
            ) : (
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
                    router.push(`/dashboard/release/${rowTrack.release_id}`);
                  }}
                  className={`min-w-0 flex-1 text-left text-[13px] font-semibold truncate transition-colors focus:outline-none ${
                    isBlocked
                      ? "text-white/45 cursor-default"
                      : track.status === "performance"
                      ? "text-[#00FFC6] hover:text-[#00E0B0] cursor-pointer"
                      : "text-white hover:text-[#00FFC6] cursor-pointer"
                  }`}
                  title={formatTrackTitle(track.title, track.version)}
                >
                  {formatTrackTitle(track.title, track.version)}
                </button>

                {track.is_explicit ? <ExplicitBadge /> : null}
              </div>
            )}
          </div>
        }
        subtitleSlot={
          Array.isArray(artists) && artists.length > 0 ? (
            <div className={`mt-1 text-left text-xs truncate ${isBlocked ? "text-white/35" : "text-white/60"}`}>
              {artists.map((a, idx) => (
                <span key={a.id}>
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
                      router.push(`/dashboard/artist/${a.id}`);
                    }}
                    className={
                      isBlocked
                        ? "transition-colors focus:outline-none cursor-default text-white/35"
                        : `
                      hover:text-[#00FFC6] hover:underline underline-offset-2
                      transition-colors
                      focus:outline-none cursor-pointer
                    `
                    }
                    title={a.display_name}
                  >
                    {a.display_name}
                  </button>
                  {idx < artists.length - 1 ? ", " : null}
                </span>
              ))}
            </div>
          ) : (
            <div className={`mt-1 text-xs truncate ${isBlocked ? "text-white/35" : "text-white/40"}`}>Unknown artist</div>
          )
        }
        metaSlot={
          <TrackRatingInline
            trackId={track.id}
            initialAvg={ratingAvg ?? null}
            initialCount={ratingCount ?? 0}
            initialStreams={streamCount ?? 0}
            initialMyStars={myStars}
            readOnly={isBlocked}
            showStreamsOnDesktopOnly={true}
          />
        }
        bpmSlot={<span>{track.bpm ?? "—"}</span>}
        keySlot={<span>{track.key ?? "—"}</span>}
        genreSlot={<span>{track.genre ?? "—"}</span>}
        actionsSlot={
          <div onClick={(e) => e.stopPropagation()}>
            <TrackOptionsTrigger
              track={rowTrack}
              releaseId={releaseId}
              showGoToRelease={false}
            />
          </div>
        }
      />
    </div>
  );
}


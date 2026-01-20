"use client";

import { useRouter } from "next/navigation";
import type { PlayerTrack } from "@/types/playerTrack";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRatingInline from "@/components/TrackRatingInline";
import TrackRowBase from "@/components/TrackRowBase";

export default function PlaylistRow({
  track,
  onDelete,
  tracks,
  user,
}: {
  track: PlayerTrack;
  tracks: PlayerTrack[];
  onDelete?: () => void;
  user: any | null;
}) {
  const router = useRouter();

  const currentIndex = tracks.findIndex((t) => t.id === track.id);

  function goToTrack(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const releaseId = (track as any)?.release_id ?? null;
    router.push(releaseId ? `/dashboard/release/${releaseId}` : `/dashboard/track/${track.id}`);
  }

  function goToArtist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    router.push(`/dashboard/artist/${track.artist_id}`);
  }

  return (
    <div className="cursor-default">
      <TrackRowBase
        track={track}
        index={Math.max(currentIndex, 0)}
        tracks={tracks}
        coverSize="md"
        className="border-b-0" // ✅ border comes from wrapper (DnD wrapper), not from TrackRowBase
        leadingSlot={
          <div className="text-white/50 text-[11px] tabular-nums px-1 py-1">
            {currentIndex + 1}
          </div>
        }
        titleSlot={
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={goToTrack}
            className="
            text-left text-[13px] font-semibold text-white truncate
            hover:text-[#00FFC6] transition-colors
            focus:outline-none
          "
            title={track.title}
          >
            {track.title}
          </button>
        }
        subtitleSlot={
          track.profiles?.display_name ? (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={goToArtist}
              className="
            mt-1 text-left text-xs text-white/60 truncate
            hover:text-[#00FFC6] hover:underline underline-offset-2
            transition-colors
            focus:outline-none
          "
              title={track.profiles.display_name}
            >
              {track.profiles.display_name}
            </button>
          ) : (
            <div className="mt-1 text-xs text-white/40 truncate">Unknown artist</div>
          )
        }
        metaSlot={
          track.release_track_id ? (
            <TrackRatingInline
              releaseTrackId={track.release_track_id}
              initialAvg={(track as any).rating_avg ?? null}
              initialCount={(track as any).rating_count ?? 0}
              initialStreams={(track as any).stream_count ?? 0}
              initialMyStars={(track as any).my_stars ?? null}
              showStreamsOnDesktopOnly={true}
            />
          ) : (
            <span className="text-xs text-white/60">★</span>
          )
        }
        bpmSlot={<span>{track.bpm ?? "—"}</span>}
        keySlot={<span>{track.key ?? "—"}</span>}
        genreSlot={null}
        actionsSlot={<TrackOptionsTrigger track={track} onRemove={onDelete} tracks={tracks} />}
      />
    </div>
  );
}

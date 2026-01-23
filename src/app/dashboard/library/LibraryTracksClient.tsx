"use client";

import React from "react";
import TrackRowBase from "@/components/TrackRowBase";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRatingInline from "@/components/TrackRatingInline";
import LibraryTrackArtists from "@/components/LibraryTrackArtists";
import type { PlayerTrack } from "@/types/playerTrack";

export default function LibraryTracksClient(props: {
  trackData: PlayerTrack[];
  releaseTrackIdByTrackId: Record<string, string>;
}) {
  const { trackData, releaseTrackIdByTrackId } = props;

  if (!trackData || trackData.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        No saved tracks yet. Use "Save to Library" on a track.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {trackData.map((track, index) => (
        <TrackRowBase
          key={`trackrow:${String(track.id)}:${index}`}
          track={track}
          index={index}
          tracks={trackData}
          coverSize="sm"
          leadingSlot={<span className="text-white/50 text-[11px] tabular-nums">{index + 1}</span>}
          subtitleSlot={
            <LibraryTrackArtists
              artists={(track as any)?.artists ?? null}
              fallbackArtistId={String((track as any)?.artist_profile?.id ?? track.artist_id ?? "") || null}
              fallbackDisplayName={String((track as any)?.artist_profile?.display_name ?? "") || null}
            />
          }
          metaSlot={
            releaseTrackIdByTrackId[String(track.id)] ? (
              <TrackRatingInline releaseTrackId={releaseTrackIdByTrackId[String(track.id)]} />
            ) : null
          }
          bpmSlot={<span>{(track as any)?.bpm ?? "—"}</span>}
          keySlot={<span>{(track as any)?.key ?? "—"}</span>}
          genreSlot={null}
          actionsSlot={<TrackOptionsTrigger track={track as any} showGoToRelease={false} />}
        />
      ))}
    </div>
  );
}

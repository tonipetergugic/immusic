"use client";

import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRatingInline from "@/components/TrackRatingInline";
import TrackRowBase from "@/components/TrackRowBase";
import type { PlayerTrack } from "@/types/playerTrack";
import HomeArtistSpotlightCard from "./HomeArtistSpotlightCard";
import AppSelect from "@/components/AppSelect";

type DevItemLike = { genre?: string | null };
type DevRowTrackLike = {
  id: string;
  title?: string | null;
  release_id?: string | null;
  cover_url?: string | null;
  artist_id?: string | null;
};

type Props = {
  devGenre: string;
  setDevGenre: (value: string) => void;

  devItems: any[];
  devLoading: boolean;
  devError: string | null;

  devQueue: PlayerTrack[];

  routerPush: (href: string) => void;
};

const KNOWN_DEV_GENRES = [
  "Trance",
  "Progressive Trance",
  "Uplifting Trance",
  "Psytrance",
  "Vocal Trance",
  "Techno",
  "Melodic Techno",
  "Peak Time Techno",
  "Minimal Techno",
  "Industrial Techno",
  "House",
  "Deep House",
  "Progressive House",
  "Tech House",
  "Afro House",
  "EDM",
  "Big Room",
  "Drum & Bass",
  "Dubstep",
  "Bass House",
  "Future Bass",
  "Trap",
  "Hardstyle",
  "Hardcore",
  "Rawstyle",
  "Uptempo",
  "Pop",
  "Hip-Hop",
  "Rap",
  "R&B",
  "Reggaeton",
  "Rock",
  "Alternative Rock",
  "Metal",
  "Pop Punk",
  "Ambient",
  "Cinematic",
  "Lo-fi",
  "Experimental",
  "Other",
] as const;

export default function DevelopmentTracksSection({
  devGenre,
  setDevGenre,
  devItems,
  devLoading,
  devError,
  devQueue,
  routerPush,
}: Props) {
  const extraGenreItems = Array.from(
    new Set(
      (devItems ?? [])
        .map((x: DevItemLike) => (x.genre ?? "").trim())
        .filter((g) => g && !KNOWN_DEV_GENRES.includes(g as (typeof KNOWN_DEV_GENRES)[number]))
    )
  )
    .sort((a, b) => a.localeCompare(b))
    .map((g) => ({
      value: g,
      label: g,
    }));

  const devGenreItems = [
    { value: "all", label: "All genres" },
    {
      label: "Trance",
      options: [
        { value: "Trance", label: "Trance" },
        { value: "Progressive Trance", label: "Progressive Trance" },
        { value: "Uplifting Trance", label: "Uplifting Trance" },
        { value: "Psytrance", label: "Psytrance" },
        { value: "Vocal Trance", label: "Vocal Trance" },
      ],
    },
    {
      label: "Techno",
      options: [
        { value: "Techno", label: "Techno" },
        { value: "Melodic Techno", label: "Melodic Techno" },
        { value: "Peak Time Techno", label: "Peak Time Techno" },
        { value: "Minimal Techno", label: "Minimal Techno" },
        { value: "Industrial Techno", label: "Industrial Techno" },
      ],
    },
    {
      label: "House / EDM",
      options: [
        { value: "House", label: "House" },
        { value: "Deep House", label: "Deep House" },
        { value: "Progressive House", label: "Progressive House" },
        { value: "Tech House", label: "Tech House" },
        { value: "Afro House", label: "Afro House" },
        { value: "EDM", label: "EDM" },
        { value: "Big Room", label: "Big Room" },
      ],
    },
    {
      label: "Bass Music",
      options: [
        { value: "Drum & Bass", label: "Drum & Bass" },
        { value: "Dubstep", label: "Dubstep" },
        { value: "Bass House", label: "Bass House" },
        { value: "Future Bass", label: "Future Bass" },
        { value: "Trap", label: "Trap" },
      ],
    },
    {
      label: "Hard Dance",
      options: [
        { value: "Hardstyle", label: "Hardstyle" },
        { value: "Hardcore", label: "Hardcore" },
        { value: "Rawstyle", label: "Rawstyle" },
        { value: "Uptempo", label: "Uptempo" },
      ],
    },
    {
      label: "Pop / Urban",
      options: [
        { value: "Pop", label: "Pop" },
        { value: "Hip-Hop", label: "Hip-Hop" },
        { value: "Rap", label: "Rap" },
        { value: "R&B", label: "R&B" },
        { value: "Reggaeton", label: "Reggaeton" },
      ],
    },
    {
      label: "Rock / Metal",
      options: [
        { value: "Rock", label: "Rock" },
        { value: "Alternative Rock", label: "Alternative Rock" },
        { value: "Metal", label: "Metal" },
        { value: "Pop Punk", label: "Pop Punk" },
      ],
    },
    {
      label: "Other",
      options: [
        { value: "Ambient", label: "Ambient" },
        { value: "Cinematic", label: "Cinematic" },
        { value: "Lo-fi", label: "Lo-fi" },
        { value: "Experimental", label: "Experimental" },
        { value: "Other", label: "Other" },
      ],
    },
    ...(extraGenreItems.length > 0
      ? [
          {
            label: "More",
            options: extraGenreItems,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Development Tracks</h2>
          <p className="text-sm text-white/50">
            All tracks currently in Development Discovery.
          </p>
        </div>

        <div className="w-full md:w-[220px]">
          <label className="sr-only">Genre</label>
          <AppSelect
            value={devGenre}
            onChange={setDevGenre}
            items={devGenreItems}
            className="[&>button]:h-10 [&>button]:rounded-full [&>button]:border-white/10 [&>button]:bg-black/25 [&>button]:px-4 [&>button]:text-sm [&>button]:text-white/80 [&>button]:focus:ring-2 [&>button]:focus:ring-[#00FFC655] [&>button_svg]:text-white/55"
          />
        </div>
      </div>

      {devLoading ? (
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
      ) : devError ? (
        <p className="text-red-400 text-sm">{devError}</p>
      ) : (devItems ?? []).length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#111112] p-6">
          <h3 className="text-sm font-semibold text-white/80">
            No development tracks yet
          </h3>
          <p className="mt-1 text-sm text-white/50">
            Tracks will appear here when they enter Development Discovery.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0">
            {devQueue.map((rowTrack: DevRowTrackLike, idx: number) => {
              const trackId = (rowTrack as any).id;
              const releaseId = (rowTrack as any).release_id ?? null;
              const artist = (rowTrack as any)?.profiles?.display_name ?? "—";
              const coverUrl = (rowTrack as any).cover_url ?? null;

              return (
                <TrackRowBase
                  key={trackId ?? `${idx}`}
                  track={rowTrack as any}
                  index={idx}
                  tracks={devQueue as any}
                  coverUrl={coverUrl}
                  coverSize="md"
                  leadingSlot={idx + 1}
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
                                  transition-colors cursor-pointer
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
                    ) : (rowTrack as any).artist_id ? (
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() =>
                          routerPush(`/dashboard/artist/${(rowTrack as any).artist_id}`)
                        }
                        className="
                          mt-1 text-left text-xs text-white/60 truncate
                          hover:text-[#00FFC6] hover:underline underline-offset-2
                          transition-colors cursor-pointer
                          focus:outline-none
                        "
                        title={artist}
                      >
                        {artist}
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
                        releaseTrackId={(rowTrack as any).release_track_id}
                        trackId={(rowTrack as any).id}
                        initialAvg={(rowTrack as any).rating_avg}
                        initialCount={(rowTrack as any).rating_count}
                        initialStreams={(rowTrack as any).stream_count}
                        initialMyStars={(rowTrack as any).my_stars}
                      />
                    ) : (
                      <span className="text-xs text-white/60">★</span>
                    )
                  }
                  bpmSlot={
                    <span className="text-white/50 text-sm">
                      {(rowTrack as any).bpm ?? "—"}
                    </span>
                  }
                  keySlot={
                    <span className="text-white/50 text-sm">
                      {(rowTrack as any).key ?? "—"}
                    </span>
                  }
                  genreSlot={
                    <span className="text-white/50 text-sm">
                      {(devItems[idx] as any)?.genre ?? "—"}
                    </span>
                  }
                  actionsSlot={
                    <TrackOptionsTrigger
                      track={rowTrack as any}
                      showGoToArtist={true}
                      showGoToRelease={true}
                      releaseId={releaseId ?? undefined}
                    />
                  }
                />
              );
            })}
          </div>

          <div className="min-w-0 xl:sticky xl:top-4">
            <HomeArtistSpotlightCard tracks={devQueue} />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import AppSelect from "@/components/AppSelect";
import type { TrackVersionOption } from "./trackMetadataOptions";

const BPM_ITEMS = Array.from({ length: 121 }, (_, index) => {
  const bpm = String(index + 60);
  return { value: bpm, label: bpm };
});

const GENRE_ITEMS = [
  {
    label: "Trance",
    options: [
      { value: "Trance", label: "Trance" },
      { value: "Progressive Trance", label: "Progressive Trance" },
      { value: "Uplifting Trance", label: "Uplifting Trance" },
      { value: "Psytrance", label: "Psytrance" },
      { value: "Vocal Trance", label: "Vocal Trance" },
      { value: "Hard Trance", label: "Hard Trance" },
      { value: "Tech Trance", label: "Tech Trance" },
    ],
  },
  {
    label: "Techno",
    options: [
      { value: "Techno", label: "Techno" },
      { value: "Melodic Techno", label: "Melodic Techno" },
      { value: "Peak Time Techno", label: "Peak Time Techno" },
      { value: "Industrial Techno", label: "Industrial Techno" },
      { value: "Hard Techno", label: "Hard Techno" },
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
      { value: "Future House", label: "Future House" },
      { value: "EDM", label: "EDM" },
      { value: "Big Room", label: "Big Room" },
      { value: "Electro House", label: "Electro House" },
      { value: "Festival EDM", label: "Festival EDM" },
    ],
  },
  {
    label: "Bass Music",
    options: [
      { value: "Drum & Bass", label: "Drum & Bass" },
      { value: "Liquid Drum & Bass", label: "Liquid Drum & Bass" },
      { value: "Neurofunk", label: "Neurofunk" },
      { value: "Dubstep", label: "Dubstep" },
      { value: "Melodic Dubstep", label: "Melodic Dubstep" },
      { value: "Future Bass", label: "Future Bass" },
    ],
  },
  {
    label: "Hard Dance",
    options: [
      { value: "Hardstyle", label: "Hardstyle" },
      { value: "Rawstyle", label: "Rawstyle" },
      { value: "Hardcore", label: "Hardcore" },
      { value: "Uptempo Hardcore", label: "Uptempo Hardcore" },
    ],
  },
  {
    label: "Pop / Urban",
    options: [
      { value: "Pop", label: "Pop" },
      { value: "Dance Pop", label: "Dance Pop" },
      { value: "Indie Pop", label: "Indie Pop" },
      { value: "Hip-Hop", label: "Hip-Hop" },
      { value: "Trap", label: "Trap" },
      { value: "Drill", label: "Drill" },
      { value: "R&B", label: "R&B" },
      { value: "Soul", label: "Soul" },
    ],
  },
  {
    label: "Rock / Metal",
    options: [
      { value: "Rock", label: "Rock" },
      { value: "Alternative Rock", label: "Alternative Rock" },
      { value: "Indie Rock", label: "Indie Rock" },
      { value: "Metal", label: "Metal" },
    ],
  },
  {
    label: "Other",
    options: [
      { value: "Ambient", label: "Ambient" },
      { value: "Cinematic", label: "Cinematic" },
      { value: "LoFi", label: "LoFi" },
      { value: "Other", label: "Other" },
    ],
  },
];

type TrackMetadataSectionProps = {
  newTitle: string;
  onTitleChange: (value: string) => void;
  newBpm: string;
  onBpmChange: (value: string) => void;
  newKey: string;
  onKeyChange: (value: string) => void;
  allowedKeys: Set<string>;
  newVersion: string;
  onVersionChange: (value: string) => void;
  trackVersionOptions: readonly TrackVersionOption[];
  newGenre: string;
  onGenreChange: (value: string) => void;
  newHasLyrics: boolean;
  isLocked: boolean;
  onHasLyricsChange: (value: boolean) => void;
  newIsExplicit: boolean;
  onIsExplicitChange: (value: boolean) => void;
  newLyrics: string;
  onLyricsChange: (value: string) => void;
  onOpenLyricsModal: () => void;
};

export default function TrackMetadataSection({
  newTitle,
  onTitleChange,
  newBpm,
  onBpmChange,
  newKey,
  onKeyChange,
  allowedKeys,
  newVersion,
  onVersionChange,
  trackVersionOptions,
  newGenre,
  onGenreChange,
  newHasLyrics,
  isLocked,
  onHasLyricsChange,
  newIsExplicit,
  onIsExplicitChange,
  newLyrics,
  onLyricsChange,
  onOpenLyricsModal,
}: TrackMetadataSectionProps) {
  const keyItems = Array.from(allowedKeys).map((key) => ({
    value: key,
    label: key,
  }));

  const versionItems = trackVersionOptions.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  return (
    <section className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
      <div>
        <div className="text-[1.125rem] font-semibold uppercase tracking-[0.12em] text-[#00FFC6]">
          Track metadata
        </div>
        <div className="mt-1 text-sm text-white/45">
          Core information used for releases and discovery.
        </div>
      </div>

      <div className="mt-7 space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.12em] text-white/60">
            Title
          </label>
          <input
            type="text"
            className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition cursor-pointer focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20 disabled:cursor-not-allowed disabled:opacity-50"
            value={newTitle}
            disabled={isLocked}
            onChange={(e) => onTitleChange(e.target.value)}
            maxLength={100}
            placeholder="Track title"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              BPM
            </label>

            <AppSelect
              value={newBpm}
              onChange={onBpmChange}
              items={BPM_ITEMS}
              disabled={isLocked}
              placeholder="Typical range: 60–180"
            />

            {newBpm !== "" &&
              (() => {
                const n = Number.parseInt(newBpm, 10);
                if (Number.isNaN(n)) return null;
                if (n < 60 || n > 180) {
                  return (
                    <div className="text-xs text-white/50">
                      Unusual BPM (typical range is 60–180).
                    </div>
                  );
                }
                return null;
              })()}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              Key
            </label>

            <AppSelect
              value={newKey}
              onChange={onKeyChange}
              items={keyItems}
              disabled={isLocked}
              placeholder="Select key"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              Version
            </label>

            <AppSelect
              value={newVersion}
              onChange={onVersionChange}
              items={versionItems}
              disabled={isLocked}
              placeholder="None"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              Genre
            </label>

            <AppSelect
              value={newGenre}
              onChange={onGenreChange}
              items={GENRE_ITEMS}
              disabled={isLocked}
              placeholder="Select genre"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              Contains lyrics
            </label>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
              <div className="flex min-h-[52px] items-center justify-between gap-4">
                <div className="min-w-0 text-base text-white">
                  Enable lyrics for this track.
                </div>

                <input
                  type="checkbox"
                  checked={newHasLyrics}
                  disabled={isLocked}
                  onChange={(e) => onHasLyricsChange(e.target.checked)}
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#00FFC6] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              Explicit content
            </label>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
              <div className="flex min-h-[52px] items-center justify-between gap-4">
                <div className="min-w-0 text-base text-white">
                  Enable if the track is explicit.
                </div>

                <input
                  type="checkbox"
                  checked={newIsExplicit}
                  disabled={isLocked || !newHasLyrics}
                  onChange={(e) => onIsExplicitChange(e.target.checked)}
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#00FFC6] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.12em] text-white/60">
            Lyrics
          </label>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            {newHasLyrics ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
                  <div className="text-sm text-white/55">
                    Song text for releases and discovery.
                  </div>

                  <button
                    type="button"
                    className="cursor-pointer text-sm font-semibold text-[#00FFC6] transition hover:text-[#00FFC6]/80 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLocked}
                    onClick={onOpenLyricsModal}
                  >
                    {newLyrics.trim() ? "Expand editor" : "+ Add lyrics"}
                  </button>
                </div>

                <textarea
                  value={newLyrics}
                  disabled={isLocked}
                  onChange={(e) => onLyricsChange(e.target.value)}
                  placeholder="Paste or write your lyrics here..."
                  className="min-h-[240px] w-full resize-none bg-transparent px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </>
            ) : (
              <div className="flex min-h-[292px] items-center justify-center px-6 text-center text-sm text-white/35">
                {'Enable "Contains lyrics" to add song text.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

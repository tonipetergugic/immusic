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
    <section className="min-w-0 border-b border-white/10 pb-12">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#B3B3B3]">
          Metadata
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Track metadata
        </div>
        <div className="mt-3 text-[15px] leading-7 text-[#B3B3B3]">
          Core information used for releases and discovery.
        </div>
      </div>

      <div className="mt-10 space-y-8">
        <div className="flex flex-col gap-3">
          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
            Title
          </label>
          <input
            type="text"
            className="w-full border-0 border-b border-white/12 bg-transparent px-0 pb-4 pt-1 text-[30px] leading-tight text-white outline-none transition focus:border-[#00FFC6] disabled:cursor-not-allowed disabled:opacity-50"
            value={newTitle}
            disabled={isLocked}
            onChange={(e) => onTitleChange(e.target.value)}
            maxLength={100}
            placeholder="Track title"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
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
                    <div className="text-xs text-white/45">
                      Unusual BPM (typical range is 60–180).
                    </div>
                  );
                }
                return null;
              })()}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
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
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
              Contains lyrics
            </label>

            <div className="flex min-h-[56px] items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base text-white">Enable lyrics for this track.</div>
                <div className="mt-1 text-sm text-[#B3B3B3]">
                  Add song text for releases and discovery.
                </div>
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

          <div className="flex flex-col gap-3 border-b border-white/10 pb-5">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
              Explicit content
            </label>

            <div className="flex min-h-[56px] items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base text-white">Enable if the track is explicit.</div>
                <div className="mt-1 text-sm text-[#B3B3B3]">
                  Only available when lyrics are enabled.
                </div>
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

        <div className="flex flex-col gap-3">
          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
            Lyrics
          </label>

          <div className="pb-4">
            <div className="flex min-h-[36px] items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="text-sm text-[#B3B3B3]">
                Song text for releases and discovery.
              </div>

              {newHasLyrics ? (
                <button
                  type="button"
                  className="inline-flex w-[120px] justify-end cursor-pointer text-sm font-semibold text-[#00FFC6] transition hover:text-[#00FFC6]/80 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLocked}
                  onClick={onOpenLyricsModal}
                >
                  {newLyrics.trim() ? "Expand editor" : "+ Add lyrics"}
                </button>
              ) : (
                <div className="w-[120px] shrink-0" />
              )}
            </div>

            {newHasLyrics ? (
              <textarea
                value={newLyrics}
                disabled={isLocked}
                onChange={(e) => onLyricsChange(e.target.value)}
                placeholder="Paste or write your lyrics here..."
                className="min-h-[240px] w-full resize-none border-0 bg-transparent px-0 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/30 disabled:cursor-not-allowed disabled:opacity-50"
              />
            ) : (
              <div className="pt-4 text-sm text-white/35">
                Enable "Contains lyrics" to add song text.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import type { TrackVersionOption } from "./trackMetadataOptions";

type TrackMetadataSectionProps = {
  newTitle: string;
  onTitleChange: (value: string) => void;
  newBpm: string;
  onBpmChange: (value: string) => void;
  onBpmBlur: () => void;
  newKey: string;
  onKeyChange: (value: string) => void;
  allowedKeys: Set<string>;
  newVersion: string;
  onVersionChange: (value: string) => void;
  trackVersionOptions: readonly TrackVersionOption[];
  newGenre: string;
  onGenreChange: (value: string) => void;
  newHasLyrics: boolean;
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
  onBpmBlur,
  newKey,
  onKeyChange,
  allowedKeys,
  newVersion,
  onVersionChange,
  trackVersionOptions,
  newGenre,
  onGenreChange,
  newHasLyrics,
  onHasLyricsChange,
  newIsExplicit,
  onIsExplicitChange,
  newLyrics,
  onLyricsChange,
  onOpenLyricsModal,
}: TrackMetadataSectionProps) {
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
            className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition cursor-pointer focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
            value={newTitle}
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
            <input
              inputMode="numeric"
              type="text"
              className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={newBpm}
              list="bpm-suggestions"
              maxLength={3}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                if (raw.length <= 3) {
                  onBpmChange(raw);
                }
              }}
              onBlur={onBpmBlur}
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
            <input
              type="text"
              className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition cursor-pointer focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
              value={newKey}
              list="key-suggestions"
              maxLength={3}
              onChange={(e) => {
                const v = e.target.value.replace(/\s+/g, "");
                if (v === "" || allowedKeys.has(v)) {
                  onKeyChange(v);
                }
              }}
              placeholder="e.g. Dm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              Version
            </label>
            <select
              className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition cursor-pointer focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
              value={newVersion}
              onChange={(e) => onVersionChange(e.target.value)}
            >
              <option value="" className="text-white/60">
                None
              </option>

              {trackVersionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              Genre
            </label>
            <select
              className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition cursor-pointer focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
              value={newGenre}
              onChange={(e) => onGenreChange(e.target.value)}
            >
              <option value="">Select genre</option>

              <optgroup label="Trance">
                <option value="Trance">Trance</option>
                <option value="Progressive Trance">Progressive Trance</option>
                <option value="Uplifting Trance">Uplifting Trance</option>
                <option value="Psytrance">Psytrance</option>
                <option value="Vocal Trance">Vocal Trance</option>
                <option value="Hard Trance">Hard Trance</option>
                <option value="Tech Trance">Tech Trance</option>
              </optgroup>

              <optgroup label="Techno">
                <option value="Techno">Techno</option>
                <option value="Melodic Techno">Melodic Techno</option>
                <option value="Peak Time Techno">Peak Time Techno</option>
                <option value="Industrial Techno">Industrial Techno</option>
                <option value="Hard Techno">Hard Techno</option>
              </optgroup>

              <optgroup label="House / EDM">
                <option value="House">House</option>
                <option value="Deep House">Deep House</option>
                <option value="Progressive House">Progressive House</option>
                <option value="Tech House">Tech House</option>
                <option value="Afro House">Afro House</option>
                <option value="Future House">Future House</option>
                <option value="EDM">EDM</option>
                <option value="Big Room">Big Room</option>
                <option value="Electro House">Electro House</option>
                <option value="Festival EDM">Festival EDM</option>
              </optgroup>

              <optgroup label="Bass Music">
                <option value="Drum & Bass">Drum & Bass</option>
                <option value="Liquid Drum & Bass">Liquid Drum & Bass</option>
                <option value="Neurofunk">Neurofunk</option>
                <option value="Dubstep">Dubstep</option>
                <option value="Melodic Dubstep">Melodic Dubstep</option>
                <option value="Future Bass">Future Bass</option>
              </optgroup>

              <optgroup label="Hard Dance">
                <option value="Hardstyle">Hardstyle</option>
                <option value="Rawstyle">Rawstyle</option>
                <option value="Hardcore">Hardcore</option>
                <option value="Uptempo Hardcore">Uptempo Hardcore</option>
              </optgroup>

              <optgroup label="Pop / Urban">
                <option value="Pop">Pop</option>
                <option value="Dance Pop">Dance Pop</option>
                <option value="Indie Pop">Indie Pop</option>
                <option value="Hip-Hop">Hip-Hop</option>
                <option value="Trap">Trap</option>
                <option value="Drill">Drill</option>
                <option value="R&B">R&B</option>
                <option value="Soul">Soul</option>
              </optgroup>

              <optgroup label="Rock / Metal">
                <option value="Rock">Rock</option>
                <option value="Alternative Rock">Alternative Rock</option>
                <option value="Indie Rock">Indie Rock</option>
                <option value="Metal">Metal</option>
              </optgroup>

              <optgroup label="Other">
                <option value="Ambient">Ambient</option>
                <option value="Cinematic">Cinematic</option>
                <option value="LoFi">LoFi</option>
                <option value="Other">Other</option>
              </optgroup>
            </select>
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
                  onChange={(e) => onHasLyricsChange(e.target.checked)}
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#00FFC6]"
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
                  onChange={(e) => onIsExplicitChange(e.target.checked)}
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#00FFC6]"
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
                    className="cursor-pointer text-sm font-semibold text-[#00FFC6] transition hover:text-[#00FFC6]/80"
                    onClick={onOpenLyricsModal}
                  >
                    {newLyrics.trim() ? "Expand editor" : "+ Add lyrics"}
                  </button>
                </div>

                <textarea
                  value={newLyrics}
                  onChange={(e) => onLyricsChange(e.target.value)}
                  placeholder="Paste or write your lyrics here..."
                  className="min-h-[240px] w-full resize-none bg-transparent px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/30"
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

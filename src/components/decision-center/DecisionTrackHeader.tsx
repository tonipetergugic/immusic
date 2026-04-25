import type { ArtistDecisionPayload } from "@/components/decision-center/types";

function formatDuration(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return "Duration unknown";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function formatBpm(bpm?: number): string | null {
  if (typeof bpm !== "number" || !Number.isFinite(bpm)) {
    return null;
  }

  return `${Math.round(bpm)} BPM`;
}

export function DecisionTrackHeader({
  payload,
}: {
  payload: ArtistDecisionPayload;
}) {
  const track = payload.track;
  const metadata = [
    track?.artist_name,
    track?.main_genre,
    track?.subgenre,
    formatBpm(track?.bpm),
    track?.key,
  ].filter((value): value is string => Boolean(value));

  return (
    <header className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
          Local Lab
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Track Decision Center
        </h1>
        <p className="mt-4 max-w-2xl text-base text-zinc-400">
          Local test surface for the new artist-facing release decision flow.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Selected track
        </p>
        <h2 className="mt-3 line-clamp-2 text-lg font-semibold text-white">
          {track?.title || "Untitled track"}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {formatDuration(track?.duration_sec)}
        </p>
        {metadata.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {metadata.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export type WaveformSegment = {
  index?: number;
  start_sec: number;
  end_sec: number;
};

type WaveformSegmentTimelineProps = {
  segments: WaveformSegment[];
};

function formatSecondsToTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

export function WaveformSegmentTimeline({
  segments,
}: WaveformSegmentTimelineProps) {
  const validSegments = segments.filter(
    (segment) =>
      Number.isFinite(segment.start_sec) &&
      Number.isFinite(segment.end_sec) &&
      segment.end_sec > segment.start_sec,
  );

  if (validSegments.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-5">
        <p className="text-sm text-zinc-400">
          No structure segments available for this track.
        </p>
      </section>
    );
  }

  const durationSec = Math.max(
    ...validSegments.map((segment) => segment.end_sec),
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
          Structure timeline
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">
          Track sections
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          A simple overview of how the track moves through its main parts.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <div className="flex h-10 w-full">
          {validSegments.map((segment, segmentIndex) => {
            const widthPercent =
              ((segment.end_sec - segment.start_sec) / durationSec) * 100;

            return (
              <div
                key={`${segment.start_sec}-${segment.end_sec}-${segmentIndex}`}
                className="border-r border-white/10 bg-white/[0.06] last:border-r-0"
                style={{ width: `${widthPercent}%` }}
                title={`Part ${segmentIndex + 1}: ${formatSecondsToTime(
                  segment.start_sec,
                )}–${formatSecondsToTime(segment.end_sec)}`}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {validSegments.map((segment, segmentIndex) => (
          <div
            key={`${segment.start_sec}-${segment.end_sec}-${segmentIndex}-label`}
            className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2"
          >
            <p className="text-sm font-medium text-white">
              Part {segmentIndex + 1}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {formatSecondsToTime(segment.start_sec)}–
              {formatSecondsToTime(segment.end_sec)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

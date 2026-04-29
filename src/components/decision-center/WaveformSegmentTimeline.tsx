export type WaveformSegment = {
  index?: number;
  start_sec: number;
  end_sec: number;
  start_bar?: number;
  end_bar?: number;
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

function getSegmentBarCount(segment: WaveformSegment) {
  if (
    typeof segment.start_bar !== "number" ||
    typeof segment.end_bar !== "number" ||
    !Number.isFinite(segment.start_bar) ||
    !Number.isFinite(segment.end_bar) ||
    segment.end_bar < segment.start_bar
  ) {
    return null;
  }

  return segment.end_bar - segment.start_bar + 1;
}

function formatSegmentBars(segment: WaveformSegment) {
  const barCount = getSegmentBarCount(segment);

  if (
    typeof segment.start_bar !== "number" ||
    typeof segment.end_bar !== "number" ||
    !Number.isFinite(segment.start_bar) ||
    !Number.isFinite(segment.end_bar)
  ) {
    return null;
  }

  return `Bars ${segment.start_bar}–${segment.end_bar}${
    barCount === null ? "" : ` · ${barCount} bars`
  }`;
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
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#00FFC6]/80">
            Structure timeline
          </p>

          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-white">
            Main track sections
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            A compact view of how the arrangement is divided across the full
            track.
          </p>
        </div>

        <div className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-zinc-500">
          {validSegments.length} parts
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <div className="flex h-12 w-full">
          {validSegments.map((segment, segmentIndex) => {
            const widthPercent =
              ((segment.end_sec - segment.start_sec) / durationSec) * 100;

            return (
              <div
                key={`${segment.start_sec}-${segment.end_sec}-${segmentIndex}`}
                className="border-r border-black/40 bg-[#00FFC6]/[0.09] last:border-r-0"
                style={{ width: `${widthPercent}%` }}
                title={`Part ${segmentIndex + 1}: ${formatSecondsToTime(
                  segment.start_sec,
                )}–${formatSecondsToTime(segment.end_sec)}${
                  formatSegmentBars(segment)
                    ? ` · ${formatSegmentBars(segment)}`
                    : ""
                }`}
              >
                <div className="h-full w-full bg-gradient-to-b from-[#00FFC6]/18 to-transparent" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {validSegments.map((segment, segmentIndex) => (
          <div
            key={`${segment.start_sec}-${segment.end_sec}-${segmentIndex}-label`}
            className="rounded-2xl border border-white/8 bg-black/15 px-3 py-2"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Part {segmentIndex + 1}
            </p>

            <p className="mt-1 text-sm font-medium text-white">
              {formatSecondsToTime(segment.start_sec)}–
              {formatSecondsToTime(segment.end_sec)}
            </p>

            {formatSegmentBars(segment) ? (
              <p className="mt-1 text-xs text-zinc-500">
                {formatSegmentBars(segment)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

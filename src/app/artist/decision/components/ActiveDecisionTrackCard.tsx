import Link from "next/link";

type ActiveDecisionTrackLink = {
  id: string;
};

type ActiveDecisionTrackCardProps = {
  selectedTrackTitle: string;
  selectedTrackIndex: number;
  trackCount: number;
  selectedTrackStatus: string | null | undefined;
  selectedTrackGenre: string | null | undefined;
  selectedTrackQueueId: string | null | undefined;
  previousTrack: ActiveDecisionTrackLink | null;
  nextTrack: ActiveDecisionTrackLink | null;
};

export function ActiveDecisionTrackCard({
  selectedTrackTitle,
  selectedTrackIndex,
  trackCount,
  selectedTrackStatus,
  selectedTrackGenre,
  selectedTrackQueueId,
  previousTrack,
  nextTrack,
}: ActiveDecisionTrackCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Active track
          </div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-white">
            {selectedTrackTitle}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55">
            <span className="rounded-full border border-white/10 px-3 py-1">
              {selectedTrackIndex + 1} of {trackCount}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              Status: {selectedTrackStatus ?? "unknown"}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              Genre: {selectedTrackGenre ?? "No genre"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {previousTrack ? (
            <Link
              href={`/artist/decision?track=${encodeURIComponent(previousTrack.id)}`}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              Previous track
            </Link>
          ) : null}

          {selectedTrackQueueId ? (
            <Link
              href={`/artist/upload/feedback?queue_id=${encodeURIComponent(selectedTrackQueueId)}`}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              Open detailed feedback
            </Link>
          ) : null}

          {nextTrack ? (
            <Link
              href={`/artist/decision?track=${encodeURIComponent(nextTrack.id)}`}
              className="inline-flex items-center rounded-full border border-[#00FFC6]/30 bg-[#00FFC6]/10 px-4 py-2 text-sm font-medium text-[#B8FFF0] transition hover:border-[#00FFC6]/50 hover:bg-[#00FFC6]/15"
            >
              Next track
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

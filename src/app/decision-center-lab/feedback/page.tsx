import Link from "next/link";
import { TrackWaveformPanel } from "@/components/decision-center/TrackWaveformPanel";
import {
  WaveformSegmentTimeline,
  type WaveformSegment,
} from "@/components/decision-center/WaveformSegmentTimeline";
import { StructureMovementPanel } from "@/components/decision-center/StructureMovementPanel";
import { AiConsultantPanel } from "@/components/decision-center/AiConsultantPanel";
import { TrackAnalysisContextPanel } from "@/components/decision-center/TrackAnalysisContextPanel";
import { CriticalWarningsPanel } from "@/components/decision-center/CriticalWarningsPanel";
import { TechnicalReleaseChecksPanel } from "@/components/decision-center/TechnicalReleaseChecksPanel";
import { ScrollUnlock } from "../ScrollUnlock";
import { readLocalFeedbackPageData } from "./readLocalFeedbackPageData";

type DecisionCenterLabFeedbackPageProps = {
  searchParams: Promise<{
    track?: string;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getStructureSegments(analysis: unknown): WaveformSegment[] {
  const analysisRecord = asRecord(analysis);
  const structureRecord = asRecord(analysisRecord?.structure);
  const rawSegments = structureRecord?.segments;

  if (!Array.isArray(rawSegments)) {
    return [];
  }

  const parsedSegments: WaveformSegment[] = [];

  for (const rawSegment of rawSegments) {
      const segmentRecord = asRecord(rawSegment);

      if (!segmentRecord) {
        continue;
      }

      const startSec = Number(segmentRecord.start_sec);
      const endSec = Number(segmentRecord.end_sec);
      const rawIndex = segmentRecord.index;
      const index = rawIndex === undefined ? undefined : Number(rawIndex);

      if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
        continue;
      }

      parsedSegments.push({
        index: Number.isFinite(index) ? index : undefined,
        start_sec: startSec,
        end_sec: endSec,
      });
  }

  return parsedSegments;
}

export default async function DecisionCenterLabFeedbackPage({
  searchParams,
}: DecisionCenterLabFeedbackPageProps) {
  const params = await searchParams;
  const data = await readLocalFeedbackPageData(params.track);
  const selectedTrack = data.selectedTrack;
  const selectedSegments = selectedTrack
    ? getStructureSegments(selectedTrack.analysis)
    : [];

  return (
    <>
      <ScrollUnlock />
      <main className="min-h-screen bg-[#05070b] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <Link
            href="/decision-center-lab"
            className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
          >
            ← Back to Decision Center
          </Link>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
              AI Consultant & Detailed Feedback
            </p>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Detailed track analysis
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Deeper track feedback, waveform timeline, structure explanation,
              technical details, and AI consultant output will be built here
              step by step.
            </p>
          </div>
        </header>

        {data.items.length > 0 ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
              Local test tracks
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {data.items.map((item) => {
                const isSelected =
                  selectedTrack?.folderName === item.folderName;

                return (
                  <Link
                    key={item.folderName}
                    href={`/decision-center-lab/feedback?track=${encodeURIComponent(
                      item.folderName,
                    )}`}
                    className={[
                      "rounded-full border px-3 py-1.5 text-sm transition",
                      isSelected
                        ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {selectedTrack ? (
          <>
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                Selected track
              </p>

              <h2 className="mt-3 text-xl font-semibold text-white">
                {selectedTrack.payload.track?.title || selectedTrack.folderName}
              </h2>

              {selectedTrack.payload.track?.artist_name ? (
                <p className="mt-1 text-sm text-zinc-400">
                  {selectedTrack.payload.track.artist_name}
                </p>
              ) : null}
            </section>

            <TrackAnalysisContextPanel payload={selectedTrack.payload} />

            {selectedTrack.waveformAvailable ? (
              <>
                <AiConsultantPanel payload={selectedTrack.payload} />

                <CriticalWarningsPanel
                  warnings={selectedTrack.payload.critical_warnings ?? []}
                />

                <TechnicalReleaseChecksPanel
                  checks={selectedTrack.payload.technical_release_checks ?? []}
                />

                <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                        Meters & Technical Modules
                      </p>

                      <h2 className="mt-3 text-xl font-semibold text-white">
                        Look at your meters
                      </h2>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                        Open detailed loudness, stereo, phase, limiter,
                        transient and tonal balance modules.
                      </p>
                    </div>

                    <Link
                      href={`/decision-center-lab/feedback/meters?track=${encodeURIComponent(
                        selectedTrack.folderName,
                      )}`}
                      className="inline-flex w-fit items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-300/15"
                    >
                      Open meters
                    </Link>
                  </div>
                </section>

                <TrackWaveformPanel
                  trackFolderName={selectedTrack.folderName}
                  trackTitle={
                    selectedTrack.payload.track?.title || selectedTrack.folderName
                  }
                />

                <WaveformSegmentTimeline segments={selectedSegments} />

                <StructureMovementPanel analysis={selectedTrack.analysis} />
              </>
            ) : (
              <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-5">
                <p className="text-sm text-zinc-400">
                  No waveform.png found for this local analysis output.
                </p>
              </section>
            )}
          </>
        ) : (
          <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-zinc-400">
              No local analysis output with artist_decision_payload.json was
              found in analysis_engine/output.
            </p>
          </section>
        )}
        </div>
      </main>
    </>
  );
}

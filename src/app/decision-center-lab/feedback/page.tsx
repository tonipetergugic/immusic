import Link from "next/link";
import { TrackWaveformPanel } from "@/components/decision-center/TrackWaveformPanel";
import {
  WaveformSegmentTimeline,
  type WaveformSegment,
} from "@/components/decision-center/WaveformSegmentTimeline";
import { StructureMovementPanel } from "@/components/decision-center/StructureMovementPanel";
import { ConsultantSummaryPanel } from "@/components/decision-center/ConsultantSummaryPanel";
import { FeedbackInsightCards } from "@/components/decision-center/FeedbackInsightCards";
import { TrackAnalysisContextPanel } from "@/components/decision-center/TrackAnalysisContextPanel";
import { TechnicalReleaseChecksPanel } from "@/components/decision-center/TechnicalReleaseChecksPanel";
import { ScrollUnlock } from "../ScrollUnlock";
import { LabTrackSelector } from "../components/LabTrackSelector";
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
      <main className="relative min-h-screen overflow-hidden bg-[#05070b] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
        <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 md:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-80"
            style={{
              background:
                "linear-gradient(135deg, rgba(0, 255, 198, 0.12), transparent 34%), radial-gradient(circle at 82% 18%, rgba(0, 255, 198, 0.10), transparent 28%)",
            }}
          />

          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <Link
                href="/decision-center-lab"
                className="text-sm font-medium text-[#00FFC6] transition hover:text-white"
              >
                ← Back to Decision Center
              </Link>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-[#00FFC6]/80">
                AI Consultant & Detailed Feedback
              </p>

              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl lg:text-6xl">
                AI Consultant & Detailed Analysis
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
                A calm, guided feedback view to understand what works, what may need
                attention, and how the track moves from start to finish.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#consultant-summary"
                  className="inline-flex items-center justify-center rounded-full bg-[#00FFC6] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white"
                >
                  Unlock full insights
                </a>

                {selectedTrack ? (
                  <Link
                    href={`/decision-center-lab/feedback/meters?track=${encodeURIComponent(
                      selectedTrack.folderName,
                    )}`}
                    className="inline-flex items-center justify-center rounded-full border border-[#00FFC6]/35 bg-[#00FFC6]/10 px-5 py-2.5 text-sm font-medium text-[#00FFC6] transition hover:border-[#00FFC6]/70 hover:bg-[#00FFC6]/15"
                  >
                    Open meters
                  </Link>
                ) : null}
              </div>
            </div>

            {selectedTrack ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-black/30 p-4 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                    {selectedTrack.payload.track?.artwork_url ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${selectedTrack.payload.track.artwork_url})`,
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#00FFC6]">
                        AI
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Current track
                    </p>

                    <h2 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-white">
                      {selectedTrack.payload.track?.title || selectedTrack.folderName}
                    </h2>

                    {selectedTrack.payload.track?.artist_name ? (
                      <p className="mt-1 truncate text-sm text-zinc-400">
                        {selectedTrack.payload.track.artist_name}
                      </p>
                    ) : null}
                  </div>
                </div>

                {selectedTrack.waveformAvailable ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#00FFC6]/20 bg-black/40">
                    <img
                      src={`/decision-center-lab/assets?track=${encodeURIComponent(
                        selectedTrack.folderName,
                      )}&file=waveform.png`}
                      alt={`Waveform preview for ${
                        selectedTrack.payload.track?.title || selectedTrack.folderName
                      }`}
                      className="h-28 w-full object-cover opacity-90"
                    />
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-zinc-500">
                      Waveform preview is not available for this local output.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </header>

        {selectedTrack ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-6">
            <TrackAnalysisContextPanel payload={selectedTrack.payload} />

            <ConsultantSummaryPanel payload={selectedTrack.payload} />

            <FeedbackInsightCards
              keyStrengths={selectedTrack.payload.key_strengths ?? []}
              thingsToCheck={selectedTrack.payload.things_to_check ?? []}
              criticalWarnings={selectedTrack.payload.critical_warnings ?? []}
              optionalFeedback={selectedTrack.payload.optional_feedback}
            />

            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00FFC6]/80">
                Technical Release Checks
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Compact release-safety checks before the deeper technical meter view.
              </p>
            </section>

            <TechnicalReleaseChecksPanel
              checks={selectedTrack.payload.technical_release_checks ?? []}
            />

            {selectedTrack.waveformAvailable ? (
              <>
                <TrackWaveformPanel
                  trackFolderName={selectedTrack.folderName}
                  trackTitle={
                    selectedTrack.payload.track?.title || selectedTrack.folderName
                  }
                />

                <WaveformSegmentTimeline segments={selectedSegments} />
              </>
            ) : (
              <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-5">
                <p className="text-sm text-zinc-400">
                  No waveform.png found for this local analysis output.
                </p>
              </section>
            )}

            <StructureMovementPanel analysis={selectedTrack.analysis} />
            </div>

            <aside className="lg:sticky lg:top-8 lg:self-start">
              <LabTrackSelector
                items={data.items}
                selectedFolderName={selectedTrack.folderName}
                pathname="/decision-center-lab/feedback"
              />
            </aside>
          </div>
        ) : (
          <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-zinc-400">
              No local analysis output with artist_decision_payload.json was found in
              analysis_engine/output.
            </p>
          </section>
        )}
        </div>
      </main>
    </>
  );
}

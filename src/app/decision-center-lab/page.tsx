import { notFound } from "next/navigation";
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { ScrollUnlock } from "./ScrollUnlock";
import { CriticalWarningsPanel } from "@/components/decision-center/CriticalWarningsPanel";
import { DecisionTrackHeader } from "@/components/decision-center/DecisionTrackHeader";
import { ExtendedFeedbackPreview } from "@/components/decision-center/ExtendedFeedbackPreview";
import { NextStepPanel } from "@/components/decision-center/NextStepPanel";
import { ReleaseReadinessPanel } from "@/components/decision-center/ReleaseReadinessPanel";
import { TechnicalReleaseChecksPanel } from "@/components/decision-center/TechnicalReleaseChecksPanel";
import { EngineSummaryPanel } from "./components/EngineSummaryPanel";
import { LabTrackSelector } from "./components/LabTrackSelector";
import { IssueDebugScoreContextPanel } from "./components/IssueDebugScoreContextPanel";
import { PayloadWarningsPanel } from "./components/PayloadWarningsPanel";
import { StructureMetricsPanel } from "./components/StructureMetricsPanel";
import { TechnicalMetricsRawPanel } from "./components/TechnicalMetricsRawPanel";
import { BoundarySectionDebugPanel } from "./components/BoundarySectionDebugPanel";
import type {
  AnalysisPayload,
  ArtistDecisionPayload,
} from "@/components/decision-center/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    track?: string;
  }>;
};

type LabItem = {
  folderName: string;
  payloadPath: string;
  payload: ArtistDecisionPayload;
  analysis: AnalysisPayload | null;
};

async function loadLabItems(): Promise<LabItem[]> {
  const outputRoot = path.join(process.cwd(), "analysis_engine", "output");

  let entries;
  try {
    entries = await readdir(outputRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const payloadPath = path.join(
          outputRoot,
          entry.name,
          "artist_decision_payload.json",
        );
        const analysisPath = path.join(outputRoot, entry.name, "analysis.json");

        try {
          const raw = await readFile(payloadPath, "utf-8");
          const payload = JSON.parse(raw) as ArtistDecisionPayload;
          let analysis: AnalysisPayload | null = null;

          try {
            const analysisRaw = await readFile(analysisPath, "utf-8");
            analysis = JSON.parse(analysisRaw) as AnalysisPayload;
          } catch {
            analysis = null;
          }

          return {
            folderName: entry.name,
            payloadPath,
            payload,
            analysis,
          };
        } catch {
          return null;
        }
      }),
  );

  return items
    .filter((item): item is LabItem => Boolean(item))
    .sort((a, b) => a.folderName.localeCompare(b.folderName));
}

function EmptyLabState() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
        No local payloads found
      </p>
      <h2 className="mt-4 text-2xl font-semibold text-white">
        Run the analysis engine first.
      </h2>
      <p className="mt-3 text-sm text-zinc-400">
        Expected files: analysis_engine/output/&lt;track&gt;/artist_decision_payload.json
      </p>
    </section>
  );
}

export default async function DecisionCenterLabPage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const items = await loadLabItems();

  const selectedItem =
    items.find((item) => item.folderName === resolvedSearchParams.track) ||
    items[0] ||
    null;

  return (
    <>
      <ScrollUnlock />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(22,78,99,0.16),transparent_26%),linear-gradient(180deg,#09090b_0%,#0b0b0f_100%)] px-4 py-8 text-white md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          {selectedItem ? (
            <>
              <DecisionTrackHeader payload={selectedItem.payload} />

              <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="flex flex-col gap-6">
                  <ReleaseReadinessPanel payload={selectedItem.payload} />

                  <CriticalWarningsPanel
                    warnings={selectedItem.payload.critical_warnings || []}
                  />

                  <TechnicalReleaseChecksPanel
                    checks={selectedItem.payload.technical_release_checks || []}
                  />

                  <NextStepPanel nextStep={selectedItem.payload.next_step} />

                  <ExtendedFeedbackPreview
                    optionalFeedback={selectedItem.payload.optional_feedback}
                    keyStrengths={selectedItem.payload.key_strengths || []}
                    thingsToCheck={selectedItem.payload.things_to_check || []}
                  />

                  <PayloadWarningsPanel
                    warnings={selectedItem.payload.meta?.warnings || []}
                  />

                  <EngineSummaryPanel analysis={selectedItem.analysis} />

                  <StructureMetricsPanel analysis={selectedItem.analysis} />

                  <BoundarySectionDebugPanel analysis={selectedItem.analysis} />

                  <TechnicalMetricsRawPanel analysis={selectedItem.analysis} />

                  <IssueDebugScoreContextPanel analysis={selectedItem.analysis} />
                </div>

                <aside className="lg:sticky lg:top-8 lg:self-start">
                  <LabTrackSelector
                    items={items}
                    selectedFolderName={selectedItem.folderName}
                  />
                </aside>
              </div>
            </>
          ) : (
            <EmptyLabState />
          )}
        </div>
      </main>
    </>
  );
}

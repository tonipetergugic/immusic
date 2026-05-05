import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { ScrollUnlock } from "./ScrollUnlock";
import { CriticalWarningsPanel } from "@/components/decision-center/CriticalWarningsPanel";
import { DecisionTrackHeader } from "@/components/decision-center/DecisionTrackHeader";
import { ExtendedFeedbackPreview } from "@/components/decision-center/ExtendedFeedbackPreview";
import { NextStepPanel } from "@/components/decision-center/NextStepPanel";
import { ReleaseReadinessPanel } from "@/components/decision-center/ReleaseReadinessPanel";
import { TechnicalReleaseChecksPanel } from "@/components/decision-center/TechnicalReleaseChecksPanel";
import { LabTrackSelector } from "./components/LabTrackSelector";
import type {
  AnalysisPayload,
  ArtistDecisionPayload,
} from "@/components/decision-center/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCachedServerUser } from "@/lib/supabase/getCachedServerUser";
import { readDecisionCenterState } from "@/lib/ai/decision-center/readDecisionCenterState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    track?: string;
    queue_id?: string;
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
  const queueId = (resolvedSearchParams.queue_id ?? "").trim();
  const isPlatformMode = Boolean(queueId);

  let items: LabItem[] = [];
  let selectedItem: LabItem | null = null;

  if (isPlatformMode) {
    const supabase = await createSupabaseServerClient();
    const user = await getCachedServerUser();

    if (!user) redirect("/login");

    const decisionState = await readDecisionCenterState({
      supabase,
      userId: user.id,
      queueId,
    });

    if (!decisionState.ok) {
      return (
        <main className="min-h-screen bg-[#0E0E10] px-4 py-8 text-white md:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-red-400/20 bg-red-400/[0.06] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-200/80">
              Decision Center unavailable
            </p>
            <h1 className="mt-4 text-2xl font-semibold text-white">
              We could not load this track.
            </h1>
            <p className="mt-3 text-sm text-zinc-300">
              Error: {decisionState.error}
            </p>
          </div>
        </main>
      );
    }

    if (decisionState.decision_payload) {
      selectedItem = {
        folderName: queueId,
        payloadPath: "engine",
        payload: decisionState.decision_payload,
        analysis: null,
      };
      items = [selectedItem];
    }
  } else {
    items = await loadLabItems();

    selectedItem =
      items.find((item) => item.folderName === resolvedSearchParams.track) ||
      items[0] ||
      null;
  }

  return (
    <>
      <ScrollUnlock />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(22,78,99,0.16),transparent_26%),linear-gradient(180deg,#09090b_0%,#0b0b0f_100%)] px-4 py-8 text-white md:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
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

                  <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                          AI Consultant & Detailed Feedback
                        </p>

                        <h2 className="mt-3 text-xl font-semibold text-white">
                          Open detailed track analysis
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                          Continue to the deeper feedback view with consultant
                          notes, structure, waveform, technical checks and
                          detailed modules.
                        </p>
                      </div>

                      <Link
                        href={
                          isPlatformMode
                            ? `/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}`
                            : `/decision-center-lab/feedback?track=${encodeURIComponent(
                                selectedItem.folderName,
                              )}`
                        }
                        className="inline-flex w-fit items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-300/15"
                      >
                        Open detailed feedback
                      </Link>
                    </div>
                  </section>

                </div>

                <aside className="lg:sticky lg:top-8 lg:self-start">
                  {isPlatformMode ? (
                    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        Selected track
                      </p>
                      <p className="mt-3 break-all text-sm text-zinc-300">
                        queue_id: {queueId}
                      </p>
                    </section>
                  ) : (
                    <LabTrackSelector
                      items={items}
                      selectedFolderName={selectedItem.folderName}
                    />
                  )}
                </aside>
              </div>
            </>
          ) : isPlatformMode ? (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
                Decision Center pending
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                No engine decision payload is available yet.
              </h2>
              <p className="mt-3 break-all text-sm text-zinc-400">
                queue_id: {queueId}
              </p>
            </section>
          ) : (
            <EmptyLabState />
          )}
        </div>
      </main>
    </>
  );
}

import { ArrowRight, Sparkles } from "lucide-react";
import type { ArtistDecisionPayload } from "@/components/decision-center/types";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function ConsultantSummaryPanel({
  payload,
}: {
  payload: ArtistDecisionPayload;
}) {
  const readinessLabel = payload.release_readiness?.label;
  const readinessText = payload.release_readiness?.text;
  const trackStatusLabel = payload.track_status?.label;
  const trackStatusText = payload.track_status?.text;
  const nextStepTitle = payload.next_step?.title;
  const nextStepText = payload.next_step?.text;
  const nextStepButtonLabel = payload.next_step?.button_label;

  return (
    <section
      id="consultant-summary"
      className="overflow-hidden rounded-[2rem] border border-[#00FFC6]/18 bg-[linear-gradient(135deg,rgba(0,255,198,0.09),rgba(255,255,255,0.035)_34%,rgba(255,255,255,0.018))] p-6 shadow-2xl shadow-black/25 md:p-8"
    >
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00FFC6]/20 bg-[#00FFC6]/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#00FFC6]">
            <Sparkles className="h-3.5 w-3.5" />
            AI Consultant Summary
          </div>

          <h2 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">
            {hasText(readinessText)
              ? readinessText
              : "A focused feedback summary is available for this track."}
          </h2>

          {hasText(trackStatusText) ? (
            <div className="mt-5 max-w-3xl">
              {hasText(trackStatusLabel) ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {trackStatusLabel}
                </p>
              ) : null}

              <p className="text-base leading-7 text-zinc-300">
                {trackStatusText}
              </p>
            </div>
          ) : null}
        </div>

        <aside className="rounded-3xl border border-white/10 bg-black/25 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Release decision
          </p>

          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#00FFC6]">
            {hasText(readinessLabel) ? readinessLabel : "Analysis available"}
          </p>

          <div className="mt-5 h-px bg-white/10" />

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Suggested next step
          </p>

          <p className="mt-3 text-base font-semibold text-white">
            {hasText(nextStepTitle) ? nextStepTitle : "Review the track"}
          </p>

          {hasText(nextStepText) ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {nextStepText}
            </p>
          ) : null}

          {hasText(nextStepButtonLabel) ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#00FFC6] px-4 py-2 text-sm font-semibold text-black">
              {nextStepButtonLabel}
              <ArrowRight className="h-4 w-4" />
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

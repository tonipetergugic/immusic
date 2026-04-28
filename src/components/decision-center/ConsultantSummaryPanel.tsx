import { Sparkles } from "lucide-react";
import type { ArtistDecisionPayload } from "@/components/decision-center/types";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function ConsultantSummaryPanel({
  payload,
}: {
  payload: ArtistDecisionPayload;
}) {
  const readinessText = payload.release_readiness?.text;
  const trackStatusLabel = payload.track_status?.label;
  const trackStatusText = payload.track_status?.text;

  return (
    <section
      id="consultant-summary"
      className="overflow-hidden rounded-[2rem] border border-[#00FFC6]/18 bg-[linear-gradient(135deg,rgba(0,255,198,0.09),rgba(255,255,255,0.035)_34%,rgba(255,255,255,0.018))] p-6 shadow-2xl shadow-black/25 md:p-8"
    >
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
    </section>
  );
}

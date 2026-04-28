import type { ArtistDecisionPayload } from "@/components/decision-center/types";

type AiConsultantPanelProps = {
  payload: ArtistDecisionPayload;
};

type FeedbackItem = {
  title?: string;
  text?: string;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeItems(items: FeedbackItem[] | undefined): FeedbackItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item) => hasText(item.title) || hasText(item.text));
}

function FeedbackList({
  items,
  emptyText,
}: {
  items: FeedbackItem[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-zinc-400">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`${item.title || "item"}-${index}`}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          {hasText(item.title) ? (
            <p className="text-sm font-semibold text-white">{item.title}</p>
          ) : null}

          {hasText(item.text) ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {item.text}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AiConsultantPanel({
  payload,
}: AiConsultantPanelProps) {
  const readinessLabel = payload.release_readiness?.label;
  const readinessText = payload.release_readiness?.text;

  const strengths = normalizeItems(payload.key_strengths);
  const checks = normalizeItems(payload.things_to_check);

  const nextStepTitle = payload.next_step?.title;
  const nextStepText = payload.next_step?.text;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
          AI Consultant
        </p>

        <h2 className="mt-2 text-lg font-semibold text-white">
          Detailed artist feedback
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Local fallback feedback based on the current artist decision payload.
          The later AI consultant can build on this structure without changing
          the release decision.
        </p>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-white">
            Overall impression
          </p>

          <p className="mt-2 text-sm font-medium text-cyan-100">
            {hasText(readinessLabel) ? readinessLabel : "Analysis available"}
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {hasText(readinessText)
              ? readinessText
              : "A first local release-readiness summary is available for this track."}
          </p>
        </div>

        <div className="xl:col-span-1">
          <p className="mb-3 text-sm font-semibold text-white">
            What works well
          </p>

          <FeedbackList
            items={strengths}
            emptyText="No specific strengths are available in the local payload yet."
          />
        </div>

        <div className="xl:col-span-1">
          <p className="mb-3 text-sm font-semibold text-white">
            What may be worth checking
          </p>

          <FeedbackList
            items={checks}
            emptyText="No specific check items are available in the local payload yet."
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-white">
            One practical next step
          </p>

          <p className="mt-2 text-sm font-medium text-cyan-100">
            {hasText(nextStepTitle) ? nextStepTitle : "Review the track"}
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {hasText(nextStepText)
              ? nextStepText
              : "Use the available analysis and listening notes to decide the next useful step."}
          </p>
        </div>
      </div>
    </section>
  );
}

import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import type {
  CriticalWarning,
  KeyStrength,
  OptionalFeedback,
  ThingToCheck,
} from "@/components/decision-center/types";

type InsightItem = {
  title?: string;
  text?: string;
  area?: string;
  severity?: string;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeInsightItems(items: InsightItem[] | undefined): InsightItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item) => hasText(item.title) || hasText(item.text));
}

function buildCheckItems(
  thingsToCheck: ThingToCheck[],
  criticalWarnings: CriticalWarning[],
): InsightItem[] {
  const warnings = normalizeInsightItems(criticalWarnings).map((item) => ({
    ...item,
    title: item.title || "Worth checking",
  }));

  const checks = normalizeInsightItems(thingsToCheck);

  return [...warnings, ...checks];
}

export function FeedbackInsightCards({
  keyStrengths,
  thingsToCheck,
  criticalWarnings,
  optionalFeedback,
}: {
  keyStrengths: KeyStrength[];
  thingsToCheck: ThingToCheck[];
  criticalWarnings: CriticalWarning[];
  optionalFeedback?: OptionalFeedback;
}) {
  const strengths = normalizeInsightItems(keyStrengths).slice(0, 3);
  const checks = buildCheckItems(thingsToCheck, criticalWarnings).slice(0, 3);

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-[2rem] border border-emerald-300/15 bg-emerald-300/[0.035] p-6 md:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/60">
              What works well
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-white">
              Strengths to keep
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {strengths.length > 0 ? (
            strengths.map((item, index) => (
              <div
                key={`${item.area || "strength"}-${index}`}
                className="rounded-2xl border border-white/8 bg-black/18 p-4"
              >
                <h3 className="text-sm font-semibold text-white">
                  {item.title || "Strength"}
                </h3>

                {hasText(item.text) ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {item.text}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-white/8 bg-black/18 p-4 text-sm leading-6 text-zinc-400">
              No specific strengths are available in the local payload yet.
            </p>
          )}
        </div>
      </article>

      <article className="rounded-[2rem] border border-amber-300/15 bg-amber-300/[0.035] p-6 md:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/60">
              Areas to check
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-white">
              Useful listening focus
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {checks.length > 0 ? (
            checks.map((item, index) => (
              <div
                key={`${item.area || "check"}-${index}`}
                className="rounded-2xl border border-white/8 bg-black/18 p-4"
              >
                <h3 className="text-sm font-semibold text-white">
                  {item.title || "Check"}
                </h3>

                {hasText(item.text) ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {item.text}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-white/8 bg-black/18 p-4 text-sm leading-6 text-zinc-400">
              No specific check areas are available in the local payload yet.
            </p>
          )}
        </div>

        {optionalFeedback?.locked ? (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#00FFC6]/20 bg-[#00FFC6]/8 px-4 py-2 text-sm font-medium text-[#00FFC6]">
            <Lock className="h-4 w-4" />
            {optionalFeedback.label || "Unlock full insights"}
          </div>
        ) : null}
      </article>
    </section>
  );
}

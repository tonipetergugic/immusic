import { Lock } from "lucide-react";
import type {
  KeyStrength,
  OptionalFeedback,
  ThingToCheck,
} from "@/components/decision-center/types";

export function ExtendedFeedbackPreview({
  keyStrengths,
  thingsToCheck,
  optionalFeedback,
}: {
  keyStrengths: KeyStrength[];
  thingsToCheck: ThingToCheck[];
  optionalFeedback?: OptionalFeedback;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Key Strengths
        </p>
        <div className="mt-4 grid gap-3">
          {keyStrengths.length === 0 ? (
            <p className="text-sm text-zinc-500">No strengths available.</p>
          ) : (
            keyStrengths.map((item, index) => (
              <div
                key={`${item.area || "strength"}-${index}`}
                className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4"
              >
                <h3 className="text-sm font-semibold text-emerald-100">
                  {item.title || "Strength"}
                </h3>
                {item.text ? (
                  <p className="mt-2 text-xs leading-5 text-emerald-50/68">
                    {item.text}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </article>

      <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Things to Check
        </p>
        <div className="mt-4 grid gap-3">
          {thingsToCheck.length === 0 ? (
            <p className="text-sm text-zinc-500">No checks available.</p>
          ) : (
            thingsToCheck.map((item, index) => (
              <div
                key={`${item.area || "check"}-${index}`}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <h3 className="text-sm font-semibold text-white">
                  {item.title || "Check"}
                </h3>
                {item.text ? (
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    {item.text}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </article>

      <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Optional Feedback
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            {optionalFeedback?.locked ? <Lock className="h-4 w-4" /> : null}
            {optionalFeedback?.label || "Optional module"}
          </div>
          {optionalFeedback?.text ? (
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              {optionalFeedback.text}
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}

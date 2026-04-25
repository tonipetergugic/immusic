import { ArrowRight } from "lucide-react";
import type { NextStep } from "@/components/decision-center/types";

export function NextStepPanel({ nextStep }: { nextStep?: NextStep }) {
  if (!nextStep) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/70">
        Next Step
      </p>
      <h2 className="mt-4 text-2xl font-semibold text-white">
        {nextStep.title || "Next step"}
      </h2>
      {nextStep.text ? (
        <p className="mt-3 text-sm leading-6 text-cyan-50/70">
          {nextStep.text}
        </p>
      ) : null}
      {nextStep.button_label ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-950">
          {nextStep.button_label}
          <ArrowRight className="h-4 w-4" />
        </div>
      ) : null}
    </section>
  );
}

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { TechnicalReleaseCheck } from "@/components/decision-center/types";

function getCheckStateMeta(state?: string) {
  if (state === "ok") {
    return {
      wrapper: "border-emerald-400/15 bg-emerald-400/[0.06]",
      chip: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
      dot: "text-emerald-300",
      icon: CheckCircle2,
      label: "OK",
    };
  }

  if (state === "warning") {
    return {
      wrapper: "border-yellow-400/15 bg-yellow-400/[0.06]",
      chip: "border-yellow-300/25 bg-yellow-300/10 text-yellow-100",
      dot: "text-yellow-300",
      icon: AlertTriangle,
      label: "Warning",
    };
  }

  if (state === "problem") {
    return {
      wrapper: "border-red-400/15 bg-red-400/[0.06]",
      chip: "border-red-300/25 bg-red-300/10 text-red-100",
      dot: "text-red-300",
      icon: AlertTriangle,
      label: "Problem",
    };
  }

  if (state === "unavailable") {
    return {
      wrapper: "border-white/10 bg-white/[0.025]",
      chip: "border-white/10 bg-white/[0.04] text-zinc-300",
      dot: "text-zinc-500",
      icon: Circle,
      label: "N/A",
    };
  }

  return {
    wrapper: "border-white/10 bg-white/[0.03]",
    chip: "border-white/10 bg-white/[0.03] text-zinc-300",
    dot: "text-zinc-500",
    icon: Circle,
    label: "Unknown",
  };
}

export function TechnicalReleaseChecksPanel({
  checks,
}: {
  checks: TechnicalReleaseCheck[];
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Technical Release Checks
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((check, index) => (
          (() => {
            const meta = getCheckStateMeta(check.state);
            const Icon = meta.icon;

            return (
              <article
                key={`${check.area || "check"}-${index}`}
                className={[
                  "rounded-2xl border px-4 py-3.5",
                  meta.wrapper,
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <Icon className={["h-4.5 w-4.5", meta.dot].join(" ")} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {check.label || "Check"}
                      </h3>
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
                          meta.chip,
                        ].join(" ")}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {check.short_text ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/58">
                        {check.short_text}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })()
        ))}
      </div>
    </section>
  );
}

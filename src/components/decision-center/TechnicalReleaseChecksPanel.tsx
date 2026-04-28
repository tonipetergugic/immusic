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
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#00FFC6]/80">
            Technical Release Checks
          </p>

          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-white">
            Release-ready basics
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            A compact safety pass before the deeper technical meter view.
          </p>
        </div>

        <div className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-zinc-500">
          {checks.length} checks
        </div>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {checks.map((check, index) => {
          const meta = getCheckStateMeta(check.state);
          const Icon = meta.icon;

          return (
            <article
              key={`${check.area || "check"}-${index}`}
              className="rounded-2xl border border-white/10 bg-black/18 p-3.5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035]">
                  <Icon className={["h-4 w-4", meta.dot].join(" ")} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-5 text-white">
                      {check.label || "Check"}
                    </h3>

                    <span
                      className={[
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                        meta.chip,
                      ].join(" ")}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {check.short_text ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {check.short_text}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

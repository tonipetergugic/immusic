import type { CriticalWarning } from "@/components/decision-center/types";

function getWarningClasses(severity?: string): string {
  if (severity === "problem") {
    return "border-red-400/25 bg-red-400/10 text-red-100";
  }

  return "border-yellow-400/25 bg-yellow-400/10 text-yellow-100";
}

export function CriticalWarningsPanel({
  warnings,
}: {
  warnings: CriticalWarning[];
}) {
  if (warnings.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm font-medium text-zinc-300">No critical issues.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Critical Warnings
      </p>

      <div className="mt-4 grid gap-3">
        {warnings.map((warning, index) => (
          <article
            key={`${warning.area || "warning"}-${index}`}
            className={[
              "rounded-2xl border p-4",
              getWarningClasses(warning.severity),
            ].join(" ")}
          >
            <h3 className="font-semibold">
              {warning.title || "Check recommended"}
            </h3>
            {warning.text ? (
              <p className="mt-2 text-sm opacity-80">{warning.text}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

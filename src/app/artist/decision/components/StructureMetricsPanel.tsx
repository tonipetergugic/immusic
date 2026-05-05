import type { AnalysisPayload } from "@/components/decision-center/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatMetric(value: unknown): string {
  const numberValue = getNumber(value);

  if (numberValue === null) {
    return "n/a";
  }

  return numberValue.toFixed(3);
}

export function StructureMetricsPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  const structure = analysis && isRecord(analysis.structure) ? analysis.structure : null;

  const rows = [
    { label: "Repetition", value: structure?.repetition_score },
    { label: "Contrast", value: structure?.contrast_score },
    { label: "Transition", value: structure?.transition_score },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Structure Metrics
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {row.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {formatMetric(row.value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

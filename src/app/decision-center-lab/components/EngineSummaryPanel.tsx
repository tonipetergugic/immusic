import type { AnalysisPayload } from "@/components/decision-center/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getArrayLength(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

export function EngineSummaryPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  if (!analysis) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Internal Lab
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Analysis JSON not available for this track.
        </p>
      </section>
    );
  }

  const fileInfo = isRecord(analysis.file_info) ? analysis.file_info : null;
  const summary = isRecord(analysis.summary) ? analysis.summary : null;
  const structure = isRecord(analysis.structure) ? analysis.structure : null;

  const rowCandidates: Array<{ label: string; value: string | number | null }> = [
    { label: "Filename", value: getString(fileInfo?.filename) },
    { label: "Duration", value: getNumber(fileInfo?.duration_sec) },
    { label: "Sample rate", value: getNumber(fileInfo?.sample_rate) },
    { label: "Channels", value: getNumber(fileInfo?.channels) },
    { label: "Tempo", value: getNumber(summary?.tempo_estimate) },
    { label: "Beat count", value: getNumber(summary?.beat_count) },
    { label: "Downbeats", value: getNumber(summary?.downbeat_count) },
    { label: "Bar count", value: getNumber(summary?.bar_count) },
    { label: "Segments", value: getNumber(structure?.segment_count) },
    { label: "Repetition", value: getNumber(structure?.repetition_score) },
    { label: "Contrast", value: getNumber(structure?.contrast_score) },
    { label: "Transition", value: getNumber(structure?.transition_score) },
    { label: "Issues", value: getArrayLength(analysis.issues) },
    { label: "product_payload", value: isRecord(analysis.product_payload) ? "yes" : "no" },
    { label: "consultant_input", value: isRecord(analysis.consultant_input) ? "yes" : "no" },
  ];

  const rows = rowCandidates.reduce<Array<{ label: string; value: string | number }>>(
    (accumulator, row) => {
      if (row.value !== null) {
        accumulator.push({ label: row.label, value: row.value });
      }

      return accumulator;
    },
    [],
  );

  const formatValue = (value: string | number) => {
    if (typeof value === "string") {
      return value;
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Internal Lab
          </p>
          <h3 className="mt-1 text-sm font-semibold text-white">Engine Summary</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
          Analysis JSON loaded
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {row.label}
            </p>
            <p className="mt-1 text-sm text-zinc-200">{formatValue(row.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

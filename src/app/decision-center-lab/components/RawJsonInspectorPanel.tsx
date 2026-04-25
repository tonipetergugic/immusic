import type { AnalysisPayload } from "@/components/decision-center/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function formatDebugJson(
  value: unknown,
  options?: { pretty?: boolean; maxLength?: number },
): string {
  try {
    const text = JSON.stringify(value, null, options?.pretty ? 2 : 0);
    const maxLength = options?.maxLength ?? 220;

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength)}…`;
  } catch {
    return "Unable to format value.";
  }
}

export function RawJsonInspectorPanel({
  analysis,
}: {
  analysis: AnalysisPayload | null;
}) {
  if (!analysis) {
    return null;
  }

  const productPayload = getRecord(analysis.product_payload);
  const consultantInput = getRecord(analysis.consultant_input);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Internal Lab
      </p>
      <h3 className="mt-1 text-sm font-semibold text-white">Raw JSON Inspector</h3>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            product_payload
          </p>
          <pre className="mt-2 max-h-96 overflow-auto rounded-xl border border-white/8 bg-black/20 p-3 text-xs leading-5 text-zinc-300">
            {productPayload
              ? formatDebugJson(productPayload, { pretty: true, maxLength: 12000 })
              : "No product_payload."}
          </pre>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            consultant_input
          </p>
          <pre className="mt-2 max-h-96 overflow-auto rounded-xl border border-white/8 bg-black/20 p-3 text-xs leading-5 text-zinc-300">
            {consultantInput
              ? formatDebugJson(consultantInput, { pretty: true, maxLength: 12000 })
              : "No consultant_input."}
          </pre>
        </div>
      </div>
    </section>
  );
}

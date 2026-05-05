import type { AnalysisPayload } from "@/components/decision-center/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value.length > 0 ? value : "—";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return "—";
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

export function IssueDebugScoreContextPanel({
  analysis,
}: {
  analysis: AnalysisPayload | null;
}) {
  if (!analysis) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Internal Lab
        </p>
        <h3 className="mt-1 text-sm font-semibold text-white">Issue Debug &amp; Score Context</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Issue and score context data not available for this track.
        </p>
      </section>
    );
  }

  const rootIssues = getArray(analysis.issues);
  const productPayload = getRecord(analysis.product_payload);
  const consultantInput = getRecord(analysis.consultant_input);
  const productPayloadIssues = getArray(productPayload?.issues);
  const consultantInputIssues = getArray(consultantInput?.issues);
  const scoreContext = getRecord(consultantInput?.score_context);

  const scoreContextRows = scoreContext
    ? Object.entries(scoreContext).map(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          return { key, value: formatPrimitive(value) };
        }

        if (Array.isArray(value)) {
          const isPrimitiveList = value.every(
            (item) =>
              item === null ||
              item === undefined ||
              typeof item === "string" ||
              typeof item === "number" ||
              typeof item === "boolean",
          );

          return {
            key,
            value: isPrimitiveList
              ? value.map((item) => formatPrimitive(item)).join(", ") || "—"
              : formatDebugJson(value),
          };
        }

        return { key, value: formatDebugJson(value) };
      })
    : [];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Internal Lab
      </p>
      <h3 className="mt-1 text-sm font-semibold text-white">Issue Debug &amp; Score Context</h3>

      <div className="mt-5 space-y-5">
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Root Issues</h4>
          {rootIssues.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No root issues.</p>
          ) : (
            <div className="mt-3 grid gap-2">
              {rootIssues.map((issue, index) => {
                const record = getRecord(issue);
                const details = getRecord(record?.details);
                const detailsPrimitiveEntries = details
                  ? Object.entries(details).filter(([, value]) =>
                      value === null ||
                      value === undefined ||
                      typeof value === "string" ||
                      typeof value === "number" ||
                      typeof value === "boolean",
                    )
                  : [];

                return (
                  <article
                    key={`root-issue-${index}`}
                    className="rounded-xl border border-white/8 bg-black/15 p-3"
                  >
                    <div className="grid gap-1 text-xs text-zinc-300">
                      <p>
                        <span className="text-zinc-500">code:</span>{" "}
                        {formatPrimitive(record?.code)}
                      </p>
                      <p>
                        <span className="text-zinc-500">severity:</span>{" "}
                        {formatPrimitive(record?.severity)}
                      </p>
                      <p>
                        <span className="text-zinc-500">area:</span>{" "}
                        {formatPrimitive(record?.area)}
                      </p>
                      <p>
                        <span className="text-zinc-500">message:</span>{" "}
                        {formatPrimitive(record?.message)}
                      </p>
                      <p>
                        <span className="text-zinc-500">text:</span>{" "}
                        {formatPrimitive(record?.text)}
                      </p>
                      <p>
                        <span className="text-zinc-500">details:</span>{" "}
                        {detailsPrimitiveEntries.length > 0
                          ? detailsPrimitiveEntries
                              .map(
                                ([key, value]) =>
                                  `${key}=${formatPrimitive(value)}`,
                              )
                              .join(", ")
                          : "—"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Product Payload Issues</h4>
          {productPayloadIssues.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No product payload issues.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {productPayloadIssues.map((issue, index) => (
                <pre
                  key={`product-payload-issue-${index}`}
                  className="overflow-x-auto rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs text-zinc-300"
                >
                  {formatDebugJson(issue, { maxLength: 420 })}
                </pre>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Consultant Input Issues</h4>
          {consultantInputIssues.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No consultant input issues.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {consultantInputIssues.map((issue, index) => (
                <pre
                  key={`consultant-input-issue-${index}`}
                  className="overflow-x-auto rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs text-zinc-300"
                >
                  {formatDebugJson(issue, { maxLength: 420 })}
                </pre>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Score Context</h4>
          {!scoreContext ? (
            <p className="mt-3 text-sm text-zinc-400">No score context.</p>
          ) : scoreContextRows.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No score context.</p>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {scoreContextRows.map((row) => (
                <div
                  key={row.key}
                  className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {row.key}
                  </p>
                  <p className="mt-1 break-words text-sm text-zinc-200">{row.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

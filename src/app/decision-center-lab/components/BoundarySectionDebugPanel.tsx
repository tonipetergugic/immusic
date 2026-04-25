import type { AnalysisPayload } from "@/components/decision-center/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function formatSeconds(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(2);
}

function formatBarList(value: unknown): string {
  const values = getArray(value)
    .map((item) => {
      const asNumber = getNumber(item);
      if (asNumber !== null) {
        return Number.isInteger(asNumber) ? String(asNumber) : asNumber.toFixed(2);
      }

      const asString = getString(item);
      return asString;
    })
    .filter((item): item is string => Boolean(item));

  return values.length > 0 ? values.join(", ") : "—";
}

export function BoundarySectionDebugPanel({
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
        <h3 className="mt-1 text-sm font-semibold text-white">
          Boundary / Section Debug
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Boundary and section debug data not available for this track.
        </p>
      </section>
    );
  }

  const boundaryDecision = getRecord(analysis.boundary_decision);
  const sections = getRecord(analysis.sections);
  const macroSections = getRecord(analysis.macro_sections);
  const micro = getRecord(analysis.micro);
  const fusion = getRecord(analysis.fusion);

  const sectionRows = getArray(sections?.sections ?? sections?.detected_sections).map(
    (section, index) => {
      const record = getRecord(section);
      const startSec = getNumber(record?.start_sec) ?? getNumber(record?.start);
      const endSec = getNumber(record?.end_sec) ?? getNumber(record?.end);
      const durationSec =
        getNumber(record?.duration_sec) ??
        (startSec !== null && endSec !== null ? endSec - startSec : null);
      const startBar =
        getNumber(record?.start_bar_index) ?? getNumber(record?.start_bar);
      const endBar = getNumber(record?.end_bar_index) ?? getNumber(record?.end_bar);

      return {
        index: getNumber(record?.index) ?? index,
        startSec,
        endSec,
        durationSec,
        startBar,
        endBar,
      };
    },
  );

  const macroSectionRows = getArray(
    macroSections?.macro_sections ?? macroSections?.sections,
  ).map((section, index) => {
    const record = getRecord(section);
    const startSec = getNumber(record?.start_sec) ?? getNumber(record?.start);
    const endSec = getNumber(record?.end_sec) ?? getNumber(record?.end);
    const startBar =
      getNumber(record?.start_bar_index) ?? getNumber(record?.start_bar);
    const endBar = getNumber(record?.end_bar_index) ?? getNumber(record?.end_bar);

    return {
      index: getNumber(record?.index) ?? index,
      startSec,
      endSec,
      startBar,
      endBar,
    };
  });

  const fusionTopRows = fusion
    ? Object.entries(fusion).filter(([, value]) => {
        if (typeof value === "number" && Number.isFinite(value)) {
          return true;
        }

        if (Array.isArray(value)) {
          return value.every(
            (item) =>
              (typeof item === "number" && Number.isFinite(item)) ||
              typeof item === "string",
          );
        }

        return false;
      })
    : [];

  const renderKeyValueGrid = (
    rows: Array<{ label: string; value: string }>,
    emptyText: string,
  ) => {
    if (rows.length === 0) {
      return <p className="mt-3 text-sm text-zinc-400">{emptyText}</p>;
    }

    return (
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {row.label}
            </p>
            <p className="mt-1 text-sm text-zinc-200">{row.value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Internal Lab
      </p>
      <h3 className="mt-1 text-sm font-semibold text-white">
        Boundary / Section Debug
      </h3>

      <div className="mt-5 space-y-5">
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Boundary Summary</h4>
          {boundaryDecision ? (
            renderKeyValueGrid(
              [
                {
                  label: "decision_mode",
                  value: getString(boundaryDecision.decision_mode) || "—",
                },
                {
                  label: "input_candidate_count",
                  value: formatNumber(
                    getNumber(boundaryDecision.input_candidate_count),
                    0,
                  ),
                },
                {
                  label: "scored_candidate_count",
                  value: formatNumber(
                    getNumber(boundaryDecision.scored_candidate_count),
                    0,
                  ),
                },
                {
                  label: "final_boundary_count",
                  value: formatNumber(
                    getNumber(boundaryDecision.final_boundary_count),
                    0,
                  ),
                },
                {
                  label: "kept_boundary_bar_indices",
                  value: formatBarList(boundaryDecision.kept_boundary_bar_indices),
                },
                {
                  label: "removed_boundary_bar_indices",
                  value: formatBarList(
                    boundaryDecision.removed_boundary_bar_indices,
                  ),
                },
                {
                  label: "final_boundaries",
                  value: formatBarList(boundaryDecision.final_boundaries),
                },
              ],
              "No boundary_decision data.",
            )
          ) : (
            <p className="mt-3 text-sm text-zinc-400">
              No boundary_decision data.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Section Summary</h4>
          {sections ? (
            <>
              {renderKeyValueGrid(
                [
                  {
                    label: "section_count",
                    value: formatNumber(getNumber(sections.section_count), 0),
                  },
                ],
                "No sections data.",
              )}
              {sectionRows.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">No sections data.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          Index
                        </th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          Start
                        </th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          End
                        </th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          Duration
                        </th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          Start Bar
                        </th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          End Bar
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.map((section) => (
                        <tr
                          key={`section-${section.index}-${section.startSec ?? "na"}`}
                          className="text-zinc-300"
                        >
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatNumber(section.index, 0)}
                          </td>
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatSeconds(section.startSec)}
                          </td>
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatSeconds(section.endSec)}
                          </td>
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatSeconds(section.durationSec)}
                          </td>
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatNumber(section.startBar, 0)}
                          </td>
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatNumber(section.endBar, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No sections data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">
            Macro Section Summary
          </h4>
          {macroSections ? (
            <>
              {renderKeyValueGrid(
                [
                  {
                    label: "macro_section_count",
                    value: formatNumber(
                      getNumber(macroSections.macro_section_count),
                      0,
                    ),
                  },
                  {
                    label: "macro_boundary_bar_indices",
                    value: formatBarList(macroSections.macro_boundary_bar_indices),
                  },
                  {
                    label: "ignored_boundary_bar_indices",
                    value: formatBarList(
                      macroSections.ignored_boundary_bar_indices,
                    ),
                  },
                  {
                    label: "selected_group_anchor_bar_indices",
                    value: formatBarList(
                      macroSections.selected_group_anchor_bar_indices,
                    ),
                  },
                ],
                "No macro_sections data.",
              )}
              {macroSectionRows.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">
                  No macro_sections data.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          Index
                        </th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          Start
                        </th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          End
                        </th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          Start Bar
                        </th>
                        <th className="border-b border-white/10 px-3 py-2 font-semibold">
                          End Bar
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {macroSectionRows.map((section) => (
                        <tr
                          key={`macro-section-${section.index}-${section.startSec ?? "na"}`}
                          className="text-zinc-300"
                        >
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatNumber(section.index, 0)}
                          </td>
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatSeconds(section.startSec)}
                          </td>
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatSeconds(section.endSec)}
                          </td>
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatNumber(section.startBar, 0)}
                          </td>
                          <td className="border-b border-white/5 px-3 py-2">
                            {formatNumber(section.endBar, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No macro_sections data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">
            Micro / Fusion Mini Summary
          </h4>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                micro
              </p>
              {micro ? (
                renderKeyValueGrid(
                  [
                    {
                      label: "micro_marker_count",
                      value: formatNumber(getNumber(micro.micro_marker_count), 0),
                    },
                    {
                      label: "micro_markers",
                      value: formatBarList(micro.micro_markers),
                    },
                  ],
                  "No micro data.",
                )
              ) : (
                <p className="mt-3 text-sm text-zinc-400">No micro data.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                fusion
              </p>
              {fusion ? (
                fusionTopRows.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-400">No fusion data.</p>
                ) : (
                  renderKeyValueGrid(
                    fusionTopRows.map(([key, value]) => ({
                      label: key,
                      value: Array.isArray(value)
                        ? formatBarList(value)
                        : formatNumber(getNumber(value), 4),
                    })),
                    "No fusion data.",
                  )
                )
              ) : (
                <p className="mt-3 text-sm text-zinc-400">No fusion data.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

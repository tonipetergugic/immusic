import type { AnalysisPayload } from "@/components/decision-center/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
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

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

function renderKeyValueGrid(
  rows: Array<{ label: string; value: string }>,
  emptyText: string,
) {
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
}

export function SegmentOverviewPanel({
  analysis,
}: {
  analysis: AnalysisPayload | null;
}) {
  const sections = getRecord(analysis?.sections);
  const macroSections = getRecord(analysis?.macro_sections);

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

  return (
    <>
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
    </>
  );
}

import type { Range } from "../types";

export function getRangeStartIso(range: Range): string | null {
  if (range === "all") return null;

  const days = range === "7d" ? 7 : 28;
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  const fromISO = from.toISOString().slice(0, 10);

  return `${fromISO}T00:00:00.000Z`;
}

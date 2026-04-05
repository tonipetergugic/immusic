import type { Range } from "../types";

export type RangeLabel = {
  badge: string;
  subtitle: string;
  metricSuffix: string;
};

export function getRangeLabel(r: Range): RangeLabel {
  if (r === "7d") {
    return { badge: "7d", subtitle: "last 7 days", metricSuffix: "(7d)" };
  }

  if (r === "28d") {
    return { badge: "28d", subtitle: "last 28 days", metricSuffix: "(28d)" };
  }

  return { badge: "All time", subtitle: "all time", metricSuffix: "(all time)" };
}

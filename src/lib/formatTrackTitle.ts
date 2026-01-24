export function formatTrackTitle(title?: string | null, version?: string | null) {
  const t = title ?? "Untitled";
  const v = version ?? null;
  if (!v || v === "None") return t;
  return `${t} (${v})`;
}

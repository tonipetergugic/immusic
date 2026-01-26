export function formatReleaseDateDE(value: unknown): string | null {
  if (!value) return null;
  const dt = new Date(value as any);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

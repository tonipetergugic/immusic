export function formatTotalDuration(sec: number): string | null {
  if (!sec || sec <= 0) return null;

  const totalMinutes = Math.round(sec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `about ${totalMinutes} min`;
  }

  return `about ${hours} h ${String(minutes).padStart(2, "0")} min`;
}

export function formatReleaseDate(d: unknown): string | null {
  if (!d) return null;
  const dt = new Date(d instanceof Date ? d : String(d));
  if (Number.isNaN(dt.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dt);
}

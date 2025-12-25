import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ArtistAnalyticsPage() {
  const supabase = await createSupabaseServerClient();

  // Auth User (Artist) ermitteln
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;

  let creditBalance: number | null = null;

  if (!userErr && userId) {
    const { data: credits, error: creditsError } = await supabase
      .from("artist_credits")
      .select("balance")
      .eq("profile_id", userId)
      .single();

    // Wie im Dashboard: "no rows" tolerieren
    if (creditsError && (creditsError as any).code !== "PGRST116") {
      throw creditsError;
    }

    const balance = (credits as any)?.balance ?? 0;
    creditBalance = typeof balance === "number" ? balance : Number(balance);
  }

  const creditBalanceLabel =
    creditBalance === null ? "—" : creditBalance.toLocaleString("de-DE");

  let creditTx: Array<{
    id: string;
    delta: number | string | null;
    balance_after: number | string | null;
    reason: string | null;
    created_at: string;
  }> = [];

  if (!userErr && userId) {
    const { data: tx, error: txError } = await supabase
      .from("artist_credit_transactions")
      .select("id, delta, balance_after, reason, created_at")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (txError) {
      throw txError;
    }

    creditTx = (tx ?? []) as any;
  }

  type PerfRow = {
    id: string;
    stream_count: number | null;
    rating_avg: number | null;
    rating_count: number | null;
    release_id: string;
    tracks: { title: string } | null;
    releases: { title: string; artist_id: string } | null;
  };

  let perfRows: PerfRow[] = [];

  if (!userErr && userId) {
    const { data, error } = await supabase
      .from("release_tracks")
      .select(
        "id, stream_count, rating_avg, rating_count, release_id, releases!inner(artist_id, title), tracks(title)"
      )
      .eq("releases.artist_id", userId);

    if (error) throw error;

    perfRows = (data ?? []) as any;
  }

  let topTracksByStreams: Array<{
    id: string;
    stream_count: number | null;
    track_id?: string;
    tracks: { title: string } | null;
  }> = [];

  topTracksByStreams = perfRows
    .slice()
    .sort((a, b) => (b.stream_count ?? 0) - (a.stream_count ?? 0))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      stream_count: r.stream_count,
      tracks: r.tracks,
    }));

  let topReleasesByStreams: Array<{ release_id: string; title: string; streams: number }> = [];

  {
    const map = new Map<string, { release_id: string; title: string; streams: number }>();

    for (const row of perfRows) {
      const releaseId = row.release_id;
      const title = row.releases?.title ?? "—";
      const sc = row.stream_count ?? 0;

      const prev = map.get(releaseId);
      if (prev) prev.streams += sc;
      else map.set(releaseId, { release_id: releaseId, title, streams: sc });
    }

    topReleasesByStreams = Array.from(map.values())
      .sort((a, b) => b.streams - a.streams)
      .slice(0, 3);
  }

  let zeroStreamTracks: Array<{ id: string; title: string }> = [];

  zeroStreamTracks = perfRows
    .filter((r) => (r.stream_count ?? 0) === 0)
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      title: r.tracks?.title ?? "—",
    }));

  let totalTracks: number | null = null;

  totalTracks = perfRows.length;

  const totalTracksLabel =
    totalTracks === null ? "—" : totalTracks.toLocaleString("de-DE");

  let topTracksByRating: Array<{
    id: string;
    rating_avg: number | null;
    rating_count: number | null;
    tracks: { title: string } | null;
  }> = [];

  topTracksByRating = perfRows
    .filter((row: any) => (row?.rating_count ?? 0) > 0 && typeof row?.rating_avg === "number")
    .sort((a: any, b: any) => {
      const ar = a.rating_avg ?? 0;
      const br = b.rating_avg ?? 0;
      if (br !== ar) return br - ar;
      const ac = a.rating_count ?? 0;
      const bc = b.rating_count ?? 0;
      return bc - ac;
    })
    .slice(0, 5);

  let noRatingTracks: Array<{ id: string; title: string }> = [];

  noRatingTracks = perfRows
    .filter((row: any) => {
      const rc = row?.rating_count;
      return rc === 0 || rc === null;
    })
    .slice(0, 10)
    .map((row: any) => ({
      id: row.id,
      title: row?.tracks?.title ?? "—",
    }));

  let totalStreams: number | null = null;

  {
    let sum = 0;

    for (const row of perfRows as any[]) {
      const v = typeof row?.stream_count === "number" ? row.stream_count : 0;
      sum += v;
    }

    totalStreams = sum;
  }

  const totalStreamsLabel =
    totalStreams === null ? "—" : totalStreams.toLocaleString("de-DE");

  let avgStreamsPerTrack: number | null = null;

  if (
    typeof totalStreams === "number" &&
    typeof totalTracks === "number" &&
    totalTracks > 0
  ) {
    avgStreamsPerTrack = totalStreams / totalTracks;
  } else {
    avgStreamsPerTrack = null;
  }

  const avgStreamsPerTrackLabel =
    avgStreamsPerTrack === null
      ? "—"
      : Math.round(avgStreamsPerTrack).toLocaleString("de-DE");

  let totalReleases: number | null = null;

  {
    const set = new Set<string>();
    for (const row of perfRows as any[]) {
      if (row?.release_id) set.add(row.release_id);
    }
    totalReleases = set.size;
  }

  const totalReleasesLabel =
    totalReleases === null ? "—" : totalReleases.toLocaleString("de-DE");

  let totalRatingsCount: number | null = null;

  {
    let sum = 0;

    for (const row of perfRows as any[]) {
      const v = typeof row?.rating_count === "number" ? row.rating_count : 0;
      sum += v;
    }

    totalRatingsCount = sum;
  }

  const totalRatingsCountLabel =
    totalRatingsCount === null ? "—" : totalRatingsCount.toLocaleString("de-DE");

  let avgRating: number | null = null;

  {
    let weightedSum = 0;
    let countSum = 0;

    for (const row of perfRows as any[]) {
      const c = typeof row?.rating_count === "number" ? row.rating_count : 0;
      const a = typeof row?.rating_avg === "number" ? row.rating_avg : null;

      if (c > 0 && a !== null) {
        weightedSum += a * c;
        countSum += c;
      }
    }

    avgRating = countSum > 0 ? weightedSum / countSum : null;
  }

  const avgRatingLabel =
    avgRating === null ? "—" : avgRating.toFixed(2).replace(".", ",");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-neutral-400">
            Phase 1: KPIs + Performance/Quality/Credits (read-only)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
            Live KPI: Total Streams
          </span>
        </div>
      </div>

      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="Total Streams"
          value={totalStreamsLabel}
          hint="SUM release_tracks.stream_count (artist only)"
        />
        <KpiCard
          title="Ø Streams / Track"
          value={avgStreamsPerTrackLabel}
          hint="Total Streams / Tracks"
        />
        <KpiCard
          title="Releases"
          value={totalReleasesLabel}
          hint="COUNT releases (artist only)"
        />
        <KpiCard
          title="Tracks"
          value={totalTracksLabel}
          hint="COUNT release_tracks (artist only)"
        />
        <KpiCard
          title="Ø Rating"
          value={avgRatingLabel}
          hint="Weighted avg (rating_avg × rating_count)"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Ratings (Count)"
          value={totalRatingsCountLabel}
          hint="SUM release_tracks.rating_count (artist only)"
        />
        <KpiCard
          title="Credit Balance"
          value={creditBalanceLabel}
          hint="artist_credits.balance"
        />
        <KpiCard title="Status" value="UI Ready" hint="No queries yet (Step 2)" />
      </div>

      {/* Row 2 — Detail Sections */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Performance */}
        <SectionCard
          title="Performance"
          subtitle="Streams-basierte Auswertung (Phase 1)"
          items={[
            { label: "Top 5 Tracks nach Streams", value: "Live" },
            { label: "Top 3 Releases nach Streams", value: "Live" },
            { label: "Tracks mit 0 Streams", value: "Live" },
          ]}
        >
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/20">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                      #
                    </th>
                    <th className="px-3 py-2 text-xs font-medium text-neutral-300">
                      Title
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                      Streams
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {topTracksByStreams.length === 0 ? (
                    <tr className="border-t border-white/10">
                      <td className="px-3 py-3 text-xs text-neutral-400" colSpan={3}>
                        No tracks found.
                      </td>
                    </tr>
                  ) : (
                    topTracksByStreams.map((row, idx) => (
                      <tr key={row.id} className="border-t border-white/10">
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-400">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 text-xs text-neutral-300">
                          {row.tracks?.title ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-300">
                          {(row.stream_count ?? 0).toLocaleString("de-DE")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/10 bg-black/10 px-3 py-2 text-[11px] text-neutral-500">
              Top 5 tracks by streams (release_tracks.stream_count)
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/20">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                      #
                    </th>
                    <th className="px-3 py-2 text-xs font-medium text-neutral-300">
                      Release
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                      Streams
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {topReleasesByStreams.length === 0 ? (
                    <tr className="border-t border-white/10">
                      <td className="px-3 py-3 text-xs text-neutral-400" colSpan={3}>
                        No releases found.
                      </td>
                    </tr>
                  ) : (
                    topReleasesByStreams.map((row, idx) => (
                      <tr key={row.release_id} className="border-t border-white/10">
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-400">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 text-xs text-neutral-300">
                          {row.title}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-300">
                          {row.streams.toLocaleString("de-DE")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/10 bg-black/10 px-3 py-2 text-[11px] text-neutral-500">
              Top 3 releases by total streams (aggregated)
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3">
            <div className="text-xs font-medium text-neutral-300">Tracks with 0 streams</div>

            {zeroStreamTracks.length === 0 ? (
              <div className="mt-2 text-xs text-neutral-400">None 🎉</div>
            ) : (
              <ul className="mt-2 space-y-2">
                {zeroStreamTracks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-xs text-neutral-300">{t.title}</span>
                    <span className="text-[11px] text-neutral-500">0</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2 text-[11px] text-neutral-500">
              Showing up to 10 (artist only)
            </div>
          </div>
        </SectionCard>

        {/* Quality */}
        <SectionCard
          title="Quality"
          subtitle="Ratings-basierte Auswertung (Phase 1)"
          items={[
            { label: "Top 5 Tracks nach Rating", value: "Live" },
            { label: "Tracks ohne Rating", value: "Live" },
          ]}
        >
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/20">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                      #
                    </th>
                    <th className="px-3 py-2 text-xs font-medium text-neutral-300">
                      Title
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                      Ø Rating
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                      Ratings
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {topTracksByRating.length === 0 ? (
                    <tr className="border-t border-white/10">
                      <td className="px-3 py-3 text-xs text-neutral-400" colSpan={4}>
                        No rated tracks yet.
                      </td>
                    </tr>
                  ) : (
                    topTracksByRating.map((row, idx) => (
                      <tr key={row.id} className="border-t border-white/10">
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-400">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 text-xs text-neutral-300">
                          {row.tracks?.title ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-300">
                          {typeof row.rating_avg === "number"
                            ? row.rating_avg.toFixed(2).replace(".", ",")
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-400">
                          {(row.rating_count ?? 0).toLocaleString("de-DE")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/10 bg-black/10 px-3 py-2 text-[11px] text-neutral-500">
              Top 5 tracks by rating (artist only)
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3">
            <div className="text-xs font-medium text-neutral-300">Tracks without rating</div>

            {noRatingTracks.length === 0 ? (
              <div className="mt-2 text-xs text-neutral-400">None 🎉</div>
            ) : (
              <ul className="mt-2 space-y-2">
                {noRatingTracks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-xs text-neutral-300">{t.title}</span>
                    <span className="text-[11px] text-neutral-500">—</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2 text-[11px] text-neutral-500">
              Showing up to 10 (artist only)
            </div>
          </div>
        </SectionCard>

        {/* Credits */}
        <SectionCard
          title="Credits"
          subtitle="Read-only Übersicht (Phase 1)"
          items={[
            { label: "Aktueller Balance", value: "Live" },
            { label: "Letzte 10 Transaktionen", value: "Live" },
          ]}
        >
          <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-neutral-400">Aktueller Balance</div>
          <div className="mt-1 text-2xl font-semibold">{creditBalanceLabel}</div>
            <div className="mt-1 text-xs text-neutral-500">artist_credits.balance</div>
          </div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                    Date
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                    Delta
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                    Balance After
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                    Reason
                  </th>
                </tr>
              </thead>

              <tbody>
                {creditTx.length === 0 ? (
                  <tr className="border-t border-white/10">
                    <td className="px-3 py-3 text-xs text-neutral-400" colSpan={4}>
                      No credit transactions yet.
                    </td>
                  </tr>
                ) : (
                  creditTx.map((tx) => (
                    <tr key={tx.id} className="border-t border-white/10">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-300">
                        {new Date(tx.created_at).toLocaleDateString("de-DE")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-300">
                        {typeof tx.delta === "number"
                          ? tx.delta > 0
                            ? `+${tx.delta}`
                            : `${tx.delta}`
                          : String(tx.delta ?? "—")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-400">
                        {tx.balance_after === null ? "—" : String(tx.balance_after)}
                      </td>
                      <td className="min-w-0 px-3 py-2 text-xs text-neutral-400">
                        {tx.reason ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 bg-black/10 px-3 py-2 text-[11px] text-neutral-500">
            artist_credit_transactions (last 10, read-only)
          </div>
        </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* ---------- UI Helpers (lokal, Step 2 only) ---------- */

function KpiCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-neutral-400">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-neutral-500">{hint}</div> : null}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  items,
  children,
}: {
  title: string;
  subtitle?: string;
  items?: Array<{ label: string; value: string }>;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>
          ) : null}
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-neutral-300">
          Phase 1
        </span>
      </div>

      {items?.length ? (
        <div className="mt-4 space-y-2">
          {items.map((it) => (
            <div
              key={it.label}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/10 px-3 py-2"
            >
              <div className="text-xs text-neutral-400">{it.label}</div>
              <div className="text-xs text-neutral-300">{it.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4">{children}</div>
    </div>
  );
}

function PlaceholderTable({
  columns,
  rows,
  caption,
}: {
  columns: string[];
  rows: number;
  caption?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/20">
            <tr>
              {columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-300">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx} className="border-t border-white/10">
                {columns.map((c, j) => (
                  <td key={`${idx}-${j}`} className="px-3 py-2 text-xs text-neutral-400">
                    —
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <div className="border-t border-white/10 bg-black/10 px-3 py-2 text-[11px] text-neutral-500">
          {caption}
        </div>
      ) : null}
    </div>
  );
}


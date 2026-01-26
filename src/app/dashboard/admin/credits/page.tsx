import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function adjustArtistCreditsAction(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const profileId = String(formData.get("profile_id") ?? "").trim();
  const deltaRaw = String(formData.get("delta") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  const delta = Number(deltaRaw);

  if (!profileId) throw new Error("Missing profile_id");
  if (!Number.isFinite(delta) || delta === 0)
    throw new Error("Delta must be a non-zero number");
  if (!reason) throw new Error("Reason is required");

  const { error: rpcErr } = await supabase.rpc("admin_adjust_artist_credits", {
    p_profile_id: profileId,
    p_delta: delta,
    p_reason: reason,
  });

  if (rpcErr) throw rpcErr;

  revalidatePath("/dashboard/admin/credits");
}

export default async function AdminCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const sp = await searchParams;

  const qRaw = (sp?.q ?? "").trim();
  const q = qRaw.length > 0 ? qRaw : "";

  let query = supabase
    .from("profiles")
    .select(
      `
        id,
        display_name,
        email,
        role
      `
    )
    .eq("role", "artist")
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) {
    const escaped = q.replace(/,/g, "");
    query = query.or(
      `display_name.ilike.%${escaped}%,email.ilike.%${escaped}%`
    );
  }

  const { data, error } = await query;

  const ids = (data ?? []).map((p: any) => p.id).filter(Boolean);

  const { data: creditsData, error: creditsError } = ids.length
    ? await supabase
        .from("artist_credits")
        .select("profile_id,balance")
        .in("profile_id", ids)
    : { data: [], error: null };

  if (creditsError) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold">Admin · Credits</h1>
        <p className="mt-4 text-red-400">
          Error loading credit balances: {creditsError.message}
        </p>
      </div>
    );
  }

  const balanceByProfileId = new Map<string, number>(
    (creditsData ?? []).map((c: any) => [
      c.profile_id as string,
      c.balance as number,
    ])
  );

  if (error) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold">Admin · Credits</h1>
        <p className="mt-4 text-red-400">
          Error loading artists: {error.message}
        </p>
      </div>
    );
  }

  const rows =
    (data ?? []).map((p: any) => {
      const balance = balanceByProfileId.get(p.id as string) ?? 0;

      return {
        id: p.id as string,
        display_name: (p.display_name as string) ?? "Unnamed",
        email: (p.email as string) ?? "",
        role: p.role as string,
        balance: typeof balance === "number" ? balance : 0,
      };
    }) ?? [];

  // Latest transactions (global)
  const { data: txData, error: txError } = await supabase
    .from("artist_credit_transactions")
    .select(
      "id, profile_id, delta, balance_after, reason, source, created_by, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (txError) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold">Admin · Credits</h1>
        <p className="mt-4 text-red-400">
          Error loading transactions: {txError.message}
        </p>
      </div>
    );
  }

  const txProfileIds = Array.from(
    new Set((txData ?? []).map((t: any) => t.profile_id).filter(Boolean))
  );

  const txAdminIds = Array.from(
    new Set((txData ?? []).map((t: any) => t.created_by).filter(Boolean))
  );

  const allLookupIds = Array.from(new Set([...txProfileIds, ...txAdminIds]));

  const { data: lookupProfiles, error: lookupErr } = allLookupIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email, role")
        .in("id", allLookupIds)
    : { data: [], error: null };

  if (lookupErr) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold">Admin · Credits</h1>
        <p className="mt-4 text-red-400">
          Error loading profile lookup: {lookupErr.message}
        </p>
      </div>
    );
  }

  const nameById = new Map<string, string>(
    (lookupProfiles ?? []).map((p: any) => [
      p.id as string,
      (p.display_name as string) || (p.email as string) || p.id,
    ])
  );

  const latestTx = (txData ?? []).map((t: any) => ({
    id: t.id as string,
    profile_id: t.profile_id as string,
    artist_name:
      nameById.get(t.profile_id as string) ?? (t.profile_id as string),
    delta: t.delta as number,
    balance_after: t.balance_after as number,
    reason: (t.reason as string) ?? "",
    source: (t.source as string) ?? "",
    created_by: (t.created_by as string | null) ?? null,
    admin_name: t.created_by
      ? nameById.get(t.created_by as string) ?? (t.created_by as string)
      : "—",
    created_at: t.created_at as string,
  }));

  return (
    <div className="p-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Admin · Credits</h1>
          <p className="mt-1 text-sm text-[#B3B3B3]">
            Search artists and view current credit balance (read-only).
          </p>
        </div>

        <form
          className="flex items-center gap-2"
          action="/dashboard/admin/credits"
          method="get"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            className="h-10 w-[260px] rounded-lg bg-[#121216] px-3 text-sm text-white placeholder:text-[#6b6b6b] outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-[#00FFC6]/60"
          />
          <button
            type="submit"
            className="h-10 rounded-lg bg-[#00FFC6] px-4 text-sm font-semibold text-black hover:opacity-90"
          >
            Search
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-[#0E0E10]">
        <div className="grid grid-cols-[1.2fr_1.4fr_140px] gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold text-[#B3B3B3]">
          <div>ARTIST</div>
          <div>EMAIL</div>
          <div className="text-right">CREDITS</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[#B3B3B3]">
            No artists found.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {rows.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[1.2fr_1.4fr_140px] items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{r.display_name}</div>
                  <div className="truncate text-xs text-[#B3B3B3]">{r.id}</div>
                </div>

                <div className="min-w-0 truncate text-sm text-[#B3B3B3]">
                  {r.email || "—"}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <div className="text-right font-semibold tabular-nums">
                    {r.balance}
                  </div>

                  <form
                    action={adjustArtistCreditsAction}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="profile_id" value={r.id} />

                    <input
                      name="delta"
                      inputMode="numeric"
                      placeholder="+50 / -20"
                      className="h-9 w-[90px] rounded-lg bg-[#121216] px-2 text-sm text-white placeholder:text-[#6b6b6b] outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-[#00FFC6]/60"
                      required
                    />

                    <input
                      name="reason"
                      placeholder="Reason…"
                      className="h-9 w-[160px] rounded-lg bg-[#121216] px-2 text-sm text-white placeholder:text-[#6b6b6b] outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-[#00FFC6]/60"
                      required
                    />

                    <button
                      type="submit"
                      className="h-9 rounded-lg bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15"
                      title="Apply credit change"
                    >
                      Apply
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-[#0E0E10]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Latest credit transactions</div>
            <div className="text-xs text-[#B3B3B3]">
              Most recent 20 changes (append-only audit log).
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1.2fr_120px_140px_1.6fr_1.1fr_180px] gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold text-[#B3B3B3]">
          <div>ARTIST</div>
          <div className="text-right">DELTA</div>
          <div className="text-right">BALANCE</div>
          <div>REASON</div>
          <div>SOURCE</div>
          <div>ADMIN · DATE</div>
        </div>

        {latestTx.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[#B3B3B3]">
            No transactions yet.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {latestTx.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[1.2fr_120px_140px_1.6fr_1.1fr_180px] items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{t.artist_name}</div>
                  <div className="truncate text-xs text-[#B3B3B3]">
                    {t.profile_id}
                  </div>
                </div>

                <div className="text-right font-semibold tabular-nums">
                  {t.delta > 0 ? `+${t.delta}` : t.delta}
                </div>

                <div className="text-right font-semibold tabular-nums">
                  {t.balance_after}
                </div>

                <div className="min-w-0 truncate text-sm text-[#B3B3B3]">
                  {t.reason || "—"}
                </div>

                <div className="truncate text-sm text-[#B3B3B3]">
                  {t.source || "—"}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm">{t.admin_name}</div>
                  <div className="truncate text-xs text-[#B3B3B3]">
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

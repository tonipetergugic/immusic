import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ArtistDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: credits, error: creditsError } = await supabase
    .from("artist_credits")
    .select("balance")
    .eq("profile_id", user.id)
    .single();

  if (creditsError && creditsError.code !== "PGRST116") {
    throw creditsError;
  }

  const balance = credits?.balance ?? 0;

  const { data: transactions, error: txError } = await supabase
    .from("artist_credit_transactions")
    .select("id, delta, balance_after, reason, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (txError) {
    throw txError;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">
        Artist Dashboard
      </h1>

      <div className="rounded-xl bg-[#121216] border border-white/5 p-6">
        <p className="text-sm text-[#B3B3B3]">Available Credits</p>
        <p className="mt-2 text-4xl font-bold text-[#00FFC6]">
          {balance}
        </p>
      </div>

      <div className="rounded-xl bg-[#121216] border border-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Recent Credit Activity
        </h2>

        {transactions.length === 0 ? (
          <p className="text-sm text-[#B3B3B3]">
            No credit transactions yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <p className="text-white">
                    {tx.delta > 0 ? `+${tx.delta}` : tx.delta} Credits
                  </p>
                  <p className="text-xs text-[#B3B3B3]">
                    {tx.reason ?? "—"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[#B3B3B3]">
                    Balance: {tx.balance_after}
                  </p>
                  <p className="text-xs text-[#B3B3B3]">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

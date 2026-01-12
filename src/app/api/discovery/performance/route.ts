import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam ?? "30"), 1), 100);

    // --- Boost Cooldown (DB-agnostisch, deterministisch) ---
    function fnv1a(str: string) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }

    function dayOfYear(d: Date) {
      const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const diff = d.getTime() - start.getTime();
      return Math.floor(diff / 86400000) + 1;
    }

    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const currentBucket = dayOfYear(now) % 7; // weekly rotation

    const supabase = await createSupabaseServerClient();

    const baseCount = Math.floor(limit * 0.8);
    const boostCount = limit - baseCount;

    // 1) Base ranking (score_v1)
    const { data: baseItems, error: baseError } = await supabase
      .from("performance_discovery_candidates")
      .select("*")
      .order("score_v1", { ascending: false })
      .order("exposure_completed_at", { ascending: true })
      .order("track_id", { ascending: true })
      .limit(baseCount);

    if (baseError) {
      return NextResponse.json(
        { ok: false, error: baseError.message, items: [] },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const usedIds = new Set((baseItems ?? []).map((i) => i.track_id));

    // 2) Boost pool
    const { data: boostItems, error: boostError } = await supabase
      .from("performance_discovery_boost_pool")
      .select("*")
      .order("boost_priority", { ascending: false })
      .limit(limit * 2); // overfetch to avoid duplicates

    if (boostError) {
      return NextResponse.json(
        { ok: false, error: boostError.message, items: [] },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const finalBoostItems = (boostItems ?? [])
      .filter((i) => !usedIds.has(i.track_id))
      // weekly cooldown: only 1/7 of tracks eligible per day (deterministic)
      .filter((i) => (fnv1a(`${i.track_id}:${dayKey}`) % 7) === currentBucket)
      .slice(0, boostCount);

    const baseWithSource = (baseItems ?? []).map((i: any) => ({
      ...i,
      source: "base" as const,
    }));

    const boostWithSource = (finalBoostItems ?? []).map((i: any) => ({
      ...i,
      source: "boost" as const,
      // boost_factor is present only because this comes from performance_discovery_boost_pool
      boost_factor: i.boost_factor ?? null,
    }));

    const items = [...baseWithSource, ...boostWithSource];

    return NextResponse.json(
      {
        ok: true,
        contract_version: "v1",
        mode: "performance",
        slotting: {
          baseCount,
          boostCount,
        },
        items,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json(
      { ok: false, error: msg, items: [] },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

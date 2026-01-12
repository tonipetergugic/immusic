// src/app/api/discovery/performance/debug-feed/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const trackId = url.searchParams.get("track_id");

    const limitRaw = url.searchParams.get("limit");
    const limitParsed = limitRaw ? Number(limitRaw) : 30;
    const limit = Number.isFinite(limitParsed)
      ? Math.min(Math.max(limitParsed, 1), 100)
      : 30;

    if (!trackId) {
      return NextResponse.json(
        { ok: false, error: "Missing track_id", data: null },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const baseCount = Math.floor(limit * 0.8);
    const boostCount = limit - baseCount;

    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10); // UTC day
    const currentBucket = dayOfYear(now) % 7;

    const supabase = await createSupabaseServerClient();

    // 1) Base pull (exactly like feed)
    const { data: baseItems, error: baseError } = await supabase
      .from("performance_discovery_candidates")
      .select("track_id")
      .order("score_v1", { ascending: false })
      .order("exposure_completed_at", { ascending: true })
      .order("track_id", { ascending: true })
      .limit(baseCount);

    if (baseError) {
      return NextResponse.json(
        { ok: false, error: baseError.message, data: null },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const baseIds = new Set((baseItems ?? []).map((i) => i.track_id));
    const inBase = baseIds.has(trackId);

    // 2) Boost pool pull (overfetch, exactly like feed)
    const { data: boostItems, error: boostError } = await supabase
      .from("performance_discovery_boost_pool")
      .select("track_id")
      .order("boost_priority", { ascending: false })
      .limit(limit * 2);

    if (boostError) {
      return NextResponse.json(
        { ok: false, error: boostError.message, data: null },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const trackBucket = fnv1a(`${trackId}:${dayKey}`) % 7;
    const eligibleToday = trackBucket === currentBucket;

    // Compute final boost list the same way as feed
    const filteredBoost = (boostItems ?? [])
      .filter((i) => !baseIds.has(i.track_id))
      .filter((i) => (fnv1a(`${i.track_id}:${dayKey}`) % 7) === currentBucket);

    const finalBoostIds = new Set(
      filteredBoost.slice(0, boostCount).map((i) => i.track_id)
    );

    const inBoost = finalBoostIds.has(trackId);

    // Reasons (deterministic)
    let reason = "";
    if (inBase) {
      reason = "Included via BASE (top 80% by score_v1 ordering).";
    } else if (inBoost) {
      reason = "Included via BOOST slot (20% pool).";
    } else {
      // Not included -> explain why
      const inBoostPool = (boostItems ?? []).some((i) => i.track_id === trackId);

      if (!inBoostPool) {
        reason =
          "Not included: track not present in performance_discovery_boost_pool (not performance-eligible or no boost data).";
      } else if (!eligibleToday) {
        reason = "Not included: BOOST cooldown rotation (bucket mismatch today).";
      } else if (baseIds.has(trackId)) {
        reason = "Not included in BOOST: already included in BASE (dedup).";
      } else {
        reason =
          "Not included: eligible today, but missed BOOST slots due to limit/priority (top boostCount after filtering).";
      }
    }

    return NextResponse.json(
      {
        ok: true,
        contract_version: "v1",
        mode: "performance",
        slotting: {
          baseCount,
          boostCount,
        },
        data: {
          track_id: trackId,
          limit,
          dayKey,
          currentBucket,
          trackBucket,
          eligibleToday,
          inBase,
          inBoost,
          reason,
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json(
      { ok: false, error: msg, data: null },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

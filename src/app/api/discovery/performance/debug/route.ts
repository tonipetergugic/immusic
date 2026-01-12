// src/app/api/discovery/performance/debug/route.ts
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

    if (!trackId) {
      return NextResponse.json(
        { ok: false, error: "Missing track_id", data: null },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10); // UTC day
    const currentBucket = dayOfYear(now) % 7;

    const supabase = await createSupabaseServerClient();

    // Pull candidate + boost info (if exists)
    const { data, error } = await supabase
      .from("performance_discovery_boost_pool")
      .select(
        [
          "track_id",
          "track_title",
          "artist_id",
          "score_v1",
          "premium_balance",
          "earned_balance",
          "boost_factor",
          "boost_priority",
          "rating_count",
          "rating_avg",
          "listeners_30d",
          "streams_30d",
          "listened_minutes_30d",
          "exposure_status",
          "exposure_completed_at",
        ].join(",")
      )
      .eq("track_id", trackId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, data: null },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: true,
          data: {
            track_id: trackId,
            exists_in_boost_pool: false,
            reason:
              "Track is not in performance_discovery_boost_pool (not performance-eligible or view gates not met).",
          },
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const trackBucket = fnv1a(`${trackId}:${dayKey}`) % 7;
    const eligibleToday = trackBucket === currentBucket;

    const reason = eligibleToday
      ? "Eligible today (bucket match)."
      : "Not eligible today (bucket mismatch).";

    return NextResponse.json(
      {
        ok: true,
        data: {
          row: data ?? null,
          dayKey,
          currentBucket,
          trackBucket,
          eligibleToday,
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
